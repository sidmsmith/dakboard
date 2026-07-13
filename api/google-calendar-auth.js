// One-time Google Calendar OAuth for household write access.
// Admin visits this once, copies refresh token into Vercel env.
// Family devices never hit this flow.

import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleCalendarOAuthConfig
} from './lib/google-calendar-oauth.js';

function htmlPage(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #1a1a1a; color: #eee; max-width: 720px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    code, textarea { background: #111; color: #9fef9f; border: 1px solid #333; border-radius: 6px; }
    textarea { width: 100%; min-height: 120px; padding: 12px; font-size: 13px; word-break: break-all; }
    .ok { color: #7dcea0; }
    .err { color: #f1948a; }
    a { color: #5dade2; }
    ol { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
</body>
</html>`;
}

export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId, clientSecret, redirectUri, refreshToken } = getGoogleCalendarOAuthConfig();

  // Status check for the dashboard
  if (req.query.status === '1') {
    return res.status(200).json({
      configured: !!(clientId && clientSecret && refreshToken),
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
      redirectUri
    });
  }

  // OAuth callback
  if (req.query.code) {
    try {
      const tokens = await exchangeCodeForTokens(String(req.query.code));
      const token = tokens.refresh_token;
      if (!token) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(
          htmlPage(
            'Almost there',
            `<p class="err">Google did not return a refresh_token.</p>
             <p>Usually that means this account already authorized the app earlier without <code>prompt=consent</code>.</p>
             <ol>
               <li>Open <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google Account → Third-party access</a></li>
               <li>Remove access for this app</li>
               <li><a href="/api/google-calendar-auth">Authorize again</a></li>
             </ol>
             <p>Access token was issued, but dakboard needs the refresh token in Vercel.</p>`
          )
        );
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
        htmlPage(
          'Google Calendar connected',
          `<p class="ok">Success. Copy this refresh token into Vercel as <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code>, then redeploy.</p>
           <textarea readonly onclick="this.select()">${token}</textarea>
           <ol>
             <li>Vercel → Project → Settings → Environment Variables</li>
             <li>Add <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code> = (paste above)</li>
             <li>Also set <code>GOOGLE_CALENDAR_OAUTH_JSON</code> (full client JSON) <em>or</em> <code>GOOGLE_CALENDAR_CLIENT_ID</code> + <code>GOOGLE_CALENDAR_CLIENT_SECRET</code> if not already</li>
             <li>Redeploy</li>
           </ol>
           <p>Family iPads/phones do <strong>not</strong> need Google login. Only this one-time admin step.</p>
           <p><a href="/">Back to dashboard</a></p>`
        )
      );
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
        htmlPage(
          'Authorization failed',
          `<p class="err">${String(error.message || error)}</p>
           <p><a href="/api/google-calendar-auth">Try again</a></p>`
        )
      );
    }
  }

  if (req.query.error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(
      htmlPage(
        'Authorization cancelled',
        `<p class="err">${String(req.query.error)}</p>
         <p><a href="/api/google-calendar-auth">Try again</a></p>`
      )
    );
  }

  // Start OAuth
  try {
    if (!clientId || !clientSecret) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
        htmlPage(
          'Missing OAuth client',
          `<p class="err">Set <code>GOOGLE_CALENDAR_OAUTH_JSON</code> (paste the full client_secret JSON) <em>or</em> <code>GOOGLE_CALENDAR_CLIENT_ID</code> + <code>GOOGLE_CALENDAR_CLIENT_SECRET</code> in Vercel first.</p>
           <p>Redirect URI must be exactly:</p>
           <p><code>${redirectUri}</code></p>`
        )
      );
    }
    const url = buildGoogleAuthUrl();
    res.statusCode = 302;
    res.setHeader('Location', url);
    return res.end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
