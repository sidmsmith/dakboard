// Google Picker API - Session Management
// Handles picker session creation, polling, and getting selected items
// This serverless function is needed because Google's API doesn't allow direct browser calls due to CORS

export default async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Allow GET for testing/debugging
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Google Picker Session API is working',
      method: 'Use POST with action, accessToken, and optionally sessionId'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, accessToken, sessionId } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }
  
  // Log token info (first 20 chars only for security)
  console.log('Received access token (first 20 chars):', accessToken.substring(0, 20) + '...');
  console.log('Token length:', accessToken.length);
  
  try {
    switch (action) {
      case 'create':
        // Create a new picker session
        // Note: Google Photos Picker API uses photospicker.googleapis.com, not photoslibrary.googleapis.com
        // Endpoint is /v1/sessions, not /v1/pickerSessions
        const authHeader = `Bearer ${accessToken}`;
        console.log('Making request to:', 'https://photospicker.googleapis.com/v1/sessions');
        console.log('Authorization header (first 30 chars):', authHeader.substring(0, 30) + '...');
        
        const createResponse = await fetch('https://photospicker.googleapis.com/v1/sessions', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            featureConfigs: [{
              feature: 'PHOTOS',
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            }]
          })
        });
        
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Google Picker API error:', createResponse.status, errorText);
          
          // Check if it's a 401 - authentication issue
          if (createResponse.status === 401) {
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { error: { message: errorText } };
            }
            
            return res.status(401).json({ 
              error: 'Authentication failed (401). The access token may be invalid, expired, or not have the required scope.',
              details: 'Please ensure: 1) The token was obtained with the scope "https://www.googleapis.com/auth/photospicker.mediaitems.readonly", 2) The token is not expired, 3) The OAuth client ID matches the one used to obtain the token.',
              googleError: errorData
            });
          }
          
          // Check if it's a 404 - API might not be enabled
          if (createResponse.status === 404) {
            return res.status(404).json({ 
              error: 'Google Photos Picker API endpoint not found (404). Please ensure the Google Photos Picker API is enabled in your Google Cloud Console project.',
              details: 'Go to Google Cloud Console > APIs & Services > Library > Search for "Google Photos Picker API" > Enable',
              googleError: errorText
            });
          }
          
          return res.status(createResponse.status).json({ 
            error: `Failed to create picker session: ${createResponse.status}`,
            details: errorText
          });
        }
        
        const createData = await createResponse.json();
        return res.json(createData);
        
      case 'poll':
        // Poll session status
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID is required for polling' });
        }
        
        const pollResponse = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          return res.status(pollResponse.status).json({ 
            error: `Failed to poll session: ${pollResponse.status}`,
            details: errorText
          });
        }
        
        const pollData = await pollResponse.json();
        return res.json(pollData);
        
      case 'getSelected':
        // Get selected media items
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID is required for getting selected items' });
        }
        
        const getResponse = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}:getSelectedMediaItems`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!getResponse.ok) {
          const errorText = await getResponse.text();
          return res.status(getResponse.status).json({ 
            error: `Failed to get selected media items: ${getResponse.status}`,
            details: errorText
          });
        }
        
        const getData = await getResponse.json();
        return res.json(getData);
        
      default:
        return res.status(400).json({ error: 'Invalid action. Must be: create, poll, or getSelected' });
    }
  } catch (error) {
    console.error('Google Picker API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

