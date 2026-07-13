// Create Google Calendar events using the household refresh token (server-side).
// ICS remains the read path; this is write-only.

import {
  getAccessTokenFromRefreshToken,
  getGoogleCalendarOAuthConfig,
  parseGoogleCalendarConfigs
} from './lib/google-calendar-oauth.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

export default async function (req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { clientId, clientSecret, refreshToken } = getGoogleCalendarOAuthConfig();
    const calendars = parseGoogleCalendarConfigs().map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      googleCalendarId: c.googleCalendarId
    }));
    return res.status(200).json({
      configured: !!(clientId && clientSecret && refreshToken),
      calendars,
      authUrl: '/api/google-calendar-auth'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = readJsonBody(req);
    const title = String(body.title || body.summary || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const configs = parseGoogleCalendarConfigs();
    let googleCalendarId = body.googleCalendarId || body.calendarId || null;

    // Allow dakboard internal id (from ICS config) as well
    if (!googleCalendarId && body.calendar) {
      const match = configs.find(c => c.id === body.calendar);
      googleCalendarId = match?.googleCalendarId || null;
    }

    if (!googleCalendarId && configs.length === 1) {
      googleCalendarId = configs[0].googleCalendarId;
    }

    if (!googleCalendarId) {
      return res.status(400).json({
        error: 'calendar / googleCalendarId is required',
        calendars: configs.map(c => ({
          id: c.id,
          name: c.name,
          googleCalendarId: c.googleCalendarId
        }))
      });
    }

    const timeZone = body.timeZone || 'America/New_York';
    const allDay = !!body.allDay;
    const event = {
      summary: title,
      location: body.location || undefined,
      description: body.description || undefined
    };

    if (allDay) {
      const startDate = String(body.startDate || body.start || '').slice(0, 10);
      let endDate = String(body.endDate || body.end || startDate).slice(0, 10);
      if (!startDate) {
        return res.status(400).json({ error: 'startDate is required for all-day events' });
      }
      // Google all-day end is exclusive — bump one day if same day
      if (endDate <= startDate) {
        const d = new Date(`${startDate}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        endDate = d.toISOString().slice(0, 10);
      }
      event.start = { date: startDate };
      event.end = { date: endDate };
    } else {
      const start = body.start || body.startDateTime;
      const end = body.end || body.endDateTime;
      if (!start || !end) {
        return res.status(400).json({ error: 'start and end are required for timed events' });
      }
      event.start = { dateTime: new Date(start).toISOString(), timeZone };
      event.end = { dateTime: new Date(end).toISOString(), timeZone };
    }

    const accessToken = await getAccessTokenFromRefreshToken();
    const encodedId = encodeURIComponent(googleCalendarId);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to create Google Calendar event',
        message: data?.error?.message || data?.error_description || response.statusText,
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      event: {
        id: data.id,
        title: data.summary,
        start: data.start?.dateTime || data.start?.date,
        end: data.end?.dateTime || data.end?.date,
        htmlLink: data.htmlLink,
        calendarId: googleCalendarId
      }
    });
  } catch (error) {
    console.error('google-calendar-create error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
