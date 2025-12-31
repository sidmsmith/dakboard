// Google Picker API - Session Management
// Handles picker session creation, polling, and getting selected items
// This serverless function is needed because Google's API doesn't allow direct browser calls due to CORS

export default async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, accessToken, sessionId } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }
  
  try {
    switch (action) {
      case 'create':
        // Create a new picker session
        const createResponse = await fetch('https://photoslibrary.googleapis.com/v1/pickerSessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
        
        const pollResponse = await fetch(`https://photoslibrary.googleapis.com/v1/pickerSessions/${sessionId}`, {
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
        
        const getResponse = await fetch(`https://photoslibrary.googleapis.com/v1/pickerSessions/${sessionId}:getSelectedMediaItems`, {
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

