// Google Photos Proxy - Proxy images with authentication
// Fetches images from Google Photos with proper authentication headers

export default async function (req, res) {
  const { method, query } = req;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url, accessToken } = query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  // Decode the URL (it may be double-encoded from the query string)
  const decodedUrl = decodeURIComponent(url);
  
  try {
    // Picker API baseUrls are signed URLs that may or may not need authentication
    // Try without auth first (signed URLs work without headers)
    let imageResponse = await fetch(decodedUrl);
    
    // If that fails with 403, try with authentication
    if (!imageResponse.ok && imageResponse.status === 403 && accessToken) {
      imageResponse = await fetch(decodedUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }
    
    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ 
        error: `Failed to fetch image: ${imageResponse.status}`,
        statusText: imageResponse.statusText
      });
    }
    
    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // Set appropriate headers for image response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send the image
    return res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error proxying image:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error.message
    });
  }
}

