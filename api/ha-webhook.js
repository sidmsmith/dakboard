// Vercel serverless function to trigger Home Assistant webhooks
// This keeps the token server-side and handles CORS

export default async function (req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { webhookId } = req.query;

  if (!webhookId) {
    return res.status(400).json({ error: 'webhookId is required' });
  }

  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(500).json({ error: 'Home Assistant configuration missing' });
  }

  try {
    // HA webhooks are called via: /api/webhook/{webhook_id}
    const webhookUrl = `${haUrl}/api/webhook/${webhookId}`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Webhooks typically return 200 with no body
    const data = response.status === 204 ? { success: true } : await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error triggering HA webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}

