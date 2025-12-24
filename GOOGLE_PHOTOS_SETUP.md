# Google Photos API Setup Guide

This guide will help you set up Google Photos API integration for the Dakboard.

## Prerequisites

1. A Google Cloud Platform account
2. A Google Cloud project
3. Google Photos Library API enabled

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace account)
   - Fill in the required information
   - Add your email as a test user
6. For **Application type**, select **Web application**
7. Give it a name (e.g., "Dakboard Google Photos")
8. Add **Authorized redirect URIs**:
   - Production: `https://dakboard-smith.vercel.app/api/google-photos-auth`
   - Local development (optional): `http://localhost:3000/api/google-photos-auth`
9. Click **Create**
10. Copy the **Client ID** and **Client Secret**

## Step 2: Enable Google Photos Library API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Photos Library API"
3. Click on it and click **Enable**

## Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:

   - **GOOGLE_PHOTOS_CLIENT_ID**: Your OAuth 2.0 Client ID
   - **GOOGLE_PHOTOS_CLIENT_SECRET**: Your OAuth 2.0 Client Secret
   - **GOOGLE_PHOTOS_REDIRECT_URI** (optional): `https://dakboard-smith.vercel.app/api/google-photos-auth`

4. Make sure to add these for **Production**, **Preview**, and **Development** environments
5. Redeploy your application after adding the variables

## Step 4: Configure Album (Optional)

If you want to display photos from a specific album:

1. Open your Google Photos and find the album
2. The album ID is in the URL: `https://photos.app.goo.gl/[ALBUM_ID]`
3. Alternatively, you can find it by inspecting the album page
4. Add the album ID to your `config.js`:
   ```javascript
   window.CONFIG = {
     // ... other config
     GOOGLE_PHOTOS_ALBUM_ID: 'your_album_id_here'
   };
   ```
5. If the album is empty or not specified, photos will be randomized from all photos

## Step 5: Connect Your Account

1. Open your Dakboard
2. In the Google Photos widget, click **Connect Google Photos**
3. Authorize the application in the popup window
4. The widget will automatically start displaying photos

## How It Works

- **Authentication**: Uses OAuth 2.0 with refresh tokens
- **Token Refresh**: Access tokens expire after 1 hour, but refresh tokens allow automatic renewal
- **Photo Updates**: Photos refresh every 1 minute with a new random photo
- **Album Support**: If an album is specified but empty, it falls back to all photos
- **Token Storage**: Tokens are stored in browser localStorage (client-side only)

## Troubleshooting

### "OAuth credentials not configured"
- Make sure environment variables are set in Vercel
- Redeploy after adding environment variables

### "Token expired" or "Failed to refresh token"
- Re-authenticate by clicking "Connect Google Photos" again
- Check that your OAuth consent screen is properly configured

### "No photos found"
- Make sure you have photos in your Google Photos account
- If using an album, verify the album ID is correct
- Check that the Google Photos Library API is enabled

### Photos not updating
- Check browser console for errors
- Verify the API endpoints are accessible
- Make sure tokens are being stored correctly in localStorage

## Security Notes

- Client ID and Secret are stored as environment variables (server-side only)
- Access tokens are stored in browser localStorage (client-side)
- Refresh tokens allow automatic token renewal without re-authentication
- Users only need to authenticate once (unless they revoke access)

## API Endpoints

- `/api/google-photos-auth` - OAuth initiation and callback
- `/api/google-photos` - Fetch photos from Google Photos API
- `/api/google-photos-refresh` - Refresh expired access tokens

