// Google Photos API - Fetch photos
// Handles fetching photos from Google Photos Library API

export default async function (req, res) {
  const { method, query } = req;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get access token from request (passed from frontend)
  const accessToken = query.access_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const albumId = query.album_id || null; // Optional album ID
  const pageSize = parseInt(query.page_size) || 100; // Number of photos to fetch
  
  try {
    let photos = [];
    let requestBody = {
      pageSize: pageSize
    };
    
    if (albumId) {
      // Fetch photos from specific album
      requestBody.albumId = albumId;
    }
    // If no albumId, we'll search all photos (no filters needed - API allows empty request)
    
    console.log('Google Photos API request:', {
      url: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      body: requestBody
    });
    
    const apiResponse = await fetch(
      `https://photoslibrary.googleapis.com/v1/mediaItems:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    if (!apiResponse.ok) {
      if (apiResponse.status === 401) {
        return res.status(401).json({ error: 'Token expired', needsRefresh: true });
      }
      
      const errorText = await apiResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error('Google Photos API error:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorData,
        requestBody: requestBody
      });
      
      return res.status(apiResponse.status).json({ 
        error: `Google Photos API error (${apiResponse.status})`,
        details: errorData,
        message: errorData.error?.message || errorData.error || 'Unknown error'
      });
    }
    
    const responseData = await apiResponse.json();
    photos = responseData.mediaItems || [];
    
    console.log('Google Photos API response:', {
      totalPhotos: photos.length,
      hasNextPage: responseData.nextPageToken ? true : false,
      samplePhoto: photos.length > 0 ? {
        id: photos[0].id,
        filename: photos[0].filename,
        hasBaseUrl: !!photos[0].baseUrl
      } : null
    });
    
    // If no photos found in album, return empty array (frontend will randomize)
    if (photos.length === 0) {
      console.warn('No photos returned from Google Photos API');
      return res.json({ photos: [], message: 'No photos found in your Google Photos library' });
    }
    
    // Format photos for frontend
    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      baseUrl: photo.baseUrl,
      mimeType: photo.mimeType,
      filename: photo.filename,
      // Get different sizes if available
      thumbnail: photo.baseUrl + '=w300-h300-c', // 300x300 thumbnail
      medium: photo.baseUrl + '=w800-h600', // Medium size
      full: photo.baseUrl + '=w1920-h1080', // Full HD
    }));
    
    return res.json({ photos: formattedPhotos });
  } catch (error) {
    console.error('Google Photos API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch photos',
      details: error.stack 
    });
  }
}
