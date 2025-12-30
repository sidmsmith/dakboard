// News API - Fetch news headlines
// Uses NewsAPI.org to fetch news articles

export default async function (req, res) {
  const { method, query } = req;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get API key from environment variable (should be set in Vercel)
  // Default to provided key for now, but should be moved to Vercel env vars
  const apiKey = process.env.NEWS_API_KEY || 'f4d09e4ceabe48a99ccb5320796b2bbb';
  
  if (!apiKey) {
    return res.status(400).json({ error: 'News API key required. Get one at https://newsapi.org/' });
  }
  
  try {
    // Fetch top headlines from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${apiKey}`
    );
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `NewsAPI error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If JSON parsing fails, use status text
      }
      
      // Check for common NewsAPI errors
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your NEWS_API_KEY environment variable.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. NewsAPI free tier has daily limits.';
      } else if (response.status === 426) {
        errorMessage = 'Upgrade required. NewsAPI free tier only works on localhost. Production requires a paid plan.';
      }
      
      console.error('News API error:', errorMessage, 'Status:', response.status);
      return res.status(response.status === 401 ? 400 : 500).json({ 
        error: errorMessage
      });
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data || !data.articles) {
      console.error('Invalid NewsAPI response structure:', data);
      return res.status(500).json({ 
        error: 'Invalid response from news service' 
      });
    }
    
    return res.json(data);
  } catch (error) {
    console.error('News API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch news' 
    });
  }
}

