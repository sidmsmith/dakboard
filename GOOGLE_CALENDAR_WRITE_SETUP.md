# Google Calendar write (create events) — setup

ICS **read** is unchanged. This adds **create** via Google Calendar API using one household Google account.

## How family devices work

- **You** connect Google **once** (any computer).
- Refresh token lives in **Vercel env** (server-side).
- Kids' iPads / spouse phones open dakboard normally and tap **+**.
- They **never** sign into Google.
- You do **not** add their emails as Cloud Console test users.

It is **not** “auth once per device.” It is “auth once for the household server token.”

## Vercel environment variables

### Option A (simplest): paste the whole OAuth client JSON
| Name | Value |
|------|--------|
| `GOOGLE_CALENDAR_OAUTH_JSON` | Full contents of `client_secret_….json` (the `{"web":{...}}` file) |
| `GOOGLE_CALENDAR_REFRESH_TOKEN` | filled after one-time auth (below) |

When `GOOGLE_CALENDAR_OAUTH_JSON` is set, it supplies client id, secret, and redirect URI (prefers the `/api/google-calendar-auth` entry in `redirect_uris`).

### Option B: separate fields (used only if OAUTH_JSON is empty)
| Name | Value |
|------|--------|
| `GOOGLE_CALENDAR_CLIENT_ID` | from your OAuth client JSON |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | from your OAuth client JSON |
| `GOOGLE_CALENDAR_REDIRECT_URI` | `https://dakboard-smith.vercel.app/api/google-calendar-auth` |
| `GOOGLE_CALENDAR_REFRESH_TOKEN` | filled after one-time auth (below) |

Keep existing:

- `GOOGLE_CALENDAR_ICS_URLS` (read path)

Optional per calendar in the ICS JSON:

```json
"googleCalendarId": "smithfamilycalendar77@gmail.com"
```

If omitted, dakboard derives it from the ICS URL email (works for your current feeds).

## One-time auth

1. Confirm OAuth client redirect URI includes exactly:  
   `https://dakboard-smith.vercel.app/api/google-calendar-auth`
2. Redeploy after setting `GOOGLE_CALENDAR_OAUTH_JSON` (or Client ID + Secret).
3. While signed into the household Google account (`sidmsmith@...`), open:  
   `https://dakboard-smith.vercel.app/api/google-calendar-auth`
4. Allow Calendar access.
5. Copy the shown **refresh token** into Vercel as `GOOGLE_CALENDAR_REFRESH_TOKEN`.
6. Redeploy again.

App can stay in **Testing**; only the household account needs to be a test user.

## Using it

On **Agenda Direct**, **Calendar Direct**, **Agenda Hybrid**, or **Calendar Hybrid**, tap **+** → New Event modal → Create.  
Advanced tab: default calendar + show/hide the + button.

**Hybrid widgets** show Google ICS events and Home Assistant calendars together. The create dropdown lists **Google calendars only** (HA calendars are read-only here).

HA Agenda / Calendar and the Direct-only widgets remain available but are marked **deprecated** in the widget panel; prefer Hybrid going forward.

## Security note

Anyone who can reach your dakboard URL can hit the create API. Rely on your existing device/auth restrictions and keep the URL private to the household.
