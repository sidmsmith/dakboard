// Vercel serverless function to fetch todo list items from Home Assistant

export default async function (req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { entity_id } = req.body;

  // Validate required fields
  if (!entity_id) {
    return res.status(400).json({ error: 'Missing required field: entity_id' });
  }

  // Get HA credentials from environment
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'HA_URL and HA_TOKEN must be configured' });
  }

  try {
    // Call HA todo/item/list endpoint
    const response = await fetch(`${haUrl}/api/todo/item/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entity_id: entity_id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `HA API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Return items array
    return res.status(200).json({ 
      success: true,
      items: data || []
    });
  } catch (error) {
    console.error('Error calling HA todo/item/list:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

