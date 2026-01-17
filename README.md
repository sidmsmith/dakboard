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
- **Blank/Clip Art Widget** - Display emojis, images from Pixabay API, or rich text content with comprehensive styling options and 25+ fun fonts
- **Whiteboard Widget** - Interactive drawing canvas with per-instance state, title styling, temporary floating header, and immediate background color updates
- **Agenda Widget** - Single-day calendar view with event cards, date navigation, and clickable event details
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

### Version 3.3.0
- **Navigation Improvements** 🧭
  - **Increased Swipe/Drag Threshold**: Movement requirement increased from 50px to 75px
    - Reduces accidental page navigation when interacting with widgets
    - More intentional gestures required for page navigation
  - **Widget Interaction Exclusion**: Touch and mouse gestures starting within any widget are excluded from page navigation
    - Prevents page changes when drawing on whiteboard canvas
    - Prevents page changes when using scoreboard sliders or dragging teams
    - Prevents page changes when interacting with any interactive widget
    - Mouse drag already had this protection; now extended to touch swipes
- **Annotation UI Enhancements** ✏️
  - **Clear Button State**: Clear annotations (trash icon) button now disabled when annotations are hidden
    - Visual feedback: Opacity reduced to 0.5 when disabled
    - Cursor changes to `not-allowed` when disabled
    - Button automatically enables when annotations are made visible again
    - Prevents clearing annotations when they're not visible (better UX)

### Version 3.2.0
- **Annotation System Major Enhancements** ✏️
  - **Opacity Control**: New opacity slider (0-100%) for all annotation tools
    - Applies to Airbrush and both Highlighter tools
    - Settings persisted in localStorage across page refreshes
    - Real-time preview when adjusting opacity
  - **Airbrush Tool**: New annotation tool with same logic as highlighter but with opacity control
  - **Highlighter2 Tool**: Second highlighter implementation using stroke-based approach
    - Prevents opacity accumulation through stroke-based drawing
    - Separate canvas layer for optimal performance
  - **Original Highlighter Improvements**: Mask-based approach prevents opacity accumulation
    - Consistent 15% opacity (now adjustable via slider)
    - No visible overlapping or circles when drawing
  - **Eraser Enhancement**: Now works with both main canvas and highlighter2 canvas
  - **Drawing Prevention**: Cannot draw when annotations are hidden (eye icon off)
  - **Page-Specific Visibility**: Each page maintains its own annotation visibility state
    - Color-coded eye icon: Green when visible, Red when hidden
    - Visibility settings persist per page in localStorage
  - **Max Brush Size**: Increased from 50px to 75px for all tools
  - **Icon Updates**: 
    - Removed paintbrush tool (too similar to pen)
    - Updated eraser icon to look more like an eraser
    - Highlighter2 icon updated to distinctive cross/star pattern
    - All annotation icons made more colorful
- **Export/Import Enhancements** 📦
  - **Complete Annotation Export**: Now exports both main canvas and highlighter2Canvas strokes
  - **Annotation Visibility Export**: Page-specific annotation visibility settings included in exports
  - **Full Restoration**: All annotation data (main canvas, highlight2, visibility) restored on import
- **New Page Creation Improvements** 📄
  - **Clean State**: New pages start completely fresh with no inherited data
    - No widgets, styles, titles, or annotations
    - No cloned widgets
    - Standard widgets only with default names/titles in side panel
  - **Proper Page Naming**: New pages automatically named "Page X" where X is the page number
    - No longer inherits names from deleted pages
    - Page names properly renumbered when pages are deleted
- **UI/UX Improvements** 🎨
  - **Button Layout**: Edit Layout and Annotate buttons combined on same row in side panel
  - **LocalStorage Persistence**: Annotation color, brush size, and opacity settings saved and restored

### Version 0.12.0
- **Complete Export/Import Rewrite** 🔄
  - **Export Functionality**:
    - **Page Selection Dialog**: Choose to export "Current Page" or "All Pages" via modal dialog
    - **Complete Configuration Export**: Exports 100% of page data including:
      - Widget visibility (actual DOM state)
      - Widget positions and layouts (x, y, width, height, z-index, rotation)
      - All widget styles and configurations (text, titles, labels, colors, fonts, etc.)
      - Instance-specific data (stopwatch states, scoreboard configs, stoplight states)
      - Whiteboard drawings and settings
      - Page backgrounds and settings
      - **Annotations** (canvas drawings)
    - **Smart File Naming**: Single page exports use page name in filename (e.g., `dakboard-config-living-room-2024-01-15_14-30.json`)
  - **Import Functionality**:
    - **Append Mode**: Imported pages are appended to existing pages (no overwrite)
    - **Page Renumbering**: Imported pages automatically renumbered to continue from highest existing page index
    - **Instance ID Remapping**: All widget instance IDs are regenerated to avoid conflicts
    - **Complete Restoration**: All configurations, styles, positions, and data are restored exactly as exported
    - **Annotation Support**: Canvas annotations are fully exported and imported
  - **Backward Compatibility**: Supports both new format (with instance IDs) and legacy format

### Version 0.11.0
- **New Widget: Agenda** 📋
  - **Single-Day Calendar View**: Display one day's worth of calendar events in a clean, card-based layout
  - **Date Navigation**: Navigate to previous/next day with modern arrow controls
  - **Auto-Refresh**: Automatically resets to today's date at midnight
  - **Event Cards**: Each event displayed as a styled card with time, title, and location
  - **Clickable Events**: Click any event card to view full event details in a modal
  - **All-Day Events**: All-day events displayed at the top, sorted before timed events
  - **Multiple Instances**: Support for multiple independent agenda widgets across different pages
  - **Per-Instance Date State**: Each agenda widget maintains its own date independently
  - **Card Styling**: Comprehensive styling options for event cards in Advanced tab:
    - Card background color
    - Card border color and width
    - Card border radius
    - Card shadow (enable/disable)
    - Card hover border color
  - **Dynamic Text Color**: Text color automatically adjusts (light/dark) based on card background for optimal readability
  - **Reuses Calendar Data**: Efficiently reuses existing calendar events data - no additional API calls needed
  - **Full Integration**: Works seamlessly with existing widget management system (cloning, styling, positioning, rotation)

### Version 2.8
- **Blank Widget Text Mode** - Major enhancement to Blank widget!
  - **Display Modes**: Added three mutually exclusive display modes (Blank, Image, Text) selectable via dropdown in Advanced tab
  - **Rich Text Editing**: Full text editing capabilities with comprehensive styling options
    - Direct in-widget editing with real-time updates in Preview
    - 25 fun font families (Google Fonts) including Comic Sans MS, Bangers, Fredoka One, Nunito, Quicksand, Indie Flower, Permanent Marker, Chewy, Lobster, Pacifico, Bubblegum Sans, Poppins, Righteous, Bungee, Boogaloo, Creepster, Luckiest Guy, Amatic SC, Shadows Into Light, Kalam, Patrick Hand, Schoolbell, and more
    - Font preview in dropdown (font names displayed in their actual fonts)
    - Font size slider (8-72px)
    - Font weight options (Normal, Light, Semi-Bold, Bold)
    - Text color picker
    - Text alignment (Left, Center, Right, Justify)
    - Rich text formatting: Italic and Underline (Bold removed as it's redundant with font weight)
  - **Multi-line Support**: Text wraps automatically based on widget size with proper line breaks
  - **Backward Compatibility**: Existing widgets with images default to "Image" mode; new widgets default to "Blank" mode
  - **Preview Integration**: Real-time preview updates with proper text styling, including fixed underline display
  - **State Persistence**: All text content and styling saved per widget instance
  - **Cloning Support**: Text mode settings fully copied when cloning widgets
- **Whiteboard Widget Enhancements**:
  - **Independent Instance State**: Refactored to support multiple whiteboard instances with per-instance drawing state, colors, and brush sizes
  - **Title Styling**: Now supports title visibility, icon visibility, title text, font size, and font weight (alignment still disabled due to toolbar layout)
  - **Temporary Floating Header**: When title is hidden, a floating header appears for 5 seconds when drawing starts or controls are used, allowing quick configuration changes without permanently showing the header
    - Header appears above the widget (doesn't affect canvas size)
    - Auto-hides after 5 seconds of inactivity
    - Timer resets on any control interaction
  - **Background Color Updates**: Background color now updates immediately while preserving existing drawings using pixel replacement technology
  - **Cloning Fixes**: Whiteboard widgets now clone correctly with independent state, proper positioning, and clean initialization
  - **Drag/Resize Improvements**: Fixed drag and resize "jumping" issues when temporary header is visible by using style-based position calculations instead of getBoundingClientRect
- **Clone Widget System Improvements**:
  - **Reliable Source Widget Lookup**: Uses `getWidgetInstances()` to find source widget by fullId instead of guessing, ensuring clone-of-clone works correctly
  - **Improved Position Calculation**: Better fallback chain for position (style → localStorage → boundingRect → default) ensuring accurate positioning
  - **Position Preservation**: Layout saved before initialization to prevent `loadWidgetLayout()` from overriding clone position
  - **Intended Position Tracking**: Stores and restores intended position after initialization to ensure clones appear with correct offset
- **Edit Mode Enhancements**:
  - **Extended Drag Functionality**: Whiteboard canvas and blank widget textarea now draggable in edit mode (not just headers)
    - Canvas and textarea elements explicitly allow dragging when in edit mode
    - Matches behavior of other widgets like weather and scoreboard
  - **Visual Feedback**: Added move cursor (move icon) for whiteboard canvas and blank widget textarea in edit mode
    - Clear visual indication that these areas are draggable
    - Uses `cursor: move !important` to override default cursor styles
- **UI/UX Improvements**:
  - **Image Centering Fix**: Fixed blank widget image centering by using flex layout properly (flex: 1 instead of height: 100% for content area)
  - **Removed Verbose Logging**: Cleaned up all debug console.log statements for production-ready console output
- **Technical Fixes**:
  - Fixed position calculation to properly handle 0 as a valid position value
  - Improved class management when cloning (preserves existing classes, only updates instance ID)
  - Enhanced error handling for widget lookup and positioning

### Version 2.7
- **Move to Page Functionality** - Now fully functional!
  - **Fixed Dropdown Display**: Resolved issues with move-to-page dropdown not appearing
  - **Fixed Variable Scope**: Corrected JavaScript scope issues preventing dropdown from being appended to DOM
  - **Fixed CSS Positioning**: Added `position: relative` to widget control items for proper dropdown positioning
  - **Global Click Handler**: Added efficient global click handler to close dropdowns when clicking outside (prevents multiple event listeners)
  - **Page Descriptions**: Dropdown now displays "Page X: Description Y" format (e.g., "Page 1: Parker", "Page 3: Caroline")
  - **Smart Widget Handling**: 
    - Original widgets (instance-0) are hidden on source page when moved (preserved for potential restoration)
    - Clone widgets are completely removed from source page when moved
    - All configuration (styles, layout, position, rotation, widget-specific state) is copied to target page
    - Widget appears immediately on target page with full functionality

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

