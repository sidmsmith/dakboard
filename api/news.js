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
      const error = await response.json();
      throw new Error(error.message || `NewsAPI error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return res.json(data);
  } catch (error) {
    console.error('News API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch news' 
    });
  }
}

