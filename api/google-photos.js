// Google Photos API - Fetch photos
// Handles fetching photos from Google Photos Library API

export default async function (req, res) {
  const { method, query } = req;
  
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
    
    if (albumId) {
      // Fetch photos from specific album
      const albumResponse = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            albumId: albumId,
            pageSize: pageSize,
          }),
        }
      );
      
      if (!albumResponse.ok) {
        if (albumResponse.status === 401) {
          return res.status(401).json({ error: 'Token expired', needsRefresh: true });
        }
        const errorText = await albumResponse.text();
        let errorData;
        try {
          errorData = await albumResponse.json();
        } catch (e) {
          errorData = { error: errorText };
        }
        console.error('Google Photos Album API error:', {
          status: albumResponse.status,
          statusText: albumResponse.statusText,
          error: errorData
        });
        throw new Error(`Album API error (${albumResponse.status}): ${JSON.stringify(errorData)}`);
      }
      
      const albumData = await albumResponse.json();
      photos = albumData.mediaItems || [];
    } else {
      // Fetch recent photos (or all photos)
      const searchResponse = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageSize: pageSize,
            filters: {
              // No filters = get all photos
            },
          }),
        }
      );
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
          return res.status(401).json({ error: 'Token expired', needsRefresh: true });
        }
        const error = await searchResponse.text();
        throw new Error(`Search API error: ${error}`);
      }
      
      const searchData = await searchResponse.json();
      photos = searchData.mediaItems || [];
    }
    
    // If no photos found in album, return empty array (frontend will randomize)
    if (photos.length === 0) {
      return res.json({ photos: [], message: 'No photos found' });
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

