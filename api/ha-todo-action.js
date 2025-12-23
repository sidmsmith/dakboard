// Vercel serverless function to handle todo list actions
// Supports: complete_item, uncomplete_item, add_item, list_items

export default async function (req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, entity_id, uid, item } = req.body;
  
  // Handle list_items action (fetch todo items)
  if (action === 'list_items') {
    if (!entity_id) {
      return res.status(400).json({ error: 'Missing required field: entity_id' });
    }
    
    const haUrl = process.env.HA_URL;
    const haToken = process.env.HA_TOKEN;
    
    if (!haUrl || !haToken) {
      return res.status(500).json({ error: 'HA_URL and HA_TOKEN must be configured' });
    }
    
    try {
      // Try multiple approaches to get todo items
      // Approach 1: Check if items are in entity state attributes
      const entityResponse = await fetch(`${haUrl}/api/states/${encodeURIComponent(entity_id)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!entityResponse.ok) {
        const errorText = await entityResponse.text();
        return res.status(entityResponse.status).json({ 
          error: `HA API error: ${entityResponse.status} ${entityResponse.statusText}`,
          details: errorText
        });
      }
      
      const entity = await entityResponse.json();
      let items = entity.attributes?.items;
      
      // If items not in attributes, try using the todo service
      if (!items || !Array.isArray(items) || items.length === 0) {
        // Try calling the todo service to get items
        // Some HA versions use: /api/services/todo/get_items
        try {
          const serviceResponse = await fetch(`${haUrl}/api/services/todo/get_items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${haToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entity_id: entity_id })
          });
          
          if (serviceResponse.ok) {
            const serviceData = await serviceResponse.json();
            items = serviceData.items || serviceData || [];
          }
        } catch (serviceError) {
          console.log('Service call failed, using entity attributes:', serviceError);
        }
      }
      
      // Ensure items is an array
      items = Array.isArray(items) ? items : [];
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      return res.status(200).json({ 
        success: true,
        items: items
      });
    } catch (error) {
      console.error('Error fetching todo items:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
  
  // Handle other actions (complete, uncomplete, add)

  // Validate required fields
  if (!action || !entity_id) {
    return res.status(400).json({ error: 'Missing required fields: action, entity_id' });
  }

  // Get HA credentials from environment
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'HA_URL and HA_TOKEN must be configured' });
  }

  try {
    let serviceEndpoint;
    let body;

    // Determine service endpoint and body based on action
    if (action === 'add') {
      if (!item) {
        return res.status(400).json({ error: 'Missing required field: item' });
      }
      serviceEndpoint = 'add_item';
      body = {
        entity_id: entity_id,
        item: item
      };
    } else if (action === 'complete' || action === 'uncomplete') {
      if (!uid) {
        return res.status(400).json({ error: 'Missing required field: uid' });
      }
      serviceEndpoint = `${action}_item`;
      body = {
        entity_id: entity_id,
        uid: uid
      };
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be: add, complete, or uncomplete' });
    }

    // Call HA API
    const response = await fetch(`${haUrl}/api/services/todo/${serviceEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `HA API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error calling HA todo service:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

