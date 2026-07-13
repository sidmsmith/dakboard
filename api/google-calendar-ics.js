// Vercel serverless: fetch Google Calendar secret/public ICS feed(s) and return events
// Secrets stay server-side via GOOGLE_CALENDAR_ICS_URL / GOOGLE_CALENDAR_ICS_URLS

import ical from 'node-ical';
import rrulePkg from 'rrule';
const { RRule } = rrulePkg;

const DEFAULT_COLOR = '#0f9d58';

function parseCalendarConfigs() {
  const configs = [];

  // Multi-calendar JSON: [{"id","name","url","color"}]
  const multi = process.env.GOOGLE_CALENDAR_ICS_URLS;
  if (multi) {
    try {
      const parsed = JSON.parse(multi);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry, index) => {
          if (!entry?.url) return;
          configs.push({
            id: entry.id || `google-cal-${index + 1}`,
            name: entry.name || entry.id || `Google Calendar ${index + 1}`,
            url: String(entry.url).trim(),
            color: entry.color || DEFAULT_COLOR
          });
        });
      }
    } catch (e) {
      console.error('Invalid GOOGLE_CALENDAR_ICS_URLS JSON');
    }
  }

  // Single-calendar convenience vars
  const singleUrl = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (singleUrl && configs.length === 0) {
    configs.push({
      id: process.env.GOOGLE_CALENDAR_ICS_ID || 'google.smithfamily',
      name: process.env.GOOGLE_CALENDAR_ICS_NAME || 'Smith Family Calendar',
      url: String(singleUrl).trim(),
      color: process.env.GOOGLE_CALENDAR_ICS_COLOR || DEFAULT_COLOR
    });
  }

  return configs;
}

function toIso(date) {
  if (!date) return null;
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isAllDayEvent(event) {
  if (event.datetype === 'date') return true;
  // node-ical marks floating all-day as date-only start
  if (event.start && !(event.start instanceof Date)) return false;
  if (event.start instanceof Date && event.end instanceof Date) {
    const start = event.start;
    const end = event.end;
    const durationMs = end - start;
    const startIsMidnight =
      start.getUTCHours() === 0 &&
      start.getUTCMinutes() === 0 &&
      start.getUTCSeconds() === 0;
    // Typical all-day: midnight to next midnight (or multi-day midnight boundaries)
    if (startIsMidnight && durationMs >= 24 * 60 * 60 * 1000 && durationMs % (24 * 60 * 60 * 1000) === 0) {
      return true;
    }
  }
  return false;
}

function expandRecurring(event, rangeStart, rangeEnd) {
  if (!event.rrule) return [];

  try {
    const rule = event.rrule;
    let dates = [];

    // node-ical attaches its own rrule instance (often a different package copy than ours),
    // so prefer calling .between() directly instead of reconstructing via instanceof/options.
    if (typeof rule.between === 'function') {
      dates = rule.between(rangeStart, rangeEnd, true);
    } else {
      let reconstructed = null;
      const raw =
        (typeof rule.toString === 'function' && String(rule.toString())) ||
        (event.rruleString ? String(event.rruleString) : '') ||
        '';
      const cleaned = raw.replace(/^RRULE:/i, '').trim();
      if (cleaned) {
        // Include DTSTART so recurrence anchors correctly
        const dtstart = event.start instanceof Date ? event.start : new Date(event.start);
        if (!Number.isNaN(dtstart.getTime())) {
          reconstructed = RRule.fromString(
            `DTSTART:${formatIcalUtc(dtstart)}\nRRULE:${cleaned}`
          );
        } else {
          reconstructed = RRule.fromString(cleaned);
        }
      }
      if (reconstructed && typeof reconstructed.between === 'function') {
        dates = reconstructed.between(rangeStart, rangeEnd, true);
      }
    }

    if (!Array.isArray(dates) || dates.length === 0) return [];

    const durationMs =
      event.end instanceof Date && event.start instanceof Date
        ? event.end.getTime() - event.start.getTime()
        : 60 * 60 * 1000;

    const exdates = new Set();
    if (event.exdate) {
      Object.values(event.exdate).forEach(d => {
        const dt = d instanceof Date ? d : new Date(d);
        if (!Number.isNaN(dt.getTime())) exdates.add(dt.toISOString().slice(0, 10));
      });
    }

    return dates
      .filter(d => d instanceof Date && !Number.isNaN(d.getTime()))
      .filter(d => !exdates.has(d.toISOString().slice(0, 10)))
      .map(occurrenceStart => ({
        start: occurrenceStart,
        end: new Date(occurrenceStart.getTime() + durationMs)
      }));
  } catch (e) {
    console.error('Error expanding RRULE for event', event.uid || event.summary, e.message);
    return [];
  }
}

function formatIcalUtc(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function eventOverlapsRange(start, end, rangeStart, rangeEnd) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end || start);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return s <= rangeEnd && e >= rangeStart;
}

async function fetchAndParseCalendar(config, rangeStart, rangeEnd) {
  const response = await fetch(config.url, {
    headers: {
      'User-Agent': 'dakboard-google-ics/1.0',
      Accept: 'text/calendar, text/plain, */*'
    }
  });

  if (!response.ok) {
    throw new Error(`ICS fetch failed (${response.status}) for ${config.id}`);
  }

  const text = await response.text();
  const parsed = ical.sync.parseICS(text);
  const events = [];
  const calName =
    Object.values(parsed).find(v => v?.type === 'VCALENDAR')?.['WR-CALNAME'] ||
    Object.values(parsed).find(v => v?.type === 'VCALENDAR')?.['X-WR-CALNAME'] ||
    config.name;

  Object.values(parsed).forEach(item => {
    if (!item || item.type !== 'VEVENT') return;

    // Skip orphaned recurrence exceptions handled via recurrence-id separately if needed
    const baseStart = item.start;
    const baseEnd = item.end || item.start;
    if (!baseStart) return;

    const occurrences = item.rrule
      ? expandRecurring(item, rangeStart, rangeEnd)
      : eventOverlapsRange(baseStart, baseEnd, rangeStart, rangeEnd)
        ? [{ start: baseStart, end: baseEnd }]
        : [];

    occurrences.forEach(occ => {
      if (!eventOverlapsRange(occ.start, occ.end, rangeStart, rangeEnd)) return;
      const allDay = isAllDayEvent({ ...item, start: occ.start, end: occ.end });
      events.push({
        id: `${item.uid || item.summary}-${toIso(occ.start)}`,
        title: item.summary || 'Untitled Event',
        start: toIso(occ.start),
        end: toIso(occ.end),
        location: item.location || null,
        description: typeof item.description === 'string' ? item.description : null,
        calendar: config.id,
        calendarName: config.name || calName,
        color: config.color || DEFAULT_COLOR,
        allDay
      });
    });
  });

  return {
    calendar: {
      id: config.id,
      name: config.name || calName,
      color: config.color || DEFAULT_COLOR
    },
    events
  };
}

export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const configs = parseCalendarConfigs();
  if (configs.length === 0) {
    return res.status(500).json({
      error: 'Google Calendar ICS not configured',
      message: 'Set GOOGLE_CALENDAR_ICS_URL (or GOOGLE_CALENDAR_ICS_URLS JSON) in Vercel env'
    });
  }

  const now = new Date();
  const start = req.query.startDate ? new Date(req.query.startDate) : new Date(now);
  if (!req.query.startDate) {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
  }
  const end = req.query.endDate ? new Date(req.query.endDate) : new Date(start);
  if (!req.query.endDate) {
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);
  }

  try {
    const results = await Promise.allSettled(
      configs.map(cfg => fetchAndParseCalendar(cfg, start, end))
    );

    const calendars = [];
    const allEvents = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        calendars.push(result.value.calendar);
        allEvents.push(...result.value.events);
      } else {
        errors.push({
          id: configs[index].id,
          message: result.reason?.message || 'Failed to load calendar'
        });
      }
    });

    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return res.status(200).json({
      success: true,
      source: 'google-ics',
      events: allEvents,
      calendars,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      count: allEvents.length,
      errors: errors.length ? errors : undefined
    });
  } catch (error) {
    console.error('Error loading Google ICS calendars:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
