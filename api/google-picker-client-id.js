// Google Picker API - Get Client ID
// Returns the Google OAuth Client ID for client-side initialization
// Note: Client ID is safe to expose publicly (only the secret needs to be protected)

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const CLIENT_ID = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  
  if (!CLIENT_ID) {
    return res.status(500).json({ 
      error: 'Google Photos Client ID not configured. Please set GOOGLE_PHOTOS_CLIENT_ID environment variable.' 
    });
  }
  
  // Client ID is safe to expose - it's public information
  return res.json({ clientId: CLIENT_ID });
}

