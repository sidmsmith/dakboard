// Vercel serverless function to fetch Outlook calendar events via Microsoft Graph API
// This keeps authentication server-side and handles CORS

export default async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For now, just test configuration
  if (req.method === 'GET') {
    const { test } = req.query;
    
    if (test === 'config') {
      // Check if required environment variables are set
      const hasClientId = !!process.env.OUTLOOK_CLIENT_ID;
      const hasClientSecret = !!process.env.OUTLOOK_CLIENT_SECRET;
      const hasTenantId = !!process.env.OUTLOOK_TENANT_ID;
      const hasRefreshToken = !!process.env.OUTLOOK_REFRESH_TOKEN;
      
      return res.status(200).json({
        config: {
          clientId: hasClientId ? '✓ Set' : '✗ Missing',
          clientSecret: hasClientSecret ? '✓ Set' : '✗ Missing',
          tenantId: hasTenantId ? '✓ Set' : '✗ Missing',
          refreshToken: hasRefreshToken ? '✓ Set' : '✗ Missing'
        },
        message: 'Check configuration status. All values should be set before fetching calendar events.'
      });
    }
    
    // If we have credentials, try to fetch calendar events
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const tenantId = process.env.OUTLOOK_TENANT_ID;
    const refreshToken = process.env.OUTLOOK_REFRESH_TOKEN;
    
    if (!clientId || !clientSecret || !tenantId || !refreshToken) {
      return res.status(400).json({
        error: 'Missing required configuration',
        message: 'Please set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_TENANT_ID, and OUTLOOK_REFRESH_TOKEN in Vercel environment variables',
        configCheck: '/api/outlook-calendar?test=config'
      });
    }
    
    try {
      // Step 1: Get a new access token using refresh token
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Calendars.Read'
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return res.status(401).json({
          error: 'Failed to get access token',
          details: errorText,
          message: 'The refresh token may be expired or invalid. You may need to re-authenticate.'
        });
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      // Step 2: Fetch calendar events using Microsoft Graph API
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Get next 7 days
      
      const graphUrl = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime`;
      
      const calendarResponse = await fetch(graphUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'outlook.timezone="America/New_York"' // Adjust timezone as needed
        }
      });
      
      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        return res.status(calendarResponse.status).json({
          error: 'Failed to fetch calendar events',
          details: errorText
        });
      }
      
      const calendarData = await calendarResponse.json();
      
      // Format events for easier consumption
      const events = calendarData.value.map(event => ({
        id: event.id,
        subject: event.subject,
        start: event.start.dateTime,
        end: event.end.dateTime,
        location: event.location?.displayName || null,
        isAllDay: event.isAllDay || false,
        organizer: event.organizer?.emailAddress?.name || null
      }));
      
      return res.status(200).json({
        success: true,
        events: events,
        count: events.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error fetching Outlook calendar:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}



