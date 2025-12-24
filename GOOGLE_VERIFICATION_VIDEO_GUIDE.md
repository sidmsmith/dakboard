# Google OAuth Verification - Demo Video Guide

Google requires a demo video showing how your app uses sensitive scopes (like `photoslibrary.readonly`). This video helps Google understand your app's use case and ensures you're using the scopes appropriately.

## Video Requirements

- **Length**: 2-5 minutes (recommended)
- **Format**: YouTube, Google Drive, or other publicly accessible video hosting
- **Content**: Must show the actual app in use, demonstrating the sensitive scope

## What to Show in the Video

### 1. Introduction (10-15 seconds)
- Briefly introduce yourself and the app
- State: "This is Personal Dashboard, a smart home dashboard application"

### 2. App Overview (20-30 seconds)
- Show the dashboard interface
- Explain it's a personal dashboard for displaying smart home data

### 3. Google Photos Integration (1-2 minutes) - **MOST IMPORTANT**
- **Show the Google Photos widget** on the dashboard
- **Demonstrate the OAuth flow:**
  - Click "Connect Google Photos" button
  - Show the Google consent screen (you can blur sensitive parts)
  - Show that you're requesting "View your Google Photos library" permission
  - Complete the connection
- **Show photos displaying:**
  - Photos appearing in the widget
  - Photos updating/rotating (if applicable)
  - Explain that photos are displayed for personal viewing only
- **Emphasize read-only access:**
  - State clearly that the app only **views** photos
  - The app does **not** upload, modify, or delete photos
  - Photos are displayed in a personal dashboard widget

### 4. Scope Justification (30 seconds)
- Explain why you need this scope:
  - "I need read-only access to display my personal photos in my dashboard widget"
  - "The app only displays photos for personal viewing"
  - "No photos are shared, uploaded, or modified"

### 5. Conclusion (10-15 seconds)
- Summarize: "This is a personal dashboard application that displays my own Google Photos for personal viewing only"

## Video Recording Tips

### Tools You Can Use:
- **Windows**: Built-in Game Bar (Win+G), OBS Studio, or ScreenRec
- **Mac**: QuickTime Player (built-in), ScreenFlow, or OBS Studio
- **Online**: Loom, Screencast-O-Matic

### Best Practices:
1. **Record your screen** showing the actual app
2. **Use a clear voiceover** explaining what you're doing
3. **Show the URL** in the browser so Google can see it's your app
4. **Keep it focused** - don't show unnecessary parts
5. **Test the video** before submitting to ensure audio and video are clear

## Where to Host the Video

### Option 1: YouTube (Recommended)
1. Upload video to YouTube
2. Set visibility to **"Unlisted"** (not public, but accessible via link)
3. Copy the video URL
4. Paste URL in Google Cloud Console

### Option 2: Google Drive
1. Upload video to Google Drive
2. Right-click → "Get link"
3. Set sharing to "Anyone with the link can view"
4. Copy the link
5. Paste URL in Google Cloud Console

### Option 3: Other Hosting
- Vimeo (unlisted)
- Dropbox (with public link)
- Any publicly accessible video hosting

## Video Script Template

Here's a simple script you can follow:

```
[0:00-0:15] Introduction
"Hi, this is a demo of Personal Dashboard, a smart home dashboard application 
that I use to display my smart home data and personal photos."

[0:15-0:45] Show Dashboard
"This is the main dashboard interface. It shows calendar events, weather, 
todo lists, and other smart home information."

[0:45-1:30] Google Photos Integration
"Now I'll show the Google Photos integration. I'll click the 'Connect Google Photos' 
button in the widget. This opens the Google OAuth consent screen where I grant 
read-only access to view my Google Photos library. After connecting, you can see 
my photos appear in the widget. The app only displays photos - it doesn't upload, 
modify, or delete anything. It's purely for viewing my personal photos in the dashboard."

[1:30-2:00] Scope Justification
"I need the photoslibrary.readonly scope because I want to display my personal 
photos in this dashboard widget. The app only reads photos to display them - 
no other actions are performed. This is a personal use case for my own photos."

[2:00-2:15] Conclusion
"This completes the demo. Personal Dashboard is a personal application that 
displays my own Google Photos for viewing in my smart home dashboard."
```

## Where to Submit the Video

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Click on **"Data access summary"** or **"Scope justifications"**
3. Find the section for **"Sensitive scopes"**
4. Look for **"Video link"** field
5. Paste your video URL (YouTube, Google Drive, etc.)
6. Click **"Save"**

## Important Notes

- **The video must be publicly accessible** (via link, even if unlisted)
- **Show the actual app in use** - don't use mockups or screenshots
- **Clearly demonstrate read-only access** - emphasize you're only viewing, not modifying
- **Keep it professional** but you don't need to be overly formal
- **Google may review the video** as part of the verification process

## After Submitting

1. Complete all other required fields in the verification form
2. Submit for verification
3. Wait for Google's review (typically 1-2 weeks)
4. Google may request additional information if needed

Good luck with your verification!

