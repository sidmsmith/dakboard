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
    
    // Log full response for debugging
    console.log('Google Photos API full response:', JSON.stringify(responseData, null, 2));
    
    photos = responseData.mediaItems || [];
    
    console.log('Google Photos API parsed:', {
      totalPhotos: photos.length,
      hasNextPage: !!responseData.nextPageToken,
      nextPageToken: responseData.nextPageToken ? responseData.nextPageToken.substring(0, 20) + '...' : null,
      responseKeys: Object.keys(responseData),
      samplePhoto: photos.length > 0 ? {
        id: photos[0].id,
        filename: photos[0].filename,
        hasBaseUrl: !!photos[0].baseUrl,
        mimeType: photos[0].mimeType
      } : null
    });
    
    // If we have a nextPageToken but no photos, try fetching the next page
    if (photos.length === 0 && responseData.nextPageToken) {
      console.log('No photos but has nextPageToken, fetching next page...');
      const nextPageRequest = {
        pageSize: pageSize,
        pageToken: responseData.nextPageToken
      };
      
      if (albumId) {
        nextPageRequest.albumId = albumId;
      }
      
      const nextPageResponse = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nextPageRequest),
        }
      );
      
      if (nextPageResponse.ok) {
        const nextPageData = await nextPageResponse.json();
        console.log('Next page full response:', JSON.stringify(nextPageData, null, 2));
        photos = nextPageData.mediaItems || [];
        console.log('Next page returned:', photos.length, 'photos');
        
        // If still no photos but there's another page token, try one more page
        if (photos.length === 0 && nextPageData.nextPageToken) {
          console.log('Still no photos, trying one more page...');
          const thirdPageRequest = {
            pageSize: pageSize,
            pageToken: nextPageData.nextPageToken
          };
          
          if (albumId) {
            thirdPageRequest.albumId = albumId;
          }
          
          const thirdPageResponse = await fetch(
            `https://photoslibrary.googleapis.com/v1/mediaItems:search`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(thirdPageRequest),
            }
          );
          
          if (thirdPageResponse.ok) {
            const thirdPageData = await thirdPageResponse.json();
            console.log('Third page full response:', JSON.stringify(thirdPageData, null, 2));
            photos = thirdPageData.mediaItems || [];
            console.log('Third page returned:', photos.length, 'photos');
          }
        }
      } else {
        const nextPageError = await nextPageResponse.text();
        console.error('Next page error:', nextPageResponse.status, nextPageError);
      }
    }
    
    // If still no photos, try using mediaItems.list endpoint instead
    if (photos.length === 0 && !albumId) {
      console.log('Trying mediaItems.list endpoint as alternative...');
      const listResponse = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${pageSize}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('mediaItems.list response:', JSON.stringify(listData, null, 2));
        photos = listData.mediaItems || [];
        console.log('mediaItems.list returned:', photos.length, 'photos');
      } else {
        const listError = await listResponse.text();
        console.error('mediaItems.list error:', listResponse.status, listError);
      }
    }
    
    // If no photos found, return empty array (frontend will randomize)
    if (photos.length === 0) {
      console.warn('No photos returned from Google Photos API after pagination check');
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
