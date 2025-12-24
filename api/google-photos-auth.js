// Google Photos OAuth Authentication Handler
// Handles OAuth initiation and callback

export default async function (req, res) {
  const { method, query } = req;
  
  // Get Google OAuth credentials from environment variables
  const CLIENT_ID = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  
  // Determine redirect URI - use environment variable or auto-detect
  let REDIRECT_URI = process.env.GOOGLE_PHOTOS_REDIRECT_URI;
  if (!REDIRECT_URI) {
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
    const host = req.headers.host || 'dakboard-smith.vercel.app';
    REDIRECT_URI = `${protocol}://${host}/api/google-photos-auth`;
  }
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google Photos OAuth credentials not configured. Please set GOOGLE_PHOTOS_CLIENT_ID and GOOGLE_PHOTOS_CLIENT_SECRET environment variables.' 
    });
  }
  
  // OAuth initiation - redirect to Google
  if (method === 'GET' && !query.code) {
    const state = query.state || Math.random().toString(36).substring(7);
    // Request the full readonly scope for accessing all photos
    const scope = 'https://www.googleapis.com/auth/photoslibrary.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent&` + // Force consent screen to ensure scope is granted
      `include_granted_scopes=true&` + // Include previously granted scopes
      `state=${encodeURIComponent(state)}`;
    
    return res.redirect(authUrl);
  }
  
  // OAuth callback - exchange code for tokens
  if (method === 'GET' && query.code) {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: query.code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      
      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange error:', error);
        return res.status(400).json({ error: 'Failed to exchange authorization code for tokens' });
      }
      
      const tokens = await tokenResponse.json();
      
      // Return tokens to frontend (will be stored in localStorage)
      // In production, you might want to store these server-side
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Photos Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1a1a1a;
              color: #e0e0e0;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .success {
              color: #4caf50;
              font-size: 1.5rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓ Google Photos Connected Successfully!</div>
            <p>You can close this window and return to your dashboard.</p>
            <script>
              // Store tokens in localStorage
              const tokens = ${JSON.stringify(tokens)};
              localStorage.setItem('google_photos_access_token', tokens.access_token);
              if (tokens.refresh_token) {
                localStorage.setItem('google_photos_refresh_token', tokens.refresh_token);
              }
              localStorage.setItem('google_photos_token_expiry', 
                Date.now() + (tokens.expires_in * 1000));
              
              // Notify parent window if in iframe
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_PHOTOS_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                  window.location.href = '/';
                }, 2000);
              }
            </script>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.status(500).json({ error: 'Failed to complete OAuth flow' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

