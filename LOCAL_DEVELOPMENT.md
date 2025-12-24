# Local Development Guide

## Overview

The dashboard supports two modes:
1. **Local Development Mode** - Direct API calls to Home Assistant (uses `config.js`)
2. **Production Mode** - Uses Vercel serverless functions (uses environment variables)

## Setting Up Local Development

### Step 1: Create Local Config File

1. Copy the example config file:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` and add your Home Assistant credentials:
   ```javascript
   window.CONFIG = {
     LOCAL_MODE: true,
     HA_URL: 'http://sidmsmith.zapto.org:8123', // Your HA URL
     HA_TOKEN: 'your_long_lived_access_token_here', // Your HA token
   };
   ```

**Important**: `config.js` is in `.gitignore` and will NOT be committed to git. This keeps your credentials safe.

### Step 2: Start Local Server

Run a simple HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000

# Or using Node.js http-server (if installed)
npx http-server
```

### Step 3: Open Dashboard

Open your browser to:
```
http://localhost:8000
```

The dashboard will automatically detect local mode and use direct HA API calls.

## How It Works

### Local Mode (with config.js)
- Dashboard makes direct API calls to Home Assistant
- Uses `window.CONFIG.HA_URL` and `window.CONFIG.HA_TOKEN` from `config.js`
- No serverless functions needed
- Works offline (as long as HA is accessible)

### Production Mode (Vercel)
- Dashboard uses serverless functions (`/api/ha-fetch.js` and `/api/ha-webhook.js`)
- Uses Vercel environment variables (`HA_URL` and `HA_TOKEN`)
- More secure (tokens never exposed to browser)
- Handles CORS automatically

## Troubleshooting

### "Error loading weather" or other errors
- Check that `config.js` exists and has correct values
- Verify `HA_URL` is accessible from your computer
- Check that `HA_TOKEN` is valid (create a new one if needed)
- Check browser console for detailed error messages

### CORS Errors
- If you see CORS errors, you may need to add your localhost to HA's CORS config
- Add to Home Assistant `configuration.yaml`:
  ```yaml
  http:
    cors_allowed_origins:
      - http://localhost:8000
      - http://127.0.0.1:8000
  ```
- Restart Home Assistant after making changes

### Webhook Not Working Locally
- Webhooks should work the same in local mode
- Make sure the webhook ID in `app.js` matches your HA webhook automation
- Check HA logs if webhook isn't triggering

## Switching Between Modes

- **To use Local Mode**: Ensure `config.js` exists with `LOCAL_MODE: true`
- **To use Production Mode**: Delete `config.js` or set `LOCAL_MODE: false`
- The code automatically detects which mode to use

## Security Notes

- **Never commit `config.js`** - It's already in `.gitignore`
- **Never share your HA token** - Keep it private
- **Use local mode only for development** - Production should use Vercel serverless functions
- **Rotate tokens regularly** - Create new tokens if you suspect compromise



