// Shared Google Calendar OAuth helpers (server-side only)

const DEFAULT_COLOR = '#0f9d58';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const DEFAULT_REDIRECT_URI = 'https://dakboard-smith.vercel.app/api/google-calendar-auth';

/**
 * Optional full Google OAuth client JSON (the downloaded client_secret_*.json).
 * When set and valid, it overrides CLIENT_ID / CLIENT_SECRET / REDIRECT_URI.
 * When empty/invalid, those separate env vars are used instead.
 *
 * Env: GOOGLE_CALENDAR_OAUTH_JSON
 */
function parseOAuthClientJson() {
  const raw = process.env.GOOGLE_CALENDAR_OAUTH_JSON;
  if (!raw || !String(raw).trim()) return null;

  try {
    const parsed = JSON.parse(raw);
    const web = parsed.web || parsed.installed || parsed;
    const clientId = web.client_id || parsed.client_id || '';
    const clientSecret = web.client_secret || parsed.client_secret || '';
    if (!clientId || !clientSecret) return null;

    const redirectUris = Array.isArray(web.redirect_uris)
      ? web.redirect_uris.map(String)
      : Array.isArray(parsed.redirect_uris)
        ? parsed.redirect_uris.map(String)
        : [];

    const preferredRedirect =
      redirectUris.find(u => u.includes('/api/google-calendar-auth')) ||
      redirectUris.find(u => u.includes('dakboard-smith.vercel.app')) ||
      redirectUris[0] ||
      '';

    return {
      clientId: String(clientId).trim(),
      clientSecret: String(clientSecret).trim(),
      redirectUri: preferredRedirect ? String(preferredRedirect).trim() : ''
    };
  } catch (e) {
    console.error('Invalid GOOGLE_CALENDAR_OAUTH_JSON — falling back to separate env vars');
    return null;
  }
}

export function getGoogleCalendarOAuthConfig() {
  const fromJson = parseOAuthClientJson();

  const clientId =
    (fromJson && fromJson.clientId) ||
    process.env.GOOGLE_CALENDAR_CLIENT_ID ||
    '';
  const clientSecret =
    (fromJson && fromJson.clientSecret) ||
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
    '';
  const redirectUri =
    (fromJson && fromJson.redirectUri) ||
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    DEFAULT_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || '';

  return {
    clientId,
    clientSecret,
    redirectUri,
    refreshToken,
    source: fromJson ? 'oauth_json' : 'env_vars'
  };
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
    throw new Error(
      'Google OAuth client not configured. Set GOOGLE_CALENDAR_OAUTH_JSON (full client JSON) or GOOGLE_CALENDAR_CLIENT_ID + GOOGLE_CALENDAR_CLIENT_SECRET'
    );
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
      'Missing Google Calendar OAuth config. Set GOOGLE_CALENDAR_OAUTH_JSON (or CLIENT_ID/SECRET) and GOOGLE_CALENDAR_REFRESH_TOKEN'
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
    throw new Error(
      'GOOGLE_CALENDAR_OAUTH_JSON or GOOGLE_CALENDAR_CLIENT_ID not set'
    );
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
