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
      // Use the todo.get_items service to fetch items
      // Response structure: { "todo.entity_id": { "items": [...] } }
      // Note: Must add ?return_response=true to get the response data
      const serviceResponse = await fetch(`${haUrl}/api/services/todo/get_items?return_response=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entity_id: entity_id })
      });
      
      if (!serviceResponse.ok) {
        const errorText = await serviceResponse.text();
        return res.status(serviceResponse.status).json({ 
          error: `HA API error: ${serviceResponse.status} ${serviceResponse.statusText}`,
          details: errorText
        });
      }
      
      const serviceData = await serviceResponse.json();
      
      // Debug: log the full response structure
      console.log('Todo get_items service response:', JSON.stringify(serviceData, null, 2));
      console.log('Entity ID:', entity_id);
      console.log('Response keys:', Object.keys(serviceData || {}));
      
      // Response structure with ?return_response=true:
      // { "service_response": { "todo.entity_id": { "items": [...] } }, "changed_states": [] }
      // Extract items from the response
      let items = [];
      
      // Check for service_response wrapper first (when using ?return_response=true)
      if (serviceData && serviceData.service_response && serviceData.service_response[entity_id]) {
        items = serviceData.service_response[entity_id].items || [];
        console.log('Found items in serviceData.service_response[entity_id].items:', items);
      } else if (serviceData && serviceData[entity_id]) {
        // Direct structure: { "todo.entity_id": { "items": [...] } }
        items = serviceData[entity_id].items || [];
        console.log('Found items in serviceData[entity_id].items:', items);
      } else if (serviceData && serviceData[entity_id] && Array.isArray(serviceData[entity_id])) {
        // Response might be: { "todo.entity_id": [...] }
        items = serviceData[entity_id];
        console.log('Found items as direct array in serviceData[entity_id]:', items);
      } else if (Array.isArray(serviceData)) {
        // Fallback: if response is directly an array
        items = serviceData;
        console.log('Response is direct array:', items);
      } else if (serviceData && serviceData.items) {
        // Fallback: if response has items at root level
        items = serviceData.items;
        console.log('Found items in serviceData.items:', items);
      } else if (serviceData && serviceData.response) {
        // Check if response is nested in a 'response' field
        const responseData = serviceData.response;
        if (responseData && responseData[entity_id]) {
          items = responseData[entity_id].items || [];
          console.log('Found items in serviceData.response[entity_id].items:', items);
        }
      }
      
      // Ensure items is an array
      items = Array.isArray(items) ? items : [];
      console.log('Final items array length:', items.length);
      
      // If still no items, log the full serviceData for debugging
      if (items.length === 0) {
        console.log('WARNING: No items extracted. Full serviceData:', JSON.stringify(serviceData, null, 2));
      }
      
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
      // Use todo.update_item service with status field
      serviceEndpoint = 'update_item';
      // Format: target.entity_id is an array, data has status and item
      body = {
        target: {
          entity_id: [entity_id]
        },
        data: {
          status: action === 'complete' ? 'completed' : 'needs_action',
          item: uid
        }
      };
      
      // Log the request for debugging
      console.log('Calling todo.update_item with:', JSON.stringify(body, null, 2));
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be: add, complete, or uncomplete' });
    }

    // Call HA API
    const requestUrl = `${haUrl}/api/services/todo/${serviceEndpoint}`;
    console.log('HA API URL:', requestUrl);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log('HA API response status:', response.status);

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

