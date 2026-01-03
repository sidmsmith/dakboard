# Clip Art API Setup Instructions

This dashboard supports fetching clip art images from the **Pixabay** API. Follow the instructions below to configure the API.

## Table of Contents
- [Pixabay API Setup](#pixabay-api-setup)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Pixabay API Setup

Pixabay provides free images, illustrations, and vectors. The API is free to use with reasonable rate limits.

### Step 1: Create a Pixabay Account

1. Go to [https://pixabay.com/](https://pixabay.com/)
2. Click **"Join"** in the top right corner
3. Fill out the registration form:
   - Email address
   - Username
   - Password
   - Confirm you're not a robot (reCAPTCHA)
4. Click **"Sign up"**
5. Verify your email address if required

### Step 2: Get Your API Key

1. After logging in, go to [https://pixabay.com/api/docs/](https://pixabay.com/api/docs/)
2. Scroll down to the **"Search Images"** section
3. Look for the **"key"** parameter description
4. Click the **"Login"** or **"Sign up"** link next to "Please login to see your API key here"
5. Once logged in, you'll see your API key displayed on the page
6. **Copy your API key** - it will look something like: `12345678-1234-1234-1234-123456789abc`

### Step 3: Configure in Dashboard

You have two options for configuration:

#### Option A: Vercel Environment Variables (Recommended for Production)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `PIXABAY_API_KEY`
   - **Value**: Your Pixabay API key from Step 2
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your application for the changes to take effect

The dashboard will automatically fetch the API key from the environment variable via the `/api/clip-art-config.js` endpoint.

#### Option B: Local config.js (For Local Development)

1. Open or create the `config.js` file in your dashboard directory
2. Add your Pixabay API key:

```javascript
window.CONFIG = {
  // ... other config options ...
  PIXABAY_API_KEY: 'YOUR_PIXABAY_API_KEY_HERE'
};
```

3. Replace `YOUR_PIXABAY_API_KEY_HERE` with your actual API key from Step 2
4. Save the file

### Pixabay API Details

- **Rate Limit**: 100 requests per 60 seconds (per API key)
- **Free Tier**: Yes, completely free
- **Image Types**: Photos, illustrations, vectors
- **License**: Free for commercial use (Pixabay License)
- **Attribution**: Required - must show "Images from Pixabay" when displaying results

---

## OpenClipart API Setup

OpenClipart provides a vast collection of public domain vector graphics. **No authentication is required** - the API is completely free and open to use.

### Step 1: No Account Required!

OpenClipart's API is publicly accessible - you don't need to create an account or obtain API credentials. Simply use the API endpoints directly.

### OpenClipart API Details

- **Rate Limit**: No official rate limit specified (be respectful with requests)
- **Free Tier**: Yes, completely free
- **Authentication**: None required
- **Image Types**: SVG and PNG clipart
- **License**: Public domain - free for commercial use
- **API Version**: v2 (currently in beta)
- **Documentation**: [https://openclipart.org/developers](https://openclipart.org/developers)

### How It Works

The dashboard automatically uses the OpenClipart API without any configuration needed. The API endpoint is:

```
https://openclipart.org/api/v2/search/json?query=SEARCH_TERM&amount=100
```

Simply search for clipart using the "OpenClipart" button in the Clip Art widget's Advanced tab.

---

## Configuration

### Complete config.js Example (Local Development Only)

Here's a complete example of how your `config.js` should look for local development:

```javascript
window.CONFIG = {
  // Home Assistant Configuration
  HA_URL: 'https://your-home-assistant-url.com',
  HA_TOKEN: 'your-home-assistant-token',
  
  // Pixabay API Configuration
  PIXABAY_API_KEY: '12345678-1234-1234-1234-123456789abc',
  
  // Other configuration options...
};
```

**Note**: For production on Vercel, use environment variables instead (see Option A in Step 3 for each API above).

### File Location

- **Development**: Place `config.js` in the `dakboard` directory
- **Production (Vercel)**: Use environment variables (see Option A in Step 3 above)
- **Production (Other)**: The file should be in the same directory as `index.html`
- **Security**: **DO NOT** commit `config.js` to version control if it contains sensitive keys
  - Add `config.js` to your `.gitignore` file
  - For Vercel, use environment variables instead of `config.js` for production

---

## Troubleshooting

### Pixabay API Issues

**Error: "API key not configured"**
- Make sure `PIXABAY_API_KEY` is set in `config.js`
- Verify the key is spelled correctly (case-sensitive)
- Ensure `config.js` is loaded before the dashboard scripts

**Error: "API rate limit exceeded" (429 error)**
- You've exceeded 100 requests per 60 seconds
- Wait a minute and try again
- Consider caching search results

**Error: "No images found"**
- Try different search terms
- Check that your search query is not too specific
- Verify your API key is valid and active

**Images not displaying**
- Check browser console for CORS errors
- Pixabay URLs are valid for 24 hours - images may expire
- Try refreshing the search

### General Issues

**Modal appears behind Style Widget**
- This should be fixed with z-index: 10003
- If still happening, check browser console for CSS conflicts

**Selected image doesn't display**
- Check that `loadClipArt()` function is being called
- Verify the image URL is valid and accessible
- Check browser console for errors
- Ensure the image URL is saved in localStorage

**config.js not loading**
- Verify the file exists in the correct location
- Check browser console for 404 errors
- Ensure the script tag in `index.html` is correct
- In production, make sure the file is deployed

---

## Security Notes

1. **Never commit API keys to version control**
   - Add `config.js` to `.gitignore`
   - Use environment variables in production if possible

2. **API Key Security**
   - Treat API keys like passwords
   - Don't share them publicly
   - Regenerate keys if compromised

3. **Rate Limiting**
   - Be respectful of API rate limits
   - Don't make excessive automated requests
   - Cache results when possible

4. **CORS and Hotlinking**
   - Pixabay: URLs are valid for 24 hours. For permanent use, download images to your server

---

## Additional Resources

- **Pixabay API Documentation**: [https://pixabay.com/api/docs/](https://pixabay.com/api/docs/)
- **Pixabay Terms of Service**: [https://pixabay.com/service/terms/](https://pixabay.com/service/terms/)

---

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Verify your API credentials are correct
3. Test the API directly using their documentation examples
4. Check the API status pages for service outages
5. Review the API documentation for recent changes

