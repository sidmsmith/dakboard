// Vercel serverless function to fetch entity data from Home Assistant
// This keeps the token server-side and handles CORS

export default async function (req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { entityId } = req.query;

  if (!entityId) {
    return res.status(400).json({ error: 'entityId is required' });
  }

  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }

  try {
    const response = await fetch(`${haUrl}/api/states/${entityId}`, {
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching HA entity:', error);
    return res.status(500).json({ error: error.message });
  }
}

