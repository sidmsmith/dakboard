# Google OAuth Verification Guide

This guide walks you through fixing the three branding verification issues.

## Issue 1: Website Ownership

You need to verify ownership of `https://dakboard-smith.vercel.app/` using Google Search Console.

### Steps:

1. **Go to Google Search Console**
   - Visit: https://search.google.com/search-console
   - Sign in with the same Google account used for Google Cloud Console

2. **Add Property**
   - Click "Add Property" (or use the dropdown)
   - Select "URL prefix"
   - Enter: `https://dakboard-smith.vercel.app`
   - Click "Continue"

3. **Verify Ownership**
   - Google will show several verification methods
   - **Recommended: HTML file upload**
     - Download the HTML verification file
     - Upload it to your Vercel project root (same directory as `index.html`)
     - Deploy to Vercel
     - Click "Verify" in Search Console
   - **Alternative: HTML tag**
     - Copy the meta tag provided
     - Add it to the `<head>` section of `index.html`
     - Deploy to Vercel
     - Click "Verify" in Search Console

4. **Wait for Verification**
   - Verification usually happens immediately
   - Once verified, the property will appear in Search Console

## Issue 2: Missing Privacy Policy Link

✅ **FIXED** - A privacy policy link has been added to the footer of your home page.

The link points to: `https://dakboard-smith.vercel.app/privacy-policy.html`

**Next Steps:**
1. Deploy the updated `index.html` to Vercel
2. Deploy the `PRIVACY_POLICY.html` file to Vercel (make sure it's accessible at `/privacy-policy.html`)
3. Verify the link works by visiting: `https://dakboard-smith.vercel.app/privacy-policy.html`

## Issue 3: Mismatched App Names

Your OAuth consent screen shows "Personal Dashboard" but your home page title shows "Dakboard v0.3.0".

### Option A: Update OAuth Consent Screen (Recommended)

1. Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
2. Click **Edit App**
3. In the **App name** field, change from "Personal Dashboard" to **"Dakboard"**
4. Click **Save and Continue**
5. Complete any remaining steps

### Option B: Update Home Page to Match

If you prefer to keep "Personal Dashboard" as the app name:

1. Edit `index.html`
2. Change the `<title>` tag from "Dakboard v0.3.0" to "Personal Dashboard"
3. Deploy to Vercel

**Recommendation:** Use Option A (change OAuth consent screen to "Dakboard") since that's your actual app name.

## Complete Verification Checklist

- [ ] Verify website ownership in Google Search Console
- [ ] Deploy updated `index.html` with privacy policy link
- [ ] Deploy `PRIVACY_POLICY.html` to Vercel
- [ ] Verify privacy policy link works: `https://dakboard-smith.vercel.app/privacy-policy.html`
- [ ] Update OAuth consent screen app name to "Dakboard" (or update home page title)
- [ ] Re-submit for verification in Google Cloud Console

## After Fixing All Issues

1. Go back to Google Cloud Console → **OAuth consent screen**
2. Click **Publish App** or **Submit for Verification**
3. Fill out the verification form with:
   - App purpose: "Personal dashboard for displaying smart home data and Google Photos"
   - Scopes justification: Explain why you need `photoslibrary.readonly` access
   - Video demonstration (optional but helpful)
4. Submit and wait for Google's review (usually 1-2 weeks)

## Notes

- Verification can take 1-2 weeks
- Google may ask for additional information
- Once verified, your app will be able to access all Google Photos (not just app-created ones)
- The privacy policy link must be visible on the home page (footer is fine)

