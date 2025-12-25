// Home Assistant Climate - Set Temperature
// Sets the target temperature for a climate entity

export default async function (req, res) {
  const { method, body } = req;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { entity_id, temperature } = body;
  
  if (!entity_id || temperature === undefined) {
    return res.status(400).json({ error: 'entity_id and temperature required' });
  }
  
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;
  
  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }
  
  try {
    const response = await fetch(`${haUrl}/api/services/climate/set_temperature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entity_id: entity_id,
        temperature: temperature
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error setting thermostat temperature:', error);
    return res.status(500).json({ error: error.message });
  }
}

