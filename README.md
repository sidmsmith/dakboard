# Dakboard - Smart Home Dashboard

A customizable smart home dashboard designed for fixed displays (tablets/TVs) that integrates with Home Assistant, Google Calendar, Office365, and displays weather, todos, and home automation controls.

## 🎯 Features

- **Weekly Calendar View** - Display current week with navigation to next week
- **Monthly Calendar Modal** - Full month view in a modal overlay
- **Weather Display** - Pirate Weather integration via Home Assistant
- **Todo List** - Home Assistant todo list integration
- **Garage Door Controls** - 3 garage doors with open/closed status and click-to-toggle
- **Alarm Panel** - Current status display with click-to-toggle functionality
- **Air Compressor** - Monitor and control air compressor status
- **Dice Widget** - Interactive 3D dice with customizable colors and animations
- **Stopwatch Widget** - Full-featured stopwatch with start/pause/reset and customizable colors
- **Scoreboard Widget** - Team-based scoring with customizable icons, colors, confetti animations, and drag-and-drop team reordering
- **Stoplight Widget** - Interactive stoplight with clickable lights (red/amber/green), optional text labels with per-color styling, and state persistence
- **Blank/Clip Art Widget** - Display emojis or images from Pixabay API with shadow and tint color effects
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

## 📝 Changelog

### Version 2.6
- **New Widget: Stoplight** 🚦
  - **Interactive Light Control**: Click any color (red, amber/yellow, green) to illuminate it
  - **Single Active Light**: Only one light can be on at a time - clicking a different color switches to that color
  - **Toggle Functionality**: Click an illuminated light again to turn it off
  - **Read-Only in Preview**: State changes only allowed in normal view, preview mode is read-only
  - **Text Labels Support**: Optional text labels for each light color with per-color styling
    - Enable/disable text labels via Advanced tab checkbox
    - Three separate text inputs (one per color) - empty text hides the label for that line
    - Text displays on the right side of each light
    - Individual styling per color: font size, color, and font weight
  - **Visual Design**:
    - Vertical layout with realistic stoplight casing
    - Glow animations for active lights (red, amber, green)
    - Smooth transitions and hover effects
    - Responsive sizing with proper alignment
  - **Full Integration**:
    - State persistence (active light saved per instance)
    - Rotation support (same as Blank widget) with rotate handle in Edit Mode
    - Cloning functionality with state copying
    - Styling modal preview with read-only display
    - Works seamlessly with existing widget management system
  - **Advanced Styling Options**:
    - Per-color text label customization (font size, color, weight)
    - Conditional text display (only shows labels when text is present)
    - Automatic layout adjustment (centers when no labels, left-aligns with labels)

### Version 2.5
- **Widget Cloning Improvements**:
  - **Persistence Fix**: Fixed cloned widgets reappearing after page refresh by properly removing visibility and layout entries from localStorage when widgets are deleted
  - **Initial Display Fix**: Cloned widgets now display with correct styles (including hidden titles) immediately after creation, without requiring a page refresh
  - **Drag/Resize Fix**: Cloned widgets are now immediately draggable and resizable after creation by properly initializing drag/resize handlers and clearing flags
  - **Source Widget Positioning**: Fixed clone-of-clone positioning to offset from the actual source widget (the one being cloned) instead of always using instance-0
  - **Visibility Default**: Newly cloned widgets are now visible by default (eye icon selected in Manage Widgets panel)
  - **Rotation Copying**: Cloned widgets now properly copy rotation from their source widget, maintaining the same rotation angle
  - **Smart Offset**: Cloned widgets are positioned with an intelligent offset (right and down) from their source - at least 80px or 30% of widget dimensions, whichever is larger
- **Technical Fixes**:
  - Fixed JavaScript syntax errors in cloneWidget function (missing closing braces)
  - Fixed WIDGET_CONFIG reference errors in styling.js by adding proper safety checks
  - Improved layout saving to use style values instead of getBoundingClientRect for accurate position tracking, especially for rotated widgets

### Version 2.4
- **Widget Rotation**: Added rotation support for Blank/Clip Art widget with 15-degree snapping and visual rotate handle in Edit Mode
- **Z-index Controls**: Moved z-index controls (Bring Forward, Send Backward, Bring to Front, Send to Back) from side panel to individual widget headers, visible in Edit Mode
- **Clip Art Updates**:
  - Removed OpenClipart integration (API was unstable in beta)
  - Clip Art widget now supports emoji selector and Pixabay API integration only
  - Added image visibility checkbox to enable/disable image display
  - Improved color picker normalization (handles 3-digit hex colors)
- **Improvements**:
  - Fixed title visibility toggle for widgets without visible headers
  - Minimal edit header automatically appears for widgets with hidden titles in Edit Mode
  - Preview updates in real-time when image visibility is toggled

### Version 2.3
- **New Widgets**:
  - **Dice Widget**: Interactive 3D dice with customizable face and dot colors, click to roll animation
  - **Stopwatch Widget**: Full-featured stopwatch with start/pause/reset functionality, customizable text and button colors, state persistence
  - **Scoreboard Widget**: Team-based scoring system with customizable team names, icons, colors, target scores, increments, confetti animations, and drag-and-drop team reordering
  - **Blank/Clip Art Widget**: Display emojis or images with customizable shadow and tint colors
- **Clip Art Features**:
  - Emoji selector with 100+ fun emojis
  - Pixabay API integration with search filters (image type, category, colors)
  - Shadow color and image tint color customization
  - Enable/disable options for shadow and tint effects
- **Improvements**:
  - All new widgets support multiple pages with independent configurations
  - Widgets appear on top of z-layer when enabled
  - Preview window shows real-time updates for all widget configurations

### Version 2.2
- Added Air Compressor widget
- Enhanced title styling (visibility, alignment, editable text, icon toggle)
- Removed Google Photos integration
- Fixed thermostat dropdown visibility
- Restored missing widget functions

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

