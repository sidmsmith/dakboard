# Dakboard Implementation Plan

## Overview
A smart home dashboard for fixed displays (tablets/TVs) that integrates with Home Assistant, Google Calendar, Office365, and displays weather, todos, and home automation controls.

## Project Structure
```
dakboard/
├── api/                          # Vercel serverless functions
│   ├── ha-webhook.js            # Handle HA webhook calls (garage doors, alarm)
│   ├── ha-fetch.js              # Fetch HA data (weather, todos, devices)
│   ├── calendar-google.js       # Google Calendar API proxy
│   └── calendar-office365.js    # Office365 Calendar API proxy
├── layouts/                      # Different layout options
│   ├── layout-1-grid.html       # Traditional 2-column grid
│   ├── layout-2-single-column.html  # Single column stacked
│   ├── layout-3-split-screen.html   # Split screen (calendar top, widgets bottom)
│   └── layout-4-cards.html     # Flexible card-based layout
├── index.html                   # Main dashboard (will use selected layout)
├── app.js                       # Main JavaScript logic
├── styles.css                   # Main stylesheet
├── vercel.json                  # Vercel configuration
├── package.json                 # Dependencies
├── README.md                    # Setup and usage guide
└── IMPLEMENTATION_PLAN.md       # This file
```

## Implementation Phases

### Phase 1: Basic Structure & Layout Selection ✅
- [x] Create project structure
- [x] Create multiple layout mockups (no data)
- [x] User selects preferred layout
- [x] Set up Vercel configuration

### Phase 2: Home Assistant Integration
- [ ] Set up HA API connectivity
- [ ] Create `/api/ha-fetch.js` serverless function
- [ ] Fetch Pirate Weather data from HA
- [ ] Fetch HA todo list
- [ ] Fetch garage door states (3 doors)
- [ ] Fetch alarm panel status
- [ ] Create `/api/ha-webhook.js` for triggering actions
- [ ] Implement garage door click handlers
- [ ] Implement alarm panel toggle

### Phase 3: Calendar Integration
- [ ] Set up Google Calendar API
  - [ ] Create OAuth credentials
  - [ ] Create `/api/calendar-google.js` serverless function
  - [ ] Fetch current week events
  - [ ] Fetch next week events (for arrow navigation)
  - [ ] Fetch full month events (for modal)
- [ ] Set up Office365 Calendar API
  - [ ] Create Azure AD app registration
  - [ ] Create `/api/calendar-office365.js` serverless function
  - [ ] Fetch current week events
  - [ ] Fetch next week events
  - [ ] Fetch full month events
- [ ] Implement weekly calendar view
- [ ] Implement next week arrow navigation
- [ ] Implement monthly modal view
- [ ] Merge events from multiple calendars

### Phase 4: UI Components
- [ ] Calendar widget
  - [ ] Weekly view (7 days)
  - [ ] Next week arrow button
  - [ ] Monthly modal button
  - [ ] Event display with time
  - [ ] Color coding by calendar source
- [ ] Weather widget
  - [ ] Current conditions (from Pirate Weather via HA)
  - [ ] Temperature display
  - [ ] Weather icon
  - [ ] Forecast (if available)
- [ ] Todo list widget
  - [ ] Display HA todo list items
  - [ ] Add new todo (if needed)
  - [ ] Mark complete (if needed)
- [ ] Garage doors widget
  - [ ] 3 door status indicators (open/closed)
  - [ ] Visual indicators (icons/colors)
  - [ ] Click handlers to trigger HA webhooks
- [ ] Alarm panel widget
  - [ ] Current status display
  - [ ] Toggle button
  - [ ] Visual status indicator

### Phase 5: Display Optimization
- [ ] Fullscreen/kiosk mode support
- [ ] Auto-refresh functionality (30-60 second intervals)
- [ ] Responsive design for tablets/TVs
- [ ] Large, readable fonts
- [ ] High contrast mode
- [ ] Dark/light theme toggle
- [ ] Prevent screen sleep (if possible via browser)

### Phase 6: Polish & Testing
- [ ] Error handling and fallbacks
- [ ] Loading states
- [ ] Error messages
- [ ] Testing on actual tablet/TV
- [ ] Performance optimization
- [ ] Documentation

## Environment Variables (Vercel)

### Required
- `HA_URL` - Home Assistant URL (e.g., `https://your-ha.duckdns.org`)
- `HA_TOKEN` - Home Assistant long-lived access token

### Google Calendar (Optional)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REFRESH_TOKEN` - Google OAuth refresh token

### Office365 Calendar (Optional)
- `OFFICE365_CLIENT_ID` - Azure AD application ID
- `OFFICE365_CLIENT_SECRET` - Azure AD client secret
- `OFFICE365_TENANT_ID` - Azure AD tenant ID

### Home Assistant Entity IDs (Configuration)
These will be set in the dashboard configuration or environment variables:
- `HA_WEATHER_ENTITY` - Pirate Weather entity ID (e.g., `weather.pirate_weather`)
- `HA_TODO_ENTITY` - Todo list entity ID (e.g., `input_text.todo_list`)
- `HA_GARAGE_DOOR_1` - First garage door entity ID
- `HA_GARAGE_DOOR_2` - Second garage door entity ID
- `HA_GARAGE_DOOR_3` - Third garage door entity ID
- `HA_ALARM_ENTITY` - Alarm panel entity ID
- `HA_GARAGE_WEBHOOK_1` - Webhook ID for garage door 1
- `HA_GARAGE_WEBHOOK_2` - Webhook ID for garage door 2
- `HA_GARAGE_WEBHOOK_3` - Webhook ID for garage door 3
- `HA_ALARM_WEBHOOK` - Webhook ID for alarm toggle

## API Endpoints

### Home Assistant
- `GET /api/ha-fetch?entity={entity_id}` - Fetch HA entity state
- `POST /api/ha-webhook?webhook_id={id}` - Trigger HA webhook

### Calendar
- `GET /api/calendar-google?start={date}&end={date}` - Fetch Google Calendar events
- `GET /api/calendar-office365?start={date}&end={date}` - Fetch Office365 events

## Data Flow

```
Dashboard (Browser)
    ↓
Vercel Serverless Functions (/api/*)
    ↓
External APIs (HA, Google, Office365)
    ↓
Data returned to dashboard
    ↓
UI updates every 30-60 seconds
```

## Next Steps

1. **Review layout options** in `/layouts/` folder
2. **Select preferred layout** (or request modifications)
3. **Set up Home Assistant**:
   - Create long-lived access token
   - Identify entity IDs for weather, todos, garage doors, alarm
   - Set up webhooks for garage doors and alarm
4. **Set up calendar APIs** (if using):
   - Google Calendar OAuth setup
   - Office365 Azure AD app registration
5. **Begin Phase 2 implementation** (HA integration)

## Notes

- All API calls go through Vercel serverless functions to keep tokens secure
- Dashboard auto-refreshes every 30-60 seconds
- Designed for landscape tablet/TV displays
- Responsive design for different screen sizes
- Error handling with fallback displays




