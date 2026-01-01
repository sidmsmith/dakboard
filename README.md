# Dakboard - Smart Home Dashboard

A customizable smart home dashboard designed for fixed displays (tablets/TVs) that integrates with Home Assistant, Google Calendar, Office365, and displays weather, todos, and home automation controls.

## 🎯 Features

- **Weekly Calendar View** - Display current week with navigation to next week
- **Monthly Calendar Modal** - Full month view in a modal overlay
- **Weather Display** - Pirate Weather integration via Home Assistant
- **Todo List** - Home Assistant todo list integration
- **Garage Door Controls** - 3 garage doors with open/closed status and click-to-toggle
- **Alarm Panel** - Current status display with click-to-toggle functionality
- **Auto-refresh** - Updates every 30-60 seconds
- **Responsive Design** - Optimized for landscape tablets and TVs

## 📋 Layout Options

Four different layout options are available for you to choose from:

1. **Layout 1: Traditional Grid** (`layouts/layout-1-grid.html`)
   - 2-column grid layout
   - Calendar on left (spans 2 rows)
   - Weather, todos, garage, and alarm on right

2. **Layout 2: Single Column** (`layouts/layout-2-single-column.html`)
   - Single column with sections stacked
   - Calendar and weather side-by-side at top
   - Todo list in middle
   - Garage and alarm side-by-side at bottom

3. **Layout 3: Split Screen** (`layouts/layout-3-split-screen.html`)
   - Calendar full width at top
   - Widgets in 4-column grid at bottom

4. **Layout 4: Flexible Cards** (`layouts/layout-4-cards.html`)
   - Flexible grid system (12 columns)
   - Calendar large on left
   - Weather and todos stacked on right
   - Garage doors and alarm at bottom

## 🚀 Quick Start

### Local Development

For testing locally before deploying to Vercel:

1. **Create Local Config File**
   ```bash
   cp config.example.js config.js
   ```
   Then edit `config.js` with your HA credentials (see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md))

2. **Start Local Server**
   ```bash
   python -m http.server 8000
   ```

3. **Open Dashboard**
   ```
   http://localhost:8000
   ```

The dashboard will automatically use direct HA API calls when `config.js` is present.

### Production Deployment

1. **Update Configuration**
   - Open `app.js` and update the `CONFIG` object with your Home Assistant entity IDs and webhook IDs
   - See [SETUP.md](./SETUP.md) for detailed instructions on finding entity IDs

2. **Verify Environment Variables**
   - Ensure `HA_URL` and `HA_TOKEN` are set in your Vercel project settings
   - These should already be configured

3. **Deploy to Vercel**
   - Push code to GitHub (if not already done)
   - Vercel will auto-deploy
   - Or manually deploy: `vercel`

4. **Test the Dashboard**
   - Open your Vercel URL
   - Check browser console for any errors
   - Verify all widgets are loading data

### Current Status

✅ **Phase 1 Complete**: Layout selection (Layout 4 chosen)  
✅ **Phase 2 Complete**: Home Assistant integration
- Weather widget (Pirate Weather)
- Todo list widget
- Garage doors widget (3 doors with click-to-toggle)
- Alarm panel widget (status and toggle)
- Auto-refresh every 30 seconds

🔄 **Next Phase**: Calendar integration (Google Calendar & Office365)

## ⚠️ Version 0.6.0 Changes

**Google Photos Widget Removed**: The Google Photos widget has been removed due to Google security restrictions that required re-authentication and photo re-selection every hour, making it impractical for a dashboard application. All Google Photos code and API endpoints have been removed from the codebase.

## 📁 Project Structure

```
dakboard/
├── api/                          # Vercel serverless functions (to be created)
├── layouts/                      # Layout options
│   ├── layout-1-grid.html
│   ├── layout-2-single-column.html
│   ├── layout-3-split-screen.html
│   └── layout-4-cards.html
├── index.html                    # Layout selection page
├── IMPLEMENTATION_PLAN.md        # Detailed implementation plan
├── package.json
├── vercel.json
└── README.md                     # This file
```

## 🔧 Technology Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Vercel serverless functions
- **Data Sources**:
  - Home Assistant REST API
  - Google Calendar API
  - Office365 Calendar API

## 📝 Next Steps

1. **Review layout options** and select your preferred design
2. **Review implementation plan** in `IMPLEMENTATION_PLAN.md`
3. **Set up Home Assistant** (see Phase 2 in implementation plan)
4. **Begin implementation** starting with HA integration

## 📖 Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed phase-by-phase implementation guide

## 🎨 Design Notes

- Dark theme optimized for always-on displays
- Large, readable fonts for distance viewing
- High contrast for visibility
- Smooth transitions and hover effects
- Responsive grid layouts

## 📄 License

Private project.

