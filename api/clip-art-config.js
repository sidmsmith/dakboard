// Vercel serverless function to serve clip art API configuration
// Reads from environment variables and returns them to the client
// This keeps API keys secure (not exposed in client-side code)

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return only the clip art API keys from environment variables
  // Note: In Vercel, environment variables are accessed via process.env
  const config = {
    PIXABAY_API_KEY: process.env.PIXABAY_API_KEY || null,
    NOUNPROJECT_API_KEY: process.env.NOUN_API_KEY || null,
    NOUNPROJECT_API_SECRET: process.env.NOUN_API_SECRET || null,
  };

  // Debug logging (only in development - remove in production if needed)
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Clip art config requested. Environment variables present:', {
      PIXABAY_API_KEY: !!process.env.PIXABAY_API_KEY,
      NOUN_API_KEY: !!process.env.NOUN_API_KEY,
      NOUN_API_SECRET: !!process.env.NOUN_API_SECRET,
    });
  }

  // Set CORS headers to allow the dashboard to fetch this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json(config);
}

