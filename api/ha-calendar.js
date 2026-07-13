// Vercel serverless function to fetch calendar events from Home Assistant
// Uses HA's calendar.get_events service
// Enriches events with entity registry name + calendar color

const DEFAULT_CALENDAR_COLOR = '#4a90e2';

function fallbackCalendarName(entityId) {
  return String(entityId || '')
    .replace(/^calendar\./, '')
    .replace(/_/g, ' ');
}

async function buildCalendarMeta(haUrl, haToken, calendarEntities, allStates) {
  const meta = {};

  calendarEntities.forEach(entityId => {
    meta[entityId] = {
      name: fallbackCalendarName(entityId),
      color: DEFAULT_CALENDAR_COLOR
    };
  });

  if (Array.isArray(allStates)) {
    allStates.forEach(state => {
      if (!state?.entity_id?.startsWith('calendar.')) return;
      if (!meta[state.entity_id]) return;
      if (state.attributes?.friendly_name) {
        meta[state.entity_id].name = state.attributes.friendly_name;
      }
    });
  }

  try {
    const registryResponse = await fetch(`${haUrl}/api/config/entity_registry/list`, {
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (registryResponse.ok) {
      const registry = await registryResponse.json();
      const entries = Array.isArray(registry) ? registry : (registry.entities || []);
      entries.forEach(entry => {
        if (!entry?.entity_id?.startsWith('calendar.')) return;
        if (!meta[entry.entity_id] && !calendarEntities.includes(entry.entity_id)) return;

        if (!meta[entry.entity_id]) {
          meta[entry.entity_id] = {
            name: fallbackCalendarName(entry.entity_id),
            color: DEFAULT_CALENDAR_COLOR
          };
        }

        // Prefer user-edited registry name, then original_name, then existing friendly_name
        meta[entry.entity_id].name =
          entry.name ||
          entry.original_name ||
          meta[entry.entity_id].name;

        const registryColor = entry.options?.calendar?.color;
        if (registryColor) {
          meta[entry.entity_id].color = registryColor;
        }
      });
    } else {
      console.error('Failed to fetch entity registry:', registryResponse.status);
    }
  } catch (error) {
    console.error('Error fetching entity registry for calendar meta:', error);
  }

  return meta;
}

export default async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { entityId, startDate, endDate } = req.query;

  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }

  try {
    // If entityId is provided, fetch events for that specific calendar
    // Otherwise, fetch all calendar entities and get events from all
    let calendarEntities = [];
    let allStates = null;

    if (entityId) {
      calendarEntities = [entityId];
    } else {
      // Fetch all calendar entities
      const statesResponse = await fetch(`${haUrl}/api/states`, {
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!statesResponse.ok) {
        throw new Error(`Failed to fetch HA states: ${statesResponse.status}`);
      }

      allStates = await statesResponse.json();
      calendarEntities = allStates
        .filter(state => state.entity_id.startsWith('calendar.'))
        .map(state => state.entity_id);
    }

    if (calendarEntities.length === 0) {
      return res.status(200).json({
        events: [],
        calendars: [],
        message: 'No calendar entities found in Home Assistant'
      });
    }

    // When a single entityId was requested, still fetch states for friendly_name
    if (!allStates) {
      try {
        const statesResponse = await fetch(`${haUrl}/api/states`, {
          headers: {
            'Authorization': `Bearer ${haToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (statesResponse.ok) {
          allStates = await statesResponse.json();
        }
      } catch (e) {
        console.error('Error fetching states for calendar meta:', e);
      }
    }

    const calendarMeta = await buildCalendarMeta(haUrl, haToken, calendarEntities, allStates);

    // Calculate date range (default to current week)
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - now.getDay()));
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    // Fetch events from all calendars
    const allEvents = [];

    for (const calEntityId of calendarEntities) {
      try {
        // Use calendar.get_events service
        // Try with ?return_response=true to get the response data
        const serviceResponse = await fetch(`${haUrl}/api/services/calendar/get_events?return_response=true`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${haToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entity_id: calEntityId,
            start_date_time: start.toISOString(),
            end_date_time: end.toISOString()
          })
        });

        if (!serviceResponse.ok) {
          const errorText = await serviceResponse.text();
          console.error(`Failed to fetch events for ${calEntityId}:`, serviceResponse.status);
          console.error(`Error details:`, errorText);
          console.error(`Request was:`, JSON.stringify({
            entity_id: calEntityId,
            start_date_time: start.toISOString(),
            end_date_time: end.toISOString()
          }, null, 2));
          continue;
        }

        const serviceData = await serviceResponse.json();

        // Response structure with ?return_response=true:
        // { "service_response": { "calendar.entity_id": { "events": [...] } } }
        // OR direct structure: { "calendar.entity_id": { "events": [...] } }
        let events = [];

        if (serviceData.service_response && serviceData.service_response[calEntityId]) {
          const calendarData = serviceData.service_response[calEntityId];
          if (calendarData.events && Array.isArray(calendarData.events)) {
            events = calendarData.events;
          } else if (Array.isArray(calendarData)) {
            events = calendarData;
          }
        } else if (serviceData[calEntityId]) {
          const calendarData = serviceData[calEntityId];
          if (calendarData.events && Array.isArray(calendarData.events)) {
            events = calendarData.events;
          } else if (Array.isArray(calendarData)) {
            events = calendarData;
          }
        } else if (Array.isArray(serviceData)) {
          events = serviceData;
        } else if (serviceData.events && Array.isArray(serviceData.events)) {
          events = serviceData.events;
        }

        if (Array.isArray(events)) {
          const meta = calendarMeta[calEntityId] || {
            name: fallbackCalendarName(calEntityId),
            color: DEFAULT_CALENDAR_COLOR
          };
          events.forEach(event => {
            event.calendar = calEntityId;
            event.calendarName = meta.name;
            event.color = meta.color;
            allEvents.push(event);
          });
        } else {
          console.error(`Events is not an array for ${calEntityId}:`, typeof events, events);
        }
      } catch (error) {
        console.error(`Error fetching events for ${calEntityId}:`, error);
        // Continue with other calendars
      }
    }

    // Sort events by start time
    allEvents.sort((a, b) => {
      const startA = new Date(a.start || a.start_time || a.dtstart);
      const startB = new Date(b.start || b.start_time || b.dtstart);
      return startA - startB;
    });

    // Format events for easier consumption
    const formattedEvents = allEvents.map(event => {
      const startTime = event.start || event.start_time || event.dtstart;
      const endTime = event.end || event.end_time || event.dtend;
      const summary = event.summary || event.title || event.name || 'Untitled Event';
      const location = event.location || null;
      const description = event.description || null;
      const meta = calendarMeta[event.calendar] || {};

      return {
        id: event.uid || event.id || `${event.calendar}-${startTime}`,
        title: summary,
        start: startTime,
        end: endTime,
        location: location,
        description: description,
        calendar: event.calendar,
        calendarName: event.calendarName || meta.name || fallbackCalendarName(event.calendar),
        color: event.color || meta.color || DEFAULT_CALENDAR_COLOR,
        allDay: event.all_day || false
      };
    });

    return res.status(200).json({
      success: true,
      events: formattedEvents,
      calendars: calendarEntities.map(id => ({
        id,
        name: calendarMeta[id]?.name || fallbackCalendarName(id),
        color: calendarMeta[id]?.color || DEFAULT_CALENDAR_COLOR
      })),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      count: formattedEvents.length
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
