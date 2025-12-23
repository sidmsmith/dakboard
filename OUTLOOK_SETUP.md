# Outlook Calendar Integration Setup

This guide will help you set up Outlook 365 calendar integration for the dashboard.

## Step 1: Register an App in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `Dakboard Calendar` (or any name you prefer)
   - **Supported account types**: Choose based on your needs:
     - Personal Microsoft accounts only
     - Work/school accounts only
     - Both (recommended if you have both types)
   - **Redirect URI**: 
     - Type: `Web`
     - URI: `http://localhost:3000/auth/callback` (for testing)
     - Or: `https://your-vercel-url.vercel.app/auth/callback` (for production)
5. Click **Register**

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `Calendars.Read` (read calendar events)
   - `offline_access` (get refresh tokens)
6. Click **Add permissions**
7. **Important**: Click **Grant admin consent** if you're using work/school accounts

## Step 3: Create a Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "Dakboard Calendar")
4. Choose expiration (24 months recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't be able to see it again!)
7. Save this value - you'll need it for Vercel environment variables

## Step 4: Get Your Tenant ID

1. In Azure Portal, go to **Azure Active Directory** > **Overview**
2. Copy the **Tenant ID** (it's a GUID like `12345678-1234-1234-1234-123456789abc`)

## Step 5: Get a Refresh Token

You need to get an initial refresh token. There are a few ways to do this:

### Option A: Using a Simple Auth Flow (Recommended for Testing)

1. Use Microsoft's OAuth 2.0 authorization endpoint:
   ```
   https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize?
   client_id={CLIENT_ID}
   &response_type=code
   &redirect_uri={REDIRECT_URI}
   &response_mode=query
   &scope=https://graph.microsoft.com/Calendars.Read offline_access
   &state=12345
   ```

2. Replace:
   - `{TENANT_ID}` with your Tenant ID
   - `{CLIENT_ID}` with your Application (client) ID
   - `{REDIRECT_URI}` with your redirect URI (must match exactly)

3. Open this URL in a browser and sign in
4. You'll be redirected to your redirect URI with a `code` parameter
5. Exchange this code for tokens (see below)

### Option B: Using Postman or Similar Tool

1. Use Postman's OAuth 2.0 helper
2. Configure with your app details
3. Get the refresh token from the response

### Option C: Using a Simple Node Script

Create a temporary script to get tokens (we can create this if needed)

## Step 6: Exchange Authorization Code for Tokens

Once you have the authorization code, exchange it for tokens:

```bash
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&code={AUTHORIZATION_CODE}
&redirect_uri={REDIRECT_URI}
&grant_type=authorization_code
&scope=https://graph.microsoft.com/Calendars.Read offline_access
```

The response will include:
- `access_token` (short-lived, ~1 hour)
- `refresh_token` (long-lived, use this for Vercel)

## Step 7: Set Vercel Environment Variables

In your Vercel project settings, add these environment variables:

- `OUTLOOK_CLIENT_ID` - Your Application (client) ID from Azure
- `OUTLOOK_CLIENT_SECRET` - The client secret value you copied
- `OUTLOOK_TENANT_ID` - Your Tenant ID
- `OUTLOOK_REFRESH_TOKEN` - The refresh token from Step 6

## Step 8: Test the Connection

1. Deploy to Vercel (or use `vercel dev` locally)
2. Visit: `https://your-vercel-url.vercel.app/api/outlook-calendar?test=config`
3. This will show you which environment variables are set
4. Once all are set, visit: `https://your-vercel-url.vercel.app/api/outlook-calendar`
5. You should see calendar events for the next 7 days

## Troubleshooting

### "Invalid client secret"
- Make sure you copied the secret value (not the secret ID)
- Secrets expire - create a new one if needed

### "Invalid refresh token"
- Refresh tokens can expire or be revoked
- You may need to re-authenticate and get a new refresh token
- Make sure you requested `offline_access` scope

### "Insufficient privileges"
- Make sure you granted admin consent for the permissions
- Check that `Calendars.Read` permission is added

### "Redirect URI mismatch"
- The redirect URI must match exactly (including http vs https, trailing slashes, etc.)

## Next Steps

Once you can successfully fetch calendar events:
1. We'll integrate the events into the dashboard calendar widget
2. We can add support for multiple calendars
3. We can add real-time updates

## Notes

- Refresh tokens are long-lived but can be revoked
- Access tokens expire after ~1 hour (the serverless function handles refresh automatically)
- For production, consider implementing token rotation
- If you have multiple Outlook accounts, you'll need separate app registrations or use a multi-tenant setup

