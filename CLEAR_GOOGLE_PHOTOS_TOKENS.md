# How to Clear Google Photos Tokens

## Method 1: Using Browser Console (Easiest)

1. Open your dashboard: `https://dakboard-smith.vercel.app/`
2. Press `F12` (or right-click → Inspect) to open Developer Tools
3. Click on the **Console** tab
4. Type the following command and press Enter:

```javascript
localStorage.removeItem('google_photos_access_token');
localStorage.removeItem('google_photos_refresh_token');
localStorage.removeItem('google_photos_token_expiry');
console.log('Google Photos tokens cleared!');
```

5. Refresh the page (F5)
6. Click "Connect Google Photos" again

## Method 2: Using Browser DevTools Application Tab

1. Open your dashboard: `https://dakboard-smith.vercel.app/`
2. Press `F12` to open Developer Tools
3. Click on the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. In the left sidebar, expand **Local Storage**
5. Click on your site URL (`https://dakboard-smith.vercel.app`)
6. Find and delete these keys:
   - `google_photos_access_token`
   - `google_photos_refresh_token`
   - `google_photos_token_expiry`
7. Refresh the page
8. Click "Connect Google Photos" again

## Method 3: Clear All Site Data (Nuclear Option)

1. Open your dashboard
2. Press `F12` to open Developer Tools
3. Go to **Application** tab → **Storage** section
4. Click **Clear site data** button
5. Refresh the page
6. **Note:** This will clear ALL localStorage data, including widget layouts and other settings

## After Clearing Tokens

1. Click "Connect Google Photos" button in the widget
2. When the Google consent screen appears, make sure you see and **check the box** for:
   - "See your Google Photos library"
   - Or "View your Google Photos library"
3. Click "Allow" or "Continue"
4. The widget should now work!

