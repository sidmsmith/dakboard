// Vercel serverless function to list all entities from Home Assistant
// This helps identify available entities

export default async function (req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }

  try {
    // Fetch all states
    const response = await fetch(`${haUrl}/api/states`, {
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
    
    // Return ALL entities (not just Pirate Weather)
    // This allows discovery of todo lists, garage doors, alarms, etc.
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json({
      total: data.length,
      entities: data // Return all entities
    });
  } catch (error) {
    console.error('Error fetching HA entities:', error);
    return res.status(500).json({ error: error.message });
  }
}

