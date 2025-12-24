// Google Photos Token Refresh
// Refreshes expired access tokens using refresh token

export default async function (req, res) {
  const { method } = req;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const CLIENT_ID = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google Photos OAuth credentials not configured' 
    });
  }
  
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }
  
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token refresh error:', error);
      return res.status(400).json({ error: 'Failed to refresh token' });
    }
    
    const tokens = await tokenResponse.json();
    
    return res.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      expiry: Date.now() + (tokens.expires_in * 1000),
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}

