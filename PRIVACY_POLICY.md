# Privacy Policy for Dakboard

**Last Updated:** December 24, 2024

## Introduction

Dakboard ("we", "our", or "us") is a smart home dashboard application that integrates with various services including Home Assistant and Google Photos. This Privacy Policy explains how we collect, use, and protect your information when you use our application.

## Information We Collect

### Data You Provide
- **Home Assistant Credentials**: We store your Home Assistant URL and access token locally in your browser (localStorage) to connect to your Home Assistant instance.
- **Google Photos Authentication**: When you connect Google Photos, we store OAuth tokens (access token and refresh token) locally in your browser to access your Google Photos library.

### Data We Access
- **Home Assistant Data**: We access your Home Assistant entities including:
  - Weather data
  - Calendar events
  - Todo lists
  - Garage door states
  - Alarm panel status
- **Google Photos**: We access your Google Photos library to display photos in the dashboard widget.

### Automatically Collected Data
- **Widget Layouts**: Your widget positions, sizes, and visibility preferences are stored locally in your browser.
- **Styling Preferences**: Custom styling settings for widgets and dashboard background are stored locally.

## How We Use Your Information

- **Dashboard Functionality**: To display your smart home data and Google Photos in the dashboard
- **Widget Management**: To save and restore your widget layouts and preferences
- **Authentication**: To maintain secure connections to Home Assistant and Google Photos

## Data Storage

- **Local Storage**: All data is stored locally in your browser's localStorage. No data is transmitted to our servers except:
  - API calls to your Home Assistant instance (using your configured URL and token)
  - API calls to Google Photos API (using OAuth tokens stored locally)
- **No Server-Side Storage**: We do not store any of your data on our servers. All data remains in your browser.

## Data Sharing

We do not share, sell, or distribute your personal information to third parties. The only external services we interact with are:
- **Home Assistant**: Direct API calls to your Home Assistant instance
- **Google Photos**: Direct API calls to Google Photos API using OAuth authentication

## Your Rights

You have the right to:
- **Access**: View all data stored in your browser's localStorage
- **Delete**: Clear all data by clearing your browser's localStorage
- **Disconnect**: Revoke access to Google Photos through your Google Account settings
- **Control**: Manage widget visibility and styling through the dashboard interface

## Security

- **Local Storage**: All data is stored locally in your browser, encrypted by your browser's security mechanisms
- **OAuth Tokens**: Google Photos tokens are stored securely in browser localStorage
- **No Transmission**: Except for API calls to your configured services, no data leaves your browser

## Third-Party Services

### Home Assistant
- We connect directly to your Home Assistant instance using the URL and token you provide
- We do not have access to your Home Assistant credentials beyond what you configure

### Google Photos
- We use Google OAuth 2.0 for authentication
- We only request read-only access to your Google Photos library (`photoslibrary.readonly` scope)
- You can revoke access at any time through your Google Account settings

## Cookies and Tracking

We do not use cookies or tracking technologies. All preferences are stored in browser localStorage.

## Children's Privacy

Our application is not intended for children under 13. We do not knowingly collect information from children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. The "Last Updated" date at the top indicates when changes were made.

## Contact Information

For questions about this Privacy Policy, please contact:
- **Email**: [Your Contact Email]
- **Application**: https://dakboard-smith.vercel.app

## Data Deletion

To delete all stored data:
1. Open your browser's Developer Tools (F12)
2. Go to the Application/Storage tab
3. Select "Local Storage" → Your site URL
4. Click "Clear All" or delete individual items

Alternatively, you can clear all site data through your browser settings.

---

**Note**: This application is a personal dashboard tool. All data processing occurs locally in your browser, and we do not maintain servers that store your personal information.

