// Home Assistant Climate - Set HVAC Mode
// Sets the HVAC mode (heat, cool, auto, off) for a climate entity

export default async function (req, res) {
  const { method, body } = req;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { entity_id, hvac_mode } = body;
  
  if (!entity_id || !hvac_mode) {
    return res.status(400).json({ error: 'entity_id and hvac_mode required' });
  }
  
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;
  
  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }
  
  try {
    const response = await fetch(`${haUrl}/api/services/climate/set_hvac_mode`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entity_id: entity_id,
        hvac_mode: hvac_mode
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
    console.error('Error setting thermostat mode:', error);
    return res.status(500).json({ error: error.message });
  }
}

