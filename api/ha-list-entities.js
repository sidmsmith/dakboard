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
    
    // Filter for Pirate Weather entities
    const pirateWeatherEntities = data.filter(entity => 
      entity.entity_id.includes('pirate') || 
      entity.entity_id.includes('weather') ||
      entity.entity_id.toLowerCase().includes('forecast')
    );
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json({
      total: data.length,
      pirateWeather: pirateWeatherEntities.length,
      entities: pirateWeatherEntities.map(e => ({
        entity_id: e.entity_id,
        state: e.state,
        attributes: Object.keys(e.attributes || {}).slice(0, 20) // First 20 attribute keys
      }))
    });
  } catch (error) {
    console.error('Error fetching HA entities:', error);
    return res.status(500).json({ error: error.message });
  }
}

