# Fixing CORS Errors for Local Development

## Problem

You're seeing CORS errors like:
```
Access to fetch at 'http://sidmsmith.zapto.org:8123/api/states/...' from origin 'http://localhost:8000' has been blocked by CORS policy
```

This happens because Home Assistant isn't configured to allow requests from `localhost:8000`.

## Solution: Add CORS Configuration to Home Assistant

You need to add CORS allowed origins to your Home Assistant `configuration.yaml` file.

### Step 1: Edit Home Assistant Configuration

1. Open Home Assistant
2. Go to **Settings** > **Add-ons** > **File editor** (or use your preferred method to edit files)
3. Navigate to `/config/configuration.yaml`
4. Find or add the `http:` section

### Step 2: Add CORS Configuration

Add or update the `http:` section in `configuration.yaml`:

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - ::1
  cors_allowed_origins:
    - http://localhost:8000
    - http://127.0.0.1:8000
    - http://localhost:3000
    - http://localhost:5173
    # Add your Vercel URL when ready for production
    # - https://your-dakboard.vercel.app
```

**Important Notes:**
- If you already have an `http:` section, just add the `cors_allowed_origins` part
- Make sure the indentation is correct (2 spaces)
- You can add multiple origins (one per line with a dash)

### Step 3: Restart Home Assistant

After saving `configuration.yaml`:
1. Go to **Settings** > **System** > **Hardware**
2. Click the three dots menu (⋮) in the top right
3. Select **Restart**
4. Or use the Developer Tools > YAML > Check Configuration, then restart

### Step 4: Verify It Works

1. Refresh your dashboard at `http://localhost:8000`
2. Check the browser console - CORS errors should be gone
3. Data should start loading from Home Assistant

## Alternative: Use Vercel Serverless Functions (No CORS Issues)

If you don't want to modify Home Assistant configuration, you can:

1. **Skip local testing** and deploy directly to Vercel
2. The serverless functions (`/api/ha-fetch.js` and `/api/ha-webhook.js`) handle CORS automatically
3. They make requests server-side, so no CORS issues

## Troubleshooting

### Still Getting CORS Errors?

1. **Check YAML syntax** - Make sure indentation is correct (2 spaces, not tabs)
2. **Verify restart** - Home Assistant must be restarted for config changes to take effect
3. **Check logs** - Go to **Settings** > **System** > **Logs** to see if there are configuration errors
4. **Validate YAML** - Use Developer Tools > YAML > Check Configuration before restarting

### Configuration Error?

If Home Assistant won't start after your changes:
1. Check the logs for YAML syntax errors
2. Make sure you're using spaces, not tabs
3. Verify the `http:` section is at the root level (not nested)
4. Remove the CORS config temporarily to get HA running again, then fix the syntax

### Testing CORS Configuration

You can test if CORS is working by opening browser console and running:
```javascript
fetch('http://sidmsmith.zapto.org:8123/api/', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

If CORS is configured correctly, you should see a response (even if it's an error about missing endpoint).

## Production Deployment

When you deploy to Vercel, you'll want to add your Vercel URL to the CORS list:

```yaml
cors_allowed_origins:
  - http://localhost:8000
  - http://127.0.0.1:8000
  - https://your-dakboard.vercel.app
```

Replace `your-dakboard.vercel.app` with your actual Vercel domain.

