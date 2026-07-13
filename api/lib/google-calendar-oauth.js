// Shared Google Calendar OAuth helpers (server-side only)

const DEFAULT_COLOR = '#0f9d58';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function getGoogleCalendarOAuthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    'https://dakboard-smith.vercel.app/api/google-calendar-auth';
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || '';
  return { clientId, clientSecret, redirectUri, refreshToken };
}

export function extractGoogleCalendarIdFromIcsUrl(url) {
  try {
    const match = String(url || '').match(/\/calendar\/ical\/([^/]+)\//i);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch (e) {
    return null;
  }
}

export function parseGoogleCalendarConfigs() {
  const configs = [];
  const multi = process.env.GOOGLE_CALENDAR_ICS_URLS;

  if (multi) {
    try {
      const parsed = JSON.parse(multi);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry, index) => {
          if (!entry?.url) return;
          const url = String(entry.url).trim();
          const googleCalendarId =
            entry.googleCalendarId ||
            entry.calendarId ||
            extractGoogleCalendarIdFromIcsUrl(url) ||
            null;
          configs.push({
            id: entry.id || `google-cal-${index + 1}`,
            name: entry.name || entry.id || `Google Calendar ${index + 1}`,
            url,
            color: entry.color || DEFAULT_COLOR,
            googleCalendarId
          });
        });
      }
    } catch (e) {
      console.error('Invalid GOOGLE_CALENDAR_ICS_URLS JSON');
    }
  }

  const singleUrl = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (singleUrl && configs.length === 0) {
    const url = String(singleUrl).trim();
    configs.push({
      id: process.env.GOOGLE_CALENDAR_ICS_ID || 'google.smithfamily',
      name: process.env.GOOGLE_CALENDAR_ICS_NAME || 'Smith Family Calendar',
      url,
      color: process.env.GOOGLE_CALENDAR_ICS_COLOR || DEFAULT_COLOR,
      googleCalendarId:
        process.env.GOOGLE_CALENDAR_API_ID ||
        extractGoogleCalendarIdFromIcsUrl(url) ||
        null
    });
  }

  return configs;
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getGoogleCalendarOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET not set');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }
  return data;
}

export async function getAccessTokenFromRefreshToken() {
  const { clientId, clientSecret, refreshToken } = getGoogleCalendarOAuthConfig();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, or GOOGLE_CALENDAR_REFRESH_TOKEN'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh access token');
  }
  return data.access_token;
}

export function buildGoogleAuthUrl(state = 'dakboard') {
  const { clientId, redirectUri } = getGoogleCalendarOAuthConfig();
  if (!clientId) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID not set');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DEFAULT_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
