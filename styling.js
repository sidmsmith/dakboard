// Widget Styling System
// Handles dynamic styling of widgets and dashboard background
//
// SPECIAL WIDGET CASES - Title Styling:
// =====================================
// Calendar Widget: Has custom header layout with month-view button (opens month modal) and calendar icon.
//                  Title visibility, editable text, and alignment are disabled to preserve functional elements.
//                  Still supports title color, font size, and font weight styling.
//
// Whiteboard Widget: Has custom header layout with toolbar (clear button, color pickers, brush size controls).
//                    Title visibility, editable text, and alignment are disabled to preserve functional elements.
//                    Still supports title color, font size, and font weight styling.

let currentWidgetId = null;
let currentStyles = {};
let applyToAllFlags = {};
let shadowSameAsBorder = false; // Track "Same as Border" checkbox state

// Helper function to convert hex color to rgba with opacity
function hexToRgba(hex, opacity) {
  // Remove # if present
  hex = hex.replace('#', '');
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

// Initialize styling system
function initStyling() {
  // Close modal handlers
  document.getElementById('close-styling-modal').addEventListener('click', closeStylingModal);
  document.getElementById('styling-modal').addEventListener('click', (e) => {
    if (e.target.id === 'styling-modal') {
      closeStylingModal();
    }
  });

  // Tab switching
  document.querySelectorAll('.styling-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Apply button
  document.getElementById('apply-styles-btn').addEventListener('click', applyStyles);
  
  // Reset button
  document.getElementById('reset-styles-btn').addEventListener('click', resetStyles);
  
  // Save theme button
  document.getElementById('save-theme-btn').addEventListener('click', saveTheme);

  // Initialize background modal
  initBackgroundModal();

  // Load saved styles
  loadStyles();
}

// Open styling modal for a widget
function openStylingModal(widgetId) {
  currentWidgetId = widgetId;
  
  // Find widget on current page
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
    ? window.currentPageIndex 
    : 0;
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  const widget = currentPage ? currentPage.querySelector(`.${widgetId}`) : document.querySelector(`.${widgetId}`);
  if (!widget) return;

  const config = WIDGET_CONFIG[widgetId];
  document.getElementById('styling-modal-title').textContent = `🎨 Style Widget: ${config.name}`;
  document.getElementById('styling-preview-title').textContent = config.icon + ' ' + config.name;

  // Load current styles
  loadWidgetStyles(widgetId);
  

  // Show modal
  document.getElementById('styling-modal').classList.add('active');
  
  // Switch to first tab
  switchTab('background');
  
  // Small delay to ensure DOM is ready, then update preview
  setTimeout(() => {
    updatePreview();
  }, 100);
}

// Close styling modal
function closeStylingModal() {
  document.getElementById('styling-modal').classList.remove('active');
  currentWidgetId = null;
  currentStyles = {};
  applyToAllFlags = {};
}

// Switch tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.styling-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Load tab content
  const content = document.getElementById('styling-tab-content');
  content.innerHTML = generateTabContent(tabName);
  
  // Attach event listeners
  attachTabEventListeners(tabName);
  
  // Update preview
  updatePreview();
}

// Generate tab content
function generateTabContent(tabName) {
  switch(tabName) {
    case 'background':
      return generateBackgroundTab();
    case 'border':
      return generateBorderTab();
    case 'shadow':
      return generateShadowTab();
    case 'title':
      return generateTitleTab();
    case 'layout':
      return generateLayoutTab();
    case 'advanced':
      return generateAdvancedTab();
    default:
      return '';
  }
}

// Generate Background Tab (for widget background styling)
function generateBackgroundTab() {
  const bgColor = currentStyles.backgroundColor || '#2a2a2a';
  const bgType = currentStyles.backgroundType || 'solid';
  const opacity = currentStyles.opacity !== undefined ? currentStyles.opacity : 100;
  const gradientColor1 = currentStyles.gradientColor1 || '#2a2a2a';
  const gradientColor2 = currentStyles.gradientColor2 || '#3a3a3a';
  const gradientDirection = currentStyles.gradientDirection || 'to bottom';
  const backgroundImageUrl = currentStyles.backgroundImageUrl || '';
  const backgroundRepeat = currentStyles.backgroundRepeat || 'no-repeat';
  const backgroundPosition = currentStyles.backgroundPosition || 'center';
  const backgroundSize = currentStyles.backgroundSize || 'cover';
  const backgroundImageOpacity = currentStyles.backgroundImageOpacity !== undefined ? currentStyles.backgroundImageOpacity : 100;
  const patternType = currentStyles.patternType || 'dots';
  const patternColor = currentStyles.patternColor || '#3a3a3a';
  const patternSize = currentStyles.patternSize !== undefined ? currentStyles.patternSize : 20;
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Background Type</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Type</label>
          <div class="styling-form-control">
            <select id="bg-type">
              <option value="solid" ${bgType === 'solid' ? 'selected' : ''}>Solid Color</option>
              <option value="transparent" ${bgType === 'transparent' ? 'selected' : ''}>Transparent</option>
              <option value="gradient" ${bgType === 'gradient' ? 'selected' : ''}>Gradient</option>
              <option value="pattern" ${bgType === 'pattern' ? 'selected' : ''}>Pattern</option>
              <option value="image" ${bgType === 'image' ? 'selected' : ''}>Image (URL)</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-type-apply-all" ${applyToAllFlags.backgroundType ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Solid Color Section -->
    <div class="styling-form-section" id="widget-bg-solid-section" style="display: ${bgType === 'solid' ? 'block' : 'none'};">
      <div class="styling-section-title">Background Color</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <input type="color" id="bg-color" value="${bgColor}">
            <input type="text" id="bg-color-text" value="${bgColor}" placeholder="#2a2a2a">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-color-apply-all" ${applyToAllFlags.backgroundColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Gradient Section -->
    <div class="styling-form-section" id="widget-bg-gradient-section" style="display: ${bgType === 'gradient' ? 'block' : 'none'};">
      <div class="styling-section-title">Gradient</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Color 1</label>
          <div class="styling-form-control">
            <input type="color" id="bg-gradient-color1" value="${gradientColor1}">
            <input type="text" id="bg-gradient-color1-text" value="${gradientColor1}">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-gradient-color1-apply-all" ${applyToAllFlags.gradientColor1 ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Color 2</label>
          <div class="styling-form-control">
            <input type="color" id="bg-gradient-color2" value="${gradientColor2}">
            <input type="text" id="bg-gradient-color2-text" value="${gradientColor2}">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-gradient-color2-apply-all" ${applyToAllFlags.gradientColor2 ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Direction</label>
          <div class="styling-form-control">
            <select id="bg-gradient-direction">
              <option value="to bottom" ${gradientDirection === 'to bottom' ? 'selected' : ''}>Top to Bottom</option>
              <option value="to right" ${gradientDirection === 'to right' ? 'selected' : ''}>Left to Right</option>
              <option value="to bottom right" ${gradientDirection === 'to bottom right' ? 'selected' : ''}>Diagonal (Top-Left to Bottom-Right)</option>
              <option value="to top right" ${gradientDirection === 'to top right' ? 'selected' : ''}>Diagonal (Bottom-Left to Top-Right)</option>
              <option value="135deg" ${gradientDirection === '135deg' ? 'selected' : ''}>135° Angle</option>
              <option value="45deg" ${gradientDirection === '45deg' ? 'selected' : ''}>45° Angle</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-gradient-direction-apply-all" ${applyToAllFlags.gradientDirection ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Section -->
    <div class="styling-form-section" id="widget-bg-image-section" style="display: ${bgType === 'image' ? 'block' : 'none'};">
      <div class="styling-section-title">Background Image</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Image URL</label>
          <div class="styling-form-control">
            <input type="text" id="bg-image-url" value="${backgroundImageUrl}" placeholder="https://example.com/image.jpg">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-image-url-apply-all" ${applyToAllFlags.backgroundImageUrl ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Repeat</label>
          <div class="styling-form-control">
            <select id="bg-image-repeat">
              <option value="no-repeat" ${backgroundRepeat === 'no-repeat' ? 'selected' : ''}>No Repeat</option>
              <option value="repeat" ${backgroundRepeat === 'repeat' ? 'selected' : ''}>Repeat</option>
              <option value="repeat-x" ${backgroundRepeat === 'repeat-x' ? 'selected' : ''}>Repeat X</option>
              <option value="repeat-y" ${backgroundRepeat === 'repeat-y' ? 'selected' : ''}>Repeat Y</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-image-repeat-apply-all" ${applyToAllFlags.backgroundRepeat ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Position</label>
          <div class="styling-form-control">
            <select id="bg-image-position">
              <option value="center" ${backgroundPosition === 'center' ? 'selected' : ''}>Center</option>
              <option value="top" ${backgroundPosition === 'top' ? 'selected' : ''}>Top</option>
              <option value="bottom" ${backgroundPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
              <option value="left" ${backgroundPosition === 'left' ? 'selected' : ''}>Left</option>
              <option value="right" ${backgroundPosition === 'right' ? 'selected' : ''}>Right</option>
              <option value="top left" ${backgroundPosition === 'top left' ? 'selected' : ''}>Top Left</option>
              <option value="top right" ${backgroundPosition === 'top right' ? 'selected' : ''}>Top Right</option>
              <option value="bottom left" ${backgroundPosition === 'bottom left' ? 'selected' : ''}>Bottom Left</option>
              <option value="bottom right" ${backgroundPosition === 'bottom right' ? 'selected' : ''}>Bottom Right</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-image-position-apply-all" ${applyToAllFlags.backgroundPosition ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Size</label>
          <div class="styling-form-control">
            <select id="bg-image-size">
              <option value="cover" ${backgroundSize === 'cover' ? 'selected' : ''}>Cover</option>
              <option value="contain" ${backgroundSize === 'contain' ? 'selected' : ''}>Contain</option>
              <option value="auto" ${backgroundSize === 'auto' ? 'selected' : ''}>Auto</option>
              <option value="100% 100%" ${backgroundSize === '100% 100%' ? 'selected' : ''}>Stretch</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-image-size-apply-all" ${applyToAllFlags.backgroundSize ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Opacity</label>
          <div class="styling-form-control">
            <input type="range" id="bg-image-opacity" min="0" max="100" value="${backgroundImageOpacity}">
            <span class="styling-range-value" id="bg-image-opacity-value">${backgroundImageOpacity}%</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-image-opacity-apply-all" ${applyToAllFlags.backgroundImageOpacity ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Pattern Section -->
    <div class="styling-form-section" id="widget-bg-pattern-section" style="display: ${bgType === 'pattern' ? 'block' : 'none'};">
      <div class="styling-section-title">Pattern</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Pattern</label>
          <div class="styling-form-control">
            <select id="bg-pattern-type">
              <option value="dots" ${patternType === 'dots' ? 'selected' : ''}>Dots</option>
              <option value="grid" ${patternType === 'grid' ? 'selected' : ''}>Grid</option>
              <option value="lines" ${patternType === 'lines' ? 'selected' : ''}>Horizontal Lines</option>
              <option value="diagonal" ${patternType === 'diagonal' ? 'selected' : ''}>Diagonal Lines</option>
              <option value="crosshatch" ${patternType === 'crosshatch' ? 'selected' : ''}>Crosshatch</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-pattern-type-apply-all" ${applyToAllFlags.patternType ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <input type="color" id="bg-pattern-color" value="${patternColor}">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-pattern-color-apply-all" ${applyToAllFlags.patternColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Size</label>
          <div class="styling-form-control">
            <input type="range" id="bg-pattern-size" min="5" max="50" value="${patternSize}">
            <span class="styling-range-value" id="bg-pattern-size-value">${patternSize}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-pattern-size-apply-all" ${applyToAllFlags.patternSize ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="styling-form-section">
      <div class="styling-section-title">Transparency</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Opacity</label>
          <div class="styling-form-control">
            <input type="range" id="opacity" min="0" max="100" value="${opacity}">
            <span class="styling-range-value" id="opacity-value">${opacity}%</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="opacity-apply-all" ${applyToAllFlags.opacity ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate Border Tab
function generateBorderTab() {
  const borderColor = currentStyles.borderColor || '#3a3a3a';
  const borderWidth = currentStyles.borderWidth !== undefined ? currentStyles.borderWidth : 0;
  const borderStyle = currentStyles.borderStyle || 'none';
  const borderRadius = currentStyles.borderRadius !== undefined ? currentStyles.borderRadius : 12;
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Border</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <input type="color" id="border-color" value="${borderColor}">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="border-color-apply-all" ${applyToAllFlags.borderColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Width</label>
          <div class="styling-form-control">
            <input type="range" id="border-width" min="0" max="20" value="${borderWidth}">
            <span class="styling-range-value" id="border-width-value">${borderWidth}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="border-width-apply-all" ${applyToAllFlags.borderWidth ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Style</label>
          <div class="styling-form-control">
            <select id="border-style">
              <option value="none" ${borderStyle === 'none' ? 'selected' : ''}>None</option>
              <option value="solid" ${borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
              <option value="dashed" ${borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
              <option value="dotted" ${borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
              <option value="double" ${borderStyle === 'double' ? 'selected' : ''}>Double</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="border-style-apply-all" ${applyToAllFlags.borderStyle ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Radius</label>
          <div class="styling-form-control">
            <input type="range" id="border-radius" min="0" max="50" value="${borderRadius}">
            <span class="styling-range-value" id="border-radius-value">${borderRadius}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="border-radius-apply-all" ${applyToAllFlags.borderRadius ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate Shadow Tab
function generateShadowTab() {
  const shadowColor = currentStyles.shadowColor || '#000000';
  const borderColor = currentStyles.borderColor || '#000000';
  const shadowBlur = currentStyles.shadowBlur !== undefined ? currentStyles.shadowBlur : 6;
  const shadowX = currentStyles.shadowX !== undefined ? currentStyles.shadowX : 0;
  const shadowY = currentStyles.shadowY !== undefined ? currentStyles.shadowY : 4;
  const shadowSpread = currentStyles.shadowSpread !== undefined ? currentStyles.shadowSpread : 0;
  
  // Check if shadow color matches border color, or if checkbox was previously checked
  const sameAsBorder = shadowSameAsBorder || shadowColor === borderColor;
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Box Shadow</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Preset</label>
          <div class="styling-form-control">
            <div class="styling-preset-buttons">
              <button class="styling-preset-btn" data-preset="none">None</button>
              <button class="styling-preset-btn" data-preset="subtle">Subtle</button>
              <button class="styling-preset-btn" data-preset="medium">Medium</button>
              <button class="styling-preset-btn" data-preset="strong">Strong</button>
            </div>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="shadow-color-same-as-border" ${sameAsBorder ? 'checked' : ''}> Same as Border
            </label>
            <input type="color" id="shadow-color" value="${sameAsBorder ? borderColor : shadowColor}" ${sameAsBorder ? 'disabled' : ''}>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="shadow-color-apply-all" ${applyToAllFlags.shadowColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Blur</label>
          <div class="styling-form-control">
            <input type="range" id="shadow-blur" min="0" max="50" value="${shadowBlur}">
            <span class="styling-range-value" id="shadow-blur-value">${shadowBlur}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="shadow-blur-apply-all" ${applyToAllFlags.shadowBlur ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Offset X</label>
          <div class="styling-form-control">
            <input type="range" id="shadow-x" min="-20" max="20" value="${shadowX}">
            <span class="styling-range-value" id="shadow-x-value">${shadowX}px</span>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Offset Y</label>
          <div class="styling-form-control">
            <input type="range" id="shadow-y" min="-20" max="20" value="${shadowY}">
            <span class="styling-range-value" id="shadow-y-value">${shadowY}px</span>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Spread</label>
          <div class="styling-form-control">
            <input type="range" id="shadow-spread" min="-10" max="10" value="${shadowSpread}">
            <span class="styling-range-value" id="shadow-spread-value">${shadowSpread}px</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate Text Tab
function generateTitleTab() {
  // SPECIAL CASE: Calendar and Whiteboard widgets have custom header layouts with functional elements
  // - Calendar widget: Has month-view button in header (opens month modal) and custom calendar icon
  // - Whiteboard widget: Has toolbar in header (clear button, color pickers, brush size controls)
  // These widgets are excluded from standard title styling (visibility, alignment, editable text)
  // to preserve their functional elements. They still support title color, font size, and font weight styling.
  
  // Get current widget's default title from WIDGET_CONFIG
  const defaultTitle = WIDGET_CONFIG[currentWidgetId]?.name || 'Widget';
  const defaultIcon = WIDGET_CONFIG[currentWidgetId]?.icon || '';
  const titleText = currentStyles.titleText !== undefined ? currentStyles.titleText : defaultTitle;
  const titleVisible = currentStyles.titleVisible !== undefined ? currentStyles.titleVisible : true;
  const titleIconVisible = currentStyles.titleIconVisible !== undefined ? currentStyles.titleIconVisible : true;
  const titleAlignment = currentStyles.titleAlignment || 'left';
  const isSpecialWidget = currentWidgetId === 'calendar-widget' || currentWidgetId === 'whiteboard-widget';
  const textColor = currentStyles.textColor || '#fff';
  const fontSize = currentStyles.fontSize !== undefined ? currentStyles.fontSize : 18;
  const fontWeight = currentStyles.fontWeight || '600';
  // Default to dynamic (true) if textColorDynamic is not set, or if textColor is not explicitly set
  const textColorDynamic = currentStyles.textColorDynamic !== undefined 
    ? currentStyles.textColorDynamic 
    : (currentStyles.textColor === undefined || currentStyles.textColor === '#fff');
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Title Styling</div>
      <div class="styling-form-group">
        ${isSpecialWidget ? `
        <div class="styling-form-row" style="background: rgba(74, 144, 226, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 16px; border-left: 3px solid #4a90e2;">
          <div style="font-size: 12px; color: #aaa; line-height: 1.4;">
            <strong style="color: #4a90e2;">Note:</strong> ${currentWidgetId === 'calendar-widget' 
              ? 'Calendar widget has a custom header with month-view button and calendar icon. Title visibility, text editing, and alignment are not available for this widget to preserve its functional elements.'
              : 'Whiteboard widget has a custom header with toolbar controls (clear, color pickers, brush size). Title visibility, text editing, and alignment are not available for this widget to preserve its functional elements.'}
          </div>
        </div>
        ` : ''}
        <div class="styling-form-row">
          <label class="styling-form-label">Visible</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-visible" ${titleVisible ? 'checked' : ''} ${isSpecialWidget ? 'disabled' : ''}> Show title
            </label>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-visible-apply-all" ${applyToAllFlags.titleVisible ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Show Icon</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-icon-visible" ${titleIconVisible ? 'checked' : ''} ${isSpecialWidget ? 'disabled' : ''}> Show icon
            </label>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-icon-visible-apply-all" ${applyToAllFlags.titleIconVisible ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Title Text</label>
          <div class="styling-form-control">
            <input type="text" id="title-text" value="${titleText}" placeholder="${defaultTitle}" ${isSpecialWidget ? 'disabled' : ''}>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-text-apply-all" ${applyToAllFlags.titleText ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Alignment</label>
          <div class="styling-form-control">
            <select id="title-alignment" ${isSpecialWidget ? 'disabled' : ''}>
              <option value="left" ${titleAlignment === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${titleAlignment === 'center' ? 'selected' : ''}>Center</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="title-alignment-apply-all" ${applyToAllFlags.titleAlignment ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox" style="margin-right: 12px;">
              <input type="checkbox" id="text-color-dynamic" ${textColorDynamic ? 'checked' : ''}> Dynamic
            </label>
            <input type="color" id="text-color" value="${textColor}" ${textColorDynamic ? 'disabled' : ''}>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="text-color-apply-all" ${applyToAllFlags.textColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Font Size</label>
          <div class="styling-form-control">
            <input type="range" id="font-size" min="10" max="32" value="${fontSize}">
            <span class="styling-range-value" id="font-size-value">${fontSize}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="font-size-apply-all" ${applyToAllFlags.fontSize ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Font Weight</label>
          <div class="styling-form-control">
            <select id="font-weight">
              <option value="300" ${fontWeight === '300' ? 'selected' : ''}>Light (300)</option>
              <option value="400" ${fontWeight === '400' ? 'selected' : ''}>Normal (400)</option>
              <option value="500" ${fontWeight === '500' ? 'selected' : ''}>Medium (500)</option>
              <option value="600" ${fontWeight === '600' ? 'selected' : ''}>Semi-Bold (600)</option>
              <option value="700" ${fontWeight === '700' ? 'selected' : ''}>Bold (700)</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="font-weight-apply-all" ${applyToAllFlags.fontWeight ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate Layout Tab
function generateLayoutTab() {
  const padding = currentStyles.padding !== undefined ? currentStyles.padding : 24;
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Padding</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Padding</label>
          <div class="styling-form-control">
            <input type="range" id="padding" min="0" max="50" value="${padding}">
            <span class="styling-range-value" id="padding-value">${padding}px</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="padding-apply-all" ${applyToAllFlags.padding ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate Advanced Tab
function generateAdvancedTab() {
  const widgetOpacity = currentStyles.widgetOpacity !== undefined ? currentStyles.widgetOpacity : 100;
  const diceFaceColor = currentStyles.diceFaceColor || '#4a90e2';
  const diceDotColor = currentStyles.diceDotColor || '#ffffff';
  const stopwatchTextColor = currentStyles.stopwatchTextColor || '#1a1a1a';
  const stopwatchPlayButtonColor = currentStyles.stopwatchPlayButtonColor || '#4a90e2';
  const stopwatchResetButtonColor = currentStyles.stopwatchResetButtonColor || '#ffffff';
  const isDiceWidget = currentWidgetId === 'dice-widget';
  const isStopwatchWidget = currentWidgetId === 'stopwatch-widget';
  const isScoreboardWidget = currentWidgetId === 'scoreboard-widget';
  const isBlankWidget = currentWidgetId === 'blank-widget';
  const clipArtEmoji = currentStyles.clipArtEmoji || '🎨';
  const clipArtColor = currentStyles.clipArtColor || '#4a90e2';
  
  // Load scoreboard config if this is a scoreboard widget
  let scoreboardConfig = {
    teams: [
      { id: 'team1', name: 'Team 1', icon: '🚀', sliderColor: '#9b59b6' },
      { id: 'team2', name: 'Team 2', icon: '🦄', sliderColor: '#e74c3c' }
    ],
    targetScore: 10,
    increment: 1
  };
  
  if (isScoreboardWidget && currentStyles.scoreboardConfig) {
    try {
      scoreboardConfig = typeof currentStyles.scoreboardConfig === 'string' 
        ? JSON.parse(currentStyles.scoreboardConfig)
        : currentStyles.scoreboardConfig;
      // Ensure minimum 2 teams
      if (!scoreboardConfig.teams || scoreboardConfig.teams.length < 2) {
        scoreboardConfig.teams = [
          { id: 'team1', name: 'Team 1', icon: '🚀', sliderColor: '#9b59b6' },
          { id: 'team2', name: 'Team 2', icon: '🦄', sliderColor: '#e74c3c' }
        ];
      }
    } catch (e) {
      console.error('Error parsing scoreboard config:', e);
    }
  }
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Widget Opacity</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Opacity</label>
          <div class="styling-form-control">
            <input type="range" id="widget-opacity" min="0" max="100" value="${widgetOpacity}">
            <span class="styling-range-value" id="widget-opacity-value">${widgetOpacity}%</span>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="widget-opacity-apply-all" ${applyToAllFlags.widgetOpacity ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
    ${isDiceWidget ? `
    <div class="styling-form-section">
      <div class="styling-section-title">Dice Colors</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Dice Face Color</label>
          <div class="styling-form-control">
            <input type="color" id="dice-face-color" value="${diceFaceColor}">
            <input type="text" id="dice-face-color-text" value="${diceFaceColor}" pattern="^#[0-9A-F]{6}$" placeholder="#4a90e2">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="dice-face-color-apply-all" ${applyToAllFlags.diceFaceColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Dot Color</label>
          <div class="styling-form-control">
            <input type="color" id="dice-dot-color" value="${diceDotColor}">
            <input type="text" id="dice-dot-color-text" value="${diceDotColor}" pattern="^#[0-9A-F]{6}$" placeholder="#ffffff">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="dice-dot-color-apply-all" ${applyToAllFlags.diceDotColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    ${isStopwatchWidget ? `
    <div class="styling-form-section">
      <div class="styling-section-title">Stopwatch Colors</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Text Color</label>
          <div class="styling-form-control">
            <input type="color" id="stopwatch-text-color" value="${stopwatchTextColor}">
            <input type="text" id="stopwatch-text-color-text" value="${stopwatchTextColor}" pattern="^#[0-9A-F]{6}$" placeholder="#1a1a1a">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="stopwatch-text-color-apply-all" ${applyToAllFlags.stopwatchTextColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Play/Pause Button Color</label>
          <div class="styling-form-control">
            <input type="color" id="stopwatch-play-button-color" value="${stopwatchPlayButtonColor}">
            <input type="text" id="stopwatch-play-button-color-text" value="${stopwatchPlayButtonColor}" pattern="^#[0-9A-F]{6}$" placeholder="#4a90e2">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="stopwatch-play-button-color-apply-all" ${applyToAllFlags.stopwatchPlayButtonColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Reset Button Color</label>
          <div class="styling-form-control">
            <input type="color" id="stopwatch-reset-button-color" value="${stopwatchResetButtonColor}">
            <input type="text" id="stopwatch-reset-button-color-text" value="${stopwatchResetButtonColor}" pattern="^#[0-9A-F]{6}$" placeholder="#ffffff">
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="stopwatch-reset-button-color-apply-all" ${applyToAllFlags.stopwatchResetButtonColor ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    ${isScoreboardWidget ? `
    <div class="styling-form-section">
      <div class="styling-section-title">Scoreboard Configuration</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Target Score</label>
          <div class="styling-form-control">
            <input type="number" id="scoreboard-target-score" min="1" value="${scoreboardConfig.targetScore || 10}">
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Increment</label>
          <div class="styling-form-control">
            <select id="scoreboard-increment">
              <option value="1" ${scoreboardConfig.increment === 1 ? 'selected' : ''}>1</option>
              <option value="5" ${scoreboardConfig.increment === 5 ? 'selected' : ''}>5</option>
              <option value="10" ${scoreboardConfig.increment === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${scoreboardConfig.increment === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${scoreboardConfig.increment === 50 ? 'selected' : ''}>50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div class="styling-form-section">
      <div class="styling-section-title">Teams</div>
      <div class="styling-form-group" id="scoreboard-teams-list">
        ${scoreboardConfig.teams.map((team, index) => `
          <div class="scoreboard-team-config" data-team-index="${index}" draggable="true">
            <div class="styling-form-row">
              <label class="styling-form-label">Team ${index + 1}</label>
              <div class="styling-form-control" style="display: flex; gap: 8px; align-items: center;">
                <span class="scoreboard-drag-handle" style="cursor: move; font-size: 18px; opacity: 0.6; user-select: none;" title="Drag to reorder">☰</span>
                <input type="text" class="scoreboard-team-name-input" value="${team.name}" placeholder="Team Name">
                <select class="scoreboard-team-icon-select">
                  ${typeof window !== 'undefined' && window.SCOREBOARD_ICONS ? window.SCOREBOARD_ICONS.map(icon => 
                    `<option value="${icon.value}" ${team.icon === icon.value ? 'selected' : ''}>${icon.value} ${icon.label}</option>`
                  ).join('') : ''}
                </select>
                <input type="color" class="scoreboard-team-slider-color" value="${team.sliderColor || '#9b59b6'}">
                ${scoreboardConfig.teams.length > 2 ? `<button type="button" class="scoreboard-remove-team-btn" data-team-index="${index}">Remove</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="styling-form-row">
        <div class="styling-form-control">
          <button type="button" id="scoreboard-add-team-btn" class="styling-btn-secondary">+ Add Team</button>
        </div>
      </div>
    </div>
    ` : ''}
    ${isBlankWidget ? `
    <div class="styling-form-section">
      <div class="styling-section-title">Image</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">
            <input type="checkbox" id="clipart-visible" ${currentStyles.clipArtVisible !== false ? 'checked' : ''} style="margin-right: 8px;"> Show Image
          </label>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Select Clip Art</label>
          <div class="styling-form-control">
            <div style="display: flex; gap: 8px;">
              <button type="button" id="clipart-select-btn" class="styling-btn-secondary" style="flex: 1;" ${currentStyles.clipArtVisible === false ? 'disabled' : ''}>Choose Emoji</button>
              <button type="button" id="clipart-pixabay-btn" class="styling-btn-secondary" style="flex: 1;" ${currentStyles.clipArtVisible === false ? 'disabled' : ''}>Pixabay</button>
              <button type="button" id="clipart-openclipart-btn" class="styling-btn-secondary" style="flex: 1;" ${currentStyles.clipArtVisible === false ? 'disabled' : ''}>OpenClipart</button>
            </div>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Shadow Color</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox" style="margin-bottom: 8px; display: block;">
              <input type="checkbox" id="clipart-shadow-enabled" ${currentStyles.clipArtShadowEnabled !== false ? 'checked' : ''}> Enable Shadow
            </label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="color" id="clipart-color" value="${clipArtColor}" ${currentStyles.clipArtShadowEnabled === false ? 'disabled' : ''} style="width: 50px; height: 40px; padding: 2px; border-radius: 4px;">
              <input type="text" id="clipart-color-text" value="${clipArtColor}" pattern="^#[0-9A-F]{6}$" placeholder="#4a90e2" ${currentStyles.clipArtShadowEnabled === false ? 'disabled' : ''} style="width: 80px; padding: 6px 8px; border-radius: 4px; border: 1px solid #4a4a4a; background: #1a1a1a; color: #e0e0e0; font-size: 12px;">
              <label class="styling-apply-all-checkbox" style="margin: 0;">
                <input type="checkbox" id="clipart-color-apply-all" ${applyToAllFlags.clipArtColor ? 'checked' : ''}> Apply to all
              </label>
            </div>
          </div>
        </div>
        <div class="styling-form-row">
          <label class="styling-form-label">Image Color (Tint)</label>
          <div class="styling-form-control">
            <label class="styling-apply-all-checkbox" style="margin-bottom: 8px; display: block;">
              <input type="checkbox" id="clipart-tint-enabled" ${currentStyles.clipArtTintEnabled !== false ? 'checked' : ''}> Enable Tint
            </label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="color" id="clipart-tint-color" value="${currentStyles.clipArtTintColor || '#ffffff'}" ${currentStyles.clipArtTintEnabled === false ? 'disabled' : ''} style="width: 50px; height: 40px; padding: 2px; border-radius: 4px;">
              <input type="text" id="clipart-tint-color-text" value="${currentStyles.clipArtTintColor || '#ffffff'}" pattern="^#[0-9A-F]{6}$" placeholder="#ffffff" ${currentStyles.clipArtTintEnabled === false ? 'disabled' : ''} style="width: 80px; padding: 6px 8px; border-radius: 4px; border: 1px solid #4a4a4a; background: #1a1a1a; color: #e0e0e0; font-size: 12px;">
              <label class="styling-apply-all-checkbox" style="margin: 0;">
                <input type="checkbox" id="clipart-tint-color-apply-all" ${applyToAllFlags.clipArtTintColor ? 'checked' : ''}> Apply to all
              </label>
            </div>
            <div style="font-size: 11px; color: #888; margin-top: 5px;">Makes images look like stickers. Use white for classic sticker look.</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

// Attach event listeners for current tab
function attachTabEventListeners(tabName) {
  if (tabName === 'background') {
    // Background type selector - must be first to set initial visibility
    // Scope all queries to the styling modal to avoid conflicts
    const stylingModal = document.getElementById('styling-modal');
    if (!stylingModal) return;
    
    const bgType = stylingModal.querySelector('#bg-type');
    if (bgType) {
      // Set initial section visibility based on current value
      const initialType = bgType.value || currentStyles.backgroundType || 'solid';
      showWidgetBackgroundSection(initialType);
      
      bgType.addEventListener('change', (e) => {
        currentStyles.backgroundType = e.target.value;
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          showWidgetBackgroundSection(e.target.value);
          updatePreview();
        }, 0);
      });
    }
    
    const bgColor = stylingModal.querySelector('#bg-color');
    const bgColorText = stylingModal.querySelector('#bg-color-text');
    
    if (bgColor && bgColorText) {
      bgColor.addEventListener('input', (e) => {
        bgColorText.value = e.target.value;
        currentStyles.backgroundColor = e.target.value;
        updatePreview();
      });
      
      bgColorText.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          bgColor.value = e.target.value;
          currentStyles.backgroundColor = e.target.value;
          updatePreview();
        }
      });
    }

    const opacity = stylingModal.querySelector('#opacity');
    const opacityValue = stylingModal.querySelector('#opacity-value');
    if (opacity && opacityValue) {
      opacity.addEventListener('input', (e) => {
        const val = e.target.value;
        opacityValue.textContent = val + '%';
        currentStyles.opacity = parseInt(val);
        updatePreview();
      });
    }
    
    // Gradient controls
    const gradColor1 = stylingModal.querySelector('#bg-gradient-color1');
    const gradColor1Text = stylingModal.querySelector('#bg-gradient-color1-text');
    const gradColor2 = stylingModal.querySelector('#bg-gradient-color2');
    const gradColor2Text = stylingModal.querySelector('#bg-gradient-color2-text');
    const gradDirection = stylingModal.querySelector('#bg-gradient-direction');
    
    if (gradColor1 && gradColor1Text) {
      gradColor1.addEventListener('input', (e) => {
        gradColor1Text.value = e.target.value;
        currentStyles.gradientColor1 = e.target.value;
        updatePreview();
      });
      gradColor1.addEventListener('change', (e) => {
        gradColor1Text.value = e.target.value;
        currentStyles.gradientColor1 = e.target.value;
        updatePreview();
      });
      gradColor1Text.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          gradColor1.value = e.target.value;
          currentStyles.gradientColor1 = e.target.value;
          updatePreview();
        }
      });
    } else {
      console.warn('Gradient Color1 elements not found:', { gradColor1: !!gradColor1, gradColor1Text: !!gradColor1Text });
    }
    
    if (gradColor2 && gradColor2Text) {
      gradColor2.addEventListener('input', (e) => {
        gradColor2Text.value = e.target.value;
        currentStyles.gradientColor2 = e.target.value;
        updatePreview();
      });
      gradColor2.addEventListener('change', (e) => {
        gradColor2Text.value = e.target.value;
        currentStyles.gradientColor2 = e.target.value;
        updatePreview();
      });
      gradColor2Text.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          gradColor2.value = e.target.value;
          currentStyles.gradientColor2 = e.target.value;
          updatePreview();
        }
      });
    } else {
      console.warn('Gradient Color2 elements not found:', { gradColor2: !!gradColor2, gradColor2Text: !!gradColor2Text });
    }
    
    if (gradDirection) {
      gradDirection.addEventListener('change', (e) => {
        currentStyles.gradientDirection = e.target.value;
        updatePreview();
      });
    }
    
    // Image controls
    const imageUrl = stylingModal.querySelector('#bg-image-url');
    const imageRepeat = stylingModal.querySelector('#bg-image-repeat');
    const imagePosition = stylingModal.querySelector('#bg-image-position');
    const imageSize = stylingModal.querySelector('#bg-image-size');
    const imageOpacity = stylingModal.querySelector('#bg-image-opacity');
    const imageOpacityValue = stylingModal.querySelector('#bg-image-opacity-value');
    
    if (imageUrl) {
      imageUrl.addEventListener('input', (e) => {
        currentStyles.backgroundImageUrl = e.target.value;
        updatePreview();
      });
    }
    if (imageRepeat) {
      imageRepeat.addEventListener('change', (e) => {
        currentStyles.backgroundRepeat = e.target.value;
        updatePreview();
      });
    }
    if (imagePosition) {
      imagePosition.addEventListener('change', (e) => {
        currentStyles.backgroundPosition = e.target.value;
        updatePreview();
      });
    }
    if (imageSize) {
      imageSize.addEventListener('change', (e) => {
        currentStyles.backgroundSize = e.target.value;
        updatePreview();
      });
    }
    if (imageOpacity && imageOpacityValue) {
      imageOpacity.addEventListener('input', (e) => {
        const val = e.target.value;
        imageOpacityValue.textContent = val + '%';
        currentStyles.backgroundImageOpacity = parseInt(val);
        updatePreview();
      });
    }
    
    // Pattern controls
    const patternType = stylingModal.querySelector('#bg-pattern-type');
    const patternColor = stylingModal.querySelector('#bg-pattern-color');
    const patternSize = stylingModal.querySelector('#bg-pattern-size');
    const patternSizeValue = stylingModal.querySelector('#bg-pattern-size-value');
    
    if (patternType) {
      patternType.addEventListener('change', (e) => {
        currentStyles.patternType = e.target.value;
        updatePreview();
      });
    }
    if (patternColor) {
      patternColor.addEventListener('input', (e) => {
        currentStyles.patternColor = e.target.value;
        updatePreview();
      });
    }
    if (patternSize && patternSizeValue) {
      patternSize.addEventListener('input', (e) => {
        const val = e.target.value;
        patternSizeValue.textContent = val + 'px';
        currentStyles.patternSize = parseInt(val);
        updatePreview();
      });
    }
  }
  
  if (tabName === 'border') {
    document.getElementById('border-color').addEventListener('input', (e) => {
      currentStyles.borderColor = e.target.value;
      // If "Same as Border" checkbox is checked (check both DOM and stored state), update shadow color
      const sameAsBorderCheckbox = document.getElementById('shadow-color-same-as-border');
      if ((sameAsBorderCheckbox && sameAsBorderCheckbox.checked) || shadowSameAsBorder) {
        currentStyles.shadowColor = e.target.value;
        const shadowColorInput = document.getElementById('shadow-color');
        if (shadowColorInput) {
          shadowColorInput.value = e.target.value;
        }
        // Update stored state
        shadowSameAsBorder = true;
      }
      updatePreview();
    });

    const borderWidth = document.getElementById('border-width');
    const borderWidthValue = document.getElementById('border-width-value');
    borderWidth.addEventListener('input', (e) => {
      const val = e.target.value;
      borderWidthValue.textContent = val + 'px';
      currentStyles.borderWidth = parseInt(val);
      updatePreview();
    });

    document.getElementById('border-style').addEventListener('change', (e) => {
      currentStyles.borderStyle = e.target.value;
      updatePreview();
    });

    const borderRadius = document.getElementById('border-radius');
    const borderRadiusValue = document.getElementById('border-radius-value');
    borderRadius.addEventListener('input', (e) => {
      const val = e.target.value;
      borderRadiusValue.textContent = val + 'px';
      currentStyles.borderRadius = parseInt(val);
      updatePreview();
    });
  }
  
  if (tabName === 'shadow') {
    // Preset buttons
    document.querySelectorAll('.styling-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.styling-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyShadowPreset(btn.dataset.preset);
      });
    });

    // "Same as Border" checkbox
    const sameAsBorderCheckbox = document.getElementById('shadow-color-same-as-border');
    const shadowColorInput = document.getElementById('shadow-color');
    
    if (sameAsBorderCheckbox) {
      // Check if shadow color matches border color on load
      const borderColor = currentStyles.borderColor || '#000000';
      const shadowColor = currentStyles.shadowColor || '#000000';
      if (shadowColor === borderColor) {
        sameAsBorderCheckbox.checked = true;
        if (shadowColorInput) {
          shadowColorInput.disabled = true;
        }
      }
      
      sameAsBorderCheckbox.addEventListener('change', (e) => {
        shadowSameAsBorder = e.target.checked;
        if (e.target.checked) {
          // Sync shadow color with border color
          const borderColor = currentStyles.borderColor || '#000000';
          currentStyles.shadowColor = borderColor;
          if (shadowColorInput) {
            shadowColorInput.value = borderColor;
            shadowColorInput.disabled = true;
          }
        } else {
          // Enable shadow color picker
          if (shadowColorInput) {
            shadowColorInput.disabled = false;
          }
        }
        updatePreview();
      });
      
      // Store reference to checkbox for use in border tab listener
      // The border tab listener will check this checkbox state when border color changes
    }

    if (shadowColorInput) {
      shadowColorInput.addEventListener('input', (e) => {
        // Only update if "Same as Border" is not checked
        if (!sameAsBorderCheckbox || !sameAsBorderCheckbox.checked) {
          currentStyles.shadowColor = e.target.value;
          updatePreview();
        }
      });
    }

    const shadowBlur = document.getElementById('shadow-blur');
    const shadowBlurValue = document.getElementById('shadow-blur-value');
    shadowBlur.addEventListener('input', (e) => {
      const val = e.target.value;
      shadowBlurValue.textContent = val + 'px';
      currentStyles.shadowBlur = parseInt(val);
      updatePreview();
    });

    const shadowX = document.getElementById('shadow-x');
    const shadowXValue = document.getElementById('shadow-x-value');
    shadowX.addEventListener('input', (e) => {
      const val = e.target.value;
      shadowXValue.textContent = val + 'px';
      currentStyles.shadowX = parseInt(val);
      updatePreview();
    });

    const shadowY = document.getElementById('shadow-y');
    const shadowYValue = document.getElementById('shadow-y-value');
    shadowY.addEventListener('input', (e) => {
      const val = e.target.value;
      shadowYValue.textContent = val + 'px';
      currentStyles.shadowY = parseInt(val);
      updatePreview();
    });

    const shadowSpread = document.getElementById('shadow-spread');
    const shadowSpreadValue = document.getElementById('shadow-spread-value');
    shadowSpread.addEventListener('input', (e) => {
      const val = e.target.value;
      shadowSpreadValue.textContent = val + 'px';
      currentStyles.shadowSpread = parseInt(val);
      updatePreview();
    });
  }
  
  if (tabName === 'title') {
    // Title visibility checkbox
    const titleVisibleCheckbox = document.getElementById('title-visible');
    if (titleVisibleCheckbox) {
      titleVisibleCheckbox.addEventListener('change', (e) => {
        currentStyles.titleVisible = e.target.checked;
        updatePreview();
      });
    }

    // Title icon visibility checkbox
    const titleIconVisibleCheckbox = document.getElementById('title-icon-visible');
    if (titleIconVisibleCheckbox) {
      titleIconVisibleCheckbox.addEventListener('change', (e) => {
        currentStyles.titleIconVisible = e.target.checked;
        updatePreview();
      });
    }

    // Title text input
    const titleTextInput = document.getElementById('title-text');
    if (titleTextInput) {
      titleTextInput.addEventListener('input', (e) => {
        currentStyles.titleText = e.target.value;
        updatePreview();
      });
    }

    // Title alignment select
    const titleAlignmentSelect = document.getElementById('title-alignment');
    if (titleAlignmentSelect) {
      titleAlignmentSelect.addEventListener('change', (e) => {
        currentStyles.titleAlignment = e.target.value;
        updatePreview();
      });
    }

    // Dynamic checkbox for text color
    const textColorDynamicCheckbox = document.getElementById('text-color-dynamic');
    const textColorInput = document.getElementById('text-color');
    
    if (textColorDynamicCheckbox) {
      textColorDynamicCheckbox.addEventListener('change', (e) => {
        currentStyles.textColorDynamic = e.target.checked;
        if (e.target.checked) {
          // Dynamic mode: disable color picker and remove inline color
          if (textColorInput) textColorInput.disabled = true;
          // Remove textColor so it uses CSS variable
          delete currentStyles.textColor;
        } else {
          // Manual mode: enable color picker
          if (textColorInput) textColorInput.disabled = false;
          // Set textColor to current picker value if not set
          if (!currentStyles.textColor && textColorInput) {
            currentStyles.textColor = textColorInput.value;
          }
        }
        updatePreview();
      });
    }
    
    if (textColorInput) {
      textColorInput.addEventListener('input', (e) => {
        currentStyles.textColor = e.target.value;
        // If user manually changes color, automatically disable dynamic mode
        if (currentStyles.textColorDynamic) {
          currentStyles.textColorDynamic = false;
          if (textColorDynamicCheckbox) {
            textColorDynamicCheckbox.checked = false;
          }
          textColorInput.disabled = false;
        }
        updatePreview();
      });
    }

    const fontSize = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    fontSize.addEventListener('input', (e) => {
      const val = e.target.value;
      fontSizeValue.textContent = val + 'px';
      currentStyles.fontSize = parseInt(val);
      updatePreview();
    });

    document.getElementById('font-weight').addEventListener('change', (e) => {
      currentStyles.fontWeight = e.target.value;
      updatePreview();
    });
  }
  
  if (tabName === 'layout') {
    const padding = document.getElementById('padding');
    const paddingValue = document.getElementById('padding-value');
    padding.addEventListener('input', (e) => {
      const val = e.target.value;
      paddingValue.textContent = val + 'px';
      currentStyles.padding = parseInt(val);
      updatePreview();
    });
  }
  
  if (tabName === 'advanced') {
    const widgetOpacity = document.getElementById('widget-opacity');
    const widgetOpacityValue = document.getElementById('widget-opacity-value');
    if (widgetOpacity && widgetOpacityValue) {
      widgetOpacity.addEventListener('input', (e) => {
        const val = e.target.value;
        widgetOpacityValue.textContent = val + '%';
        currentStyles.widgetOpacity = parseInt(val);
        updatePreview();
      });
    }
    
    // Dice color pickers
    const stylingModal = document.getElementById('styling-modal');
    if (stylingModal) {
      const diceFaceColor = stylingModal.querySelector('#dice-face-color');
      const diceFaceColorText = stylingModal.querySelector('#dice-face-color-text');
      if (diceFaceColor && diceFaceColorText) {
        diceFaceColor.addEventListener('input', (e) => {
          diceFaceColorText.value = e.target.value;
          currentStyles.diceFaceColor = e.target.value;
          updatePreview();
        });
        diceFaceColor.addEventListener('change', (e) => {
          diceFaceColorText.value = e.target.value;
          currentStyles.diceFaceColor = e.target.value;
          updatePreview();
        });
        diceFaceColorText.addEventListener('input', (e) => {
          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            diceFaceColor.value = e.target.value;
            currentStyles.diceFaceColor = e.target.value;
            updatePreview();
          }
        });
      }
      
      const diceDotColor = stylingModal.querySelector('#dice-dot-color');
      const diceDotColorText = stylingModal.querySelector('#dice-dot-color-text');
      if (diceDotColor && diceDotColorText) {
        diceDotColor.addEventListener('input', (e) => {
          diceDotColorText.value = e.target.value;
          currentStyles.diceDotColor = e.target.value;
          updatePreview();
        });
        diceDotColor.addEventListener('change', (e) => {
          diceDotColorText.value = e.target.value;
          currentStyles.diceDotColor = e.target.value;
          updatePreview();
        });
        diceDotColorText.addEventListener('input', (e) => {
          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            diceDotColor.value = e.target.value;
            currentStyles.diceDotColor = e.target.value;
            updatePreview();
          }
        });
      }
      
      // Stopwatch color pickers
      const stopwatchTextColor = stylingModal.querySelector('#stopwatch-text-color');
      const stopwatchTextColorText = stylingModal.querySelector('#stopwatch-text-color-text');
      if (stopwatchTextColor && stopwatchTextColorText) {
        stopwatchTextColor.addEventListener('input', (e) => {
          stopwatchTextColorText.value = e.target.value;
          currentStyles.stopwatchTextColor = e.target.value;
          updatePreview();
        });
        stopwatchTextColor.addEventListener('change', (e) => {
          stopwatchTextColorText.value = e.target.value;
          currentStyles.stopwatchTextColor = e.target.value;
          updatePreview();
        });
        stopwatchTextColorText.addEventListener('input', (e) => {
          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            stopwatchTextColor.value = e.target.value;
            currentStyles.stopwatchTextColor = e.target.value;
            updatePreview();
          }
        });
      }
      
      const stopwatchPlayButtonColor = stylingModal.querySelector('#stopwatch-play-button-color');
      const stopwatchPlayButtonColorText = stylingModal.querySelector('#stopwatch-play-button-color-text');
      if (stopwatchPlayButtonColor && stopwatchPlayButtonColorText) {
        stopwatchPlayButtonColor.addEventListener('input', (e) => {
          stopwatchPlayButtonColorText.value = e.target.value;
          currentStyles.stopwatchPlayButtonColor = e.target.value;
          updatePreview();
        });
        stopwatchPlayButtonColor.addEventListener('change', (e) => {
          stopwatchPlayButtonColorText.value = e.target.value;
          currentStyles.stopwatchPlayButtonColor = e.target.value;
          updatePreview();
        });
        stopwatchPlayButtonColorText.addEventListener('input', (e) => {
          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            stopwatchPlayButtonColor.value = e.target.value;
            currentStyles.stopwatchPlayButtonColor = e.target.value;
            updatePreview();
          }
        });
      }
      
      const stopwatchResetButtonColor = stylingModal.querySelector('#stopwatch-reset-button-color');
      const stopwatchResetButtonColorText = stylingModal.querySelector('#stopwatch-reset-button-color-text');
      if (stopwatchResetButtonColor && stopwatchResetButtonColorText) {
        stopwatchResetButtonColor.addEventListener('input', (e) => {
          stopwatchResetButtonColorText.value = e.target.value;
          currentStyles.stopwatchResetButtonColor = e.target.value;
          updatePreview();
        });
        stopwatchResetButtonColor.addEventListener('change', (e) => {
          stopwatchResetButtonColorText.value = e.target.value;
          currentStyles.stopwatchResetButtonColor = e.target.value;
          updatePreview();
        });
        stopwatchResetButtonColorText.addEventListener('input', (e) => {
          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            stopwatchResetButtonColor.value = e.target.value;
            currentStyles.stopwatchResetButtonColor = e.target.value;
            updatePreview();
          }
        });
      }
      
      // Scoreboard configuration
      if (currentWidgetId === 'scoreboard-widget') {
        // Target score
        const targetScoreInput = stylingModal.querySelector('#scoreboard-target-score');
        if (targetScoreInput) {
          targetScoreInput.addEventListener('input', () => {
            updateScoreboardConfig();
          });
        }
        
        // Increment
        const incrementSelect = stylingModal.querySelector('#scoreboard-increment');
        if (incrementSelect) {
          incrementSelect.addEventListener('change', () => {
            updateScoreboardConfig();
          });
        }
        
        // Add team button
        const addTeamBtn = stylingModal.querySelector('#scoreboard-add-team-btn');
        if (addTeamBtn) {
          addTeamBtn.addEventListener('click', () => {
            addScoreboardTeam();
          });
        }
        
        // Setup drag and drop for team reordering first (clones elements)
        setupScoreboardDragAndDrop();
        
        // Then setup team listeners and update remove button visibility
        // (must be after drag setup because drag setup clones elements)
        setupScoreboardTeamListeners();
        updateRemoveButtonsVisibility();
      }
      
      // Clip art widget controls
      if (currentWidgetId === 'blank-widget') {
        // Get the current widget element
        const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
          ? window.currentPageIndex 
          : 0;
        const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
        const currentWidget = currentPage ? currentPage.querySelector(`.${currentWidgetId}`) : document.querySelector(`.${currentWidgetId}`);
        
        // Image visibility checkbox
        const clipartVisible = stylingModal.querySelector('#clipart-visible');
        if (clipartVisible && currentWidget) {
          const handleVisibilityChange = (e) => {
            currentStyles.clipArtVisible = e.target.checked;
            const clipartSelectBtn = stylingModal.querySelector('#clipart-select-btn');
            const pixabayBtn = stylingModal.querySelector('#clipart-pixabay-btn');
            const openclipartBtn = stylingModal.querySelector('#clipart-openclipart-btn');
            
            // Enable/disable buttons based on visibility
            if (clipartSelectBtn) clipartSelectBtn.disabled = !e.target.checked;
            if (pixabayBtn) pixabayBtn.disabled = !e.target.checked;
            if (openclipartBtn) openclipartBtn.disabled = !e.target.checked;
            
            // Update preview immediately
            updatePreview();
            
            // Apply immediately to widget
            applyCurrentStylesToWidget(currentWidget);
          };
          
          // Attach both 'change' and 'input' events for immediate feedback
          clipartVisible.addEventListener('change', handleVisibilityChange);
          clipartVisible.addEventListener('input', handleVisibilityChange);
        }
        
        const clipartSelectBtn = stylingModal.querySelector('#clipart-select-btn');
        const pixabayBtn = stylingModal.querySelector('#clipart-pixabay-btn');
        const openclipartBtn = stylingModal.querySelector('#clipart-openclipart-btn');
        
        if (clipartSelectBtn) {
          clipartSelectBtn.addEventListener('click', () => {
            openClipArtModal();
          });
        }
        
        if (pixabayBtn) {
          pixabayBtn.addEventListener('click', () => {
            openPixabayModal();
          });
        }
        
        if (openclipartBtn) {
          openclipartBtn.addEventListener('click', () => {
            openOpenClipartModal();
          });
        }
        
        const clipartShadowEnabled = stylingModal.querySelector('#clipart-shadow-enabled');
        if (clipartShadowEnabled) {
          clipartShadowEnabled.addEventListener('change', (e) => {
            currentStyles.clipArtShadowEnabled = e.target.checked;
            const clipartColor = stylingModal.querySelector('#clipart-color');
            const clipartColorText = stylingModal.querySelector('#clipart-color-text');
            if (clipartColor && clipartColorText) {
              clipartColor.disabled = !e.target.checked;
              clipartColorText.disabled = !e.target.checked;
            }
            updatePreview();
          });
        }
        
        const clipartColor = stylingModal.querySelector('#clipart-color');
        const clipartColorText = stylingModal.querySelector('#clipart-color-text');
        if (clipartColor && clipartColorText) {
          clipartColor.addEventListener('input', (e) => {
            clipartColorText.value = e.target.value;
            currentStyles.clipArtColor = e.target.value;
            updatePreview();
          });
          clipartColor.addEventListener('change', (e) => {
            clipartColorText.value = e.target.value;
            currentStyles.clipArtColor = e.target.value;
            updatePreview();
          });
          clipartColorText.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
              clipartColor.value = e.target.value;
              currentStyles.clipArtColor = e.target.value;
              updatePreview();
            }
          });
          clipartColorText.addEventListener('change', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
              clipartColor.value = e.target.value;
              currentStyles.clipArtColor = e.target.value;
              updatePreview();
            }
          });
        }
        
        const clipartTintEnabled = stylingModal.querySelector('#clipart-tint-enabled');
        if (clipartTintEnabled) {
          clipartTintEnabled.addEventListener('change', (e) => {
            currentStyles.clipArtTintEnabled = e.target.checked;
            const clipartTintColor = stylingModal.querySelector('#clipart-tint-color');
            const clipartTintColorText = stylingModal.querySelector('#clipart-tint-color-text');
            if (clipartTintColor && clipartTintColorText) {
              clipartTintColor.disabled = !e.target.checked;
              clipartTintColorText.disabled = !e.target.checked;
            }
            updatePreview();
          });
        }
        
        const clipartTintColor = stylingModal.querySelector('#clipart-tint-color');
        const clipartTintColorText = stylingModal.querySelector('#clipart-tint-color-text');
        if (clipartTintColor && clipartTintColorText) {
          // Helper function to normalize color to 6-digit hex
          const normalizeColor = (color) => {
            if (!color) return '#ffffff';
            // If it's a 3-digit hex, expand it
            if (/^#[0-9A-F]{3}$/i.test(color)) {
              return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
            }
            // If it's already 6-digit, return as is
            if (/^#[0-9A-F]{6}$/i.test(color)) {
              return color;
            }
            return '#ffffff'; // Default fallback
          };
          
          clipartTintColor.addEventListener('input', (e) => {
            const normalized = normalizeColor(e.target.value);
            clipartTintColorText.value = normalized;
            clipartTintColor.value = normalized;
            currentStyles.clipArtTintColor = normalized;
            updatePreview();
          });
          clipartTintColor.addEventListener('change', (e) => {
            const normalized = normalizeColor(e.target.value);
            clipartTintColorText.value = normalized;
            clipartTintColor.value = normalized;
            currentStyles.clipArtTintColor = normalized;
            updatePreview();
          });
          clipartTintColorText.addEventListener('input', (e) => {
            const normalized = normalizeColor(e.target.value);
            if (/^#[0-9A-F]{6}$/i.test(normalized)) {
              clipartTintColor.value = normalized;
              currentStyles.clipArtTintColor = normalized;
              updatePreview();
            }
          });
          clipartTintColorText.addEventListener('change', (e) => {
            const normalized = normalizeColor(e.target.value);
            if (/^#[0-9A-F]{6}$/i.test(normalized)) {
              clipartTintColor.value = normalized;
              currentStyles.clipArtTintColor = normalized;
              updatePreview();
            }
          });
        }
      }
    }
  }
}

// Update scoreboard configuration from form
function updateScoreboardConfig() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  const teamsList = stylingModal.querySelectorAll('.scoreboard-team-config');
  const teams = Array.from(teamsList).map((teamEl, index) => {
    const nameInput = teamEl.querySelector('.scoreboard-team-name-input');
    const iconSelect = teamEl.querySelector('.scoreboard-team-icon-select');
    const colorInput = teamEl.querySelector('.scoreboard-team-slider-color');
    
    return {
      id: `team${index + 1}`,
      name: nameInput ? nameInput.value : `Team ${index + 1}`,
      icon: iconSelect ? iconSelect.value : '🚀',
      sliderColor: colorInput ? colorInput.value : '#9b59b6'
    };
  });
  
  const targetScoreInput = stylingModal.querySelector('#scoreboard-target-score');
  const incrementSelect = stylingModal.querySelector('#scoreboard-increment');
  
  const config = {
    teams: teams,
    targetScore: targetScoreInput ? parseInt(targetScoreInput.value) || 10 : 10,
    increment: incrementSelect ? parseInt(incrementSelect.value) || 1 : 1
  };
  
  currentStyles.scoreboardConfig = config;
  updatePreview();
}

// Add a new team to scoreboard
function addScoreboardTeam() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  const teamsList = stylingModal.querySelector('#scoreboard-teams-list');
  if (!teamsList) return;
  
  const currentTeams = stylingModal.querySelectorAll('.scoreboard-team-config');
  const newIndex = currentTeams.length;
  
  const newTeamEl = document.createElement('div');
  newTeamEl.className = 'scoreboard-team-config';
  newTeamEl.dataset.teamIndex = newIndex;
  
  newTeamEl.innerHTML = `
    <div class="styling-form-row">
      <label class="styling-form-label">Team ${newIndex + 1}</label>
      <div class="styling-form-control" style="display: flex; gap: 8px; align-items: center;">
        <span class="scoreboard-drag-handle" style="cursor: move; font-size: 18px; opacity: 0.6; user-select: none;" title="Drag to reorder">☰</span>
        <input type="text" class="scoreboard-team-name-input" value="Team ${newIndex + 1}" placeholder="Team Name">
        <select class="scoreboard-team-icon-select">
          ${typeof window !== 'undefined' && window.SCOREBOARD_ICONS ? window.SCOREBOARD_ICONS.map(icon => 
            `<option value="${icon.value}">${icon.value} ${icon.label}</option>`
          ).join('') : ''}
        </select>
        <input type="color" class="scoreboard-team-slider-color" value="#9b59b6">
        ${currentTeams.length + 1 > 2 ? `<button type="button" class="scoreboard-remove-team-btn" data-team-index="${newIndex}">Remove</button>` : ''}
      </div>
    </div>
  `;
  
  teamsList.appendChild(newTeamEl);
  // Set draggable attribute on new team
  newTeamEl.setAttribute('draggable', 'true');
  
  // Re-setup drag and drop first (clones elements, removes listeners)
  setupScoreboardDragAndDrop();
  
  // Then setup team listeners and update visibility (after drag setup clones elements)
  setupScoreboardTeamListeners();
  updateRemoveButtonsVisibility();
  updateScoreboardConfig();
}

// Setup event listeners for team configuration
function setupScoreboardTeamListeners() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  // Remove team buttons - clone to remove old listeners and attach fresh ones
  const removeBtns = stylingModal.querySelectorAll('.scoreboard-remove-team-btn');
  removeBtns.forEach((btn, index) => {
    // Clone button to remove any old listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.dataset.listenerAttached = 'true';
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const teamsList = stylingModal.querySelector('#scoreboard-teams-list');
      const currentTeams = stylingModal.querySelectorAll('.scoreboard-team-config');
      // Button should only be visible if there are 3+ teams, so we can safely remove
      if (currentTeams.length > 2) {
        const teamIndex = parseInt(e.target.dataset.teamIndex);
        const teamEl = stylingModal.querySelector(`.scoreboard-team-config[data-team-index="${teamIndex}"]`);
        if (teamEl) {
          teamEl.remove();
          // Update labels
          updateScoreboardTeamLabels();
          // Update remove buttons visibility
          updateRemoveButtonsVisibility();
          updateScoreboardConfig();
        }
      }
      // No else clause - button shouldn't be visible if there are only 2 teams
    });
  });
  
  // Team name inputs
  const nameInputs = stylingModal.querySelectorAll('.scoreboard-team-name-input');
  nameInputs.forEach(input => {
    if (!input.dataset.listenerAttached) {
      input.dataset.listenerAttached = 'true';
      input.addEventListener('input', () => {
        updateScoreboardConfig();
      });
    }
  });
  
  // Icon selects
  const iconSelects = stylingModal.querySelectorAll('.scoreboard-team-icon-select');
  iconSelects.forEach(select => {
    if (!select.dataset.listenerAttached) {
      select.dataset.listenerAttached = 'true';
      select.addEventListener('change', () => {
        updateScoreboardConfig();
      });
    }
  });
  
  // Color inputs
  const colorInputs = stylingModal.querySelectorAll('.scoreboard-team-slider-color');
  colorInputs.forEach(input => {
    if (!input.dataset.listenerAttached) {
      input.dataset.listenerAttached = 'true';
      input.addEventListener('input', () => {
        updateScoreboardConfig();
      });
    }
  });
}

// Update team labels after removal
function updateScoreboardTeamLabels() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  const teams = stylingModal.querySelectorAll('.scoreboard-team-config');
  teams.forEach((team, index) => {
    const label = team.querySelector('label.styling-form-label');
    if (label) {
      label.textContent = `Team ${index + 1}`;
    }
    // Update data-team-index
    team.dataset.teamIndex = index;
  });
}

// Update remove buttons visibility based on team count
function updateRemoveButtonsVisibility() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  const teams = stylingModal.querySelectorAll('.scoreboard-team-config');
  const teamCount = teams.length;
  const shouldShowRemove = teamCount > 2;
  
  teams.forEach((team, index) => {
    let removeBtn = team.querySelector('.scoreboard-remove-team-btn');
    
    if (shouldShowRemove) {
      // Need to show remove button
      if (!removeBtn) {
        // Create remove button if it doesn't exist
        const controls = team.querySelector('.styling-form-control');
        if (controls) {
          removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'scoreboard-remove-team-btn';
          removeBtn.dataset.teamIndex = index;
          removeBtn.textContent = 'Remove';
          controls.appendChild(removeBtn);
          
          // Attach event listener
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const teamsList = stylingModal.querySelector('#scoreboard-teams-list');
            const currentTeams = stylingModal.querySelectorAll('.scoreboard-team-config');
            if (currentTeams.length > 2) {
              const teamIndex = parseInt(e.target.dataset.teamIndex);
              const teamEl = stylingModal.querySelector(`.scoreboard-team-config[data-team-index="${teamIndex}"]`);
              if (teamEl) {
                teamEl.remove();
                updateScoreboardTeamLabels();
                updateRemoveButtonsVisibility();
                updateScoreboardConfig();
              }
            }
            // No else clause - button shouldn't be visible if there are only 2 teams
          });
        }
      } else {
        // Update data-team-index
        removeBtn.dataset.teamIndex = index;
      }
      // Ensure button is visible and has listener
      removeBtn.style.display = '';
      // Clear listener flag so it gets reattached
      removeBtn.dataset.listenerAttached = '';
    } else {
      // Need to hide remove button
      if (removeBtn) {
        removeBtn.style.display = 'none';
      }
    }
  });
  
  // Re-setup listeners after visibility changes
  setupScoreboardTeamListeners();
}

// Setup drag and drop for team reordering
// Use module-level variables so they persist across function calls
let draggedScoreboardElement = null;
let draggedScoreboardIndex = null;

function setupScoreboardDragAndDrop() {
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) {
    return;
  }
  
  const teamsList = stylingModal.querySelector('#scoreboard-teams-list');
  if (!teamsList) {
    return;
  }
  
  
  // Remove existing listeners by cloning (clean slate)
  const teamConfigs = teamsList.querySelectorAll('.scoreboard-team-config');
  teamConfigs.forEach(teamEl => {
    const newEl = teamEl.cloneNode(true);
    // Ensure draggable attribute is set
    newEl.setAttribute('draggable', 'true');
    // Clear listener flags so listeners get reattached
    const removeBtns = newEl.querySelectorAll('.scoreboard-remove-team-btn');
    removeBtns.forEach(btn => {
      btn.dataset.listenerAttached = '';
    });
    teamEl.parentNode.replaceChild(newEl, teamEl);
  });
  
  // Always reattach team listeners after cloning (especially remove button listeners)
  setupScoreboardTeamListeners();
  
  // Get fresh references after cloning
  const freshTeamConfigs = teamsList.querySelectorAll('.scoreboard-team-config');
  
  freshTeamConfigs.forEach((teamEl, index) => {
    // Ensure element is draggable
    teamEl.setAttribute('draggable', 'true');
    teamEl.dataset.dragSetup = 'true';
    
    // Prevent inputs/selects from blocking drag - stop propagation on mousedown
    const inputs = teamEl.querySelectorAll('input.scoreboard-team-name-input, select.scoreboard-team-icon-select');
    inputs.forEach(input => {
      input.addEventListener('mousedown', (e) => {
        // Stop propagation so drag doesn't start when clicking on input/select
        e.stopPropagation();
      });
    });
    
    // Drag start - allow drag from anywhere except inputs/selects/buttons
    teamEl.addEventListener('dragstart', (e) => {
      const target = e.target;
      
      // Don't allow drag if clicking directly on input, select, or remove button
      if (target.tagName === 'INPUT' && target.classList.contains('scoreboard-team-name-input')) {
        e.preventDefault();
        return;
      }
      if (target.tagName === 'SELECT' && target.classList.contains('scoreboard-team-icon-select')) {
        e.preventDefault();
        return;
      }
      if (target.tagName === 'BUTTON' && target.classList.contains('scoreboard-remove-team-btn')) {
        e.preventDefault();
        return;
      }
      
      draggedScoreboardElement = teamEl;
      draggedScoreboardIndex = index;
      teamEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      // Add cursor to all other elements to show they're drop targets
      freshTeamConfigs.forEach(t => {
        if (t !== teamEl) {
          t.style.cursor = 'move';
        }
      });
    });
    
    // Drag end
    teamEl.addEventListener('dragend', (e) => {
      // Remove all visual states from all teams
      const allTeams = teamsList.querySelectorAll('.scoreboard-team-config');
      allTeams.forEach(t => {
        t.classList.remove('dragging', 'drag-over-above', 'drag-over-below');
        t.style.cursor = '';
        t.style.opacity = '';
        t.style.background = '';
      });
      // Clear dragged element
      draggedScoreboardElement = null;
      draggedScoreboardIndex = null;
    });
    
    // Drag over
    teamEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      
      if (draggedScoreboardElement && draggedScoreboardElement !== teamEl) {
        const rect = teamEl.getBoundingClientRect();
        const mouseY = e.clientY;
        const midpoint = rect.top + rect.height / 2;
        
        // Remove previous classes from all elements
        freshTeamConfigs.forEach(t => {
          t.classList.remove('drag-over-above', 'drag-over-below');
        });
        
        // Add appropriate class to current target
        if (mouseY < midpoint) {
          teamEl.classList.add('drag-over-above');
        } else {
          teamEl.classList.add('drag-over-below');
        }
      } else {
      }
    });
    
    // Drag leave
    teamEl.addEventListener('dragleave', (e) => {
      // Only remove classes if we're actually leaving the element
      const rect = teamEl.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        teamEl.classList.remove('drag-over-above', 'drag-over-below');
      }
    });
    
    // Drop
    teamEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (draggedScoreboardElement && draggedScoreboardElement !== teamEl) {
        const currentTeamConfigs = teamsList.querySelectorAll('.scoreboard-team-config');
        const dropIndex = Array.from(currentTeamConfigs).indexOf(teamEl);
        const rect = teamEl.getBoundingClientRect();
        const mouseY = e.clientY;
        const midpoint = rect.top + rect.height / 2;
        
        let insertBefore = mouseY < midpoint;
        
        // Calculate target position
        let targetNode = teamEl;
        if (!insertBefore && teamEl.nextSibling) {
          targetNode = teamEl.nextSibling;
        }
        
        // Insert the dragged element
        teamsList.insertBefore(draggedScoreboardElement, insertBefore ? teamEl : targetNode);
        
        // Update labels and indices
        updateScoreboardTeamLabels();
        updateScoreboardConfig();
        
        // Clear all visual states and drag setup flags
        const allTeams = teamsList.querySelectorAll('.scoreboard-team-config');
        allTeams.forEach(t => {
          t.classList.remove('dragging', 'drag-over-above', 'drag-over-below');
          t.style.cursor = '';
          t.style.opacity = '';
          t.style.background = '';
          t.dataset.dragSetup = 'false';
        });
        // Re-setup drag and drop with fresh event listeners (clones elements)
        // Note: setupScoreboardDragAndDrop() now calls setupScoreboardTeamListeners() internally
        setupScoreboardDragAndDrop();
        // Update remove buttons visibility
        updateRemoveButtonsVisibility();
      }
      
      // Always clear drag-over classes even if drop wasn't valid
      teamEl.classList.remove('drag-over-above', 'drag-over-below');
    });
  });
}

// Apply shadow preset
function applyShadowPreset(preset) {
  switch(preset) {
    case 'none':
      currentStyles.shadowBlur = 0;
      currentStyles.shadowX = 0;
      currentStyles.shadowY = 0;
      currentStyles.shadowSpread = 0;
      break;
    case 'subtle':
      currentStyles.shadowBlur = 4;
      currentStyles.shadowX = 0;
      currentStyles.shadowY = 2;
      currentStyles.shadowSpread = 0;
      break;
    case 'medium':
      currentStyles.shadowBlur = 6;
      currentStyles.shadowX = 0;
      currentStyles.shadowY = 4;
      currentStyles.shadowSpread = 0;
      break;
    case 'strong':
      currentStyles.shadowBlur = 12;
      currentStyles.shadowX = 0;
      currentStyles.shadowY = 8;
      currentStyles.shadowSpread = 2;
      break;
  }
  updatePreview();
  // Update UI
  if (document.getElementById('shadow-blur')) {
    document.getElementById('shadow-blur').value = currentStyles.shadowBlur;
    document.getElementById('shadow-blur-value').textContent = currentStyles.shadowBlur + 'px';
    document.getElementById('shadow-x').value = currentStyles.shadowX;
    document.getElementById('shadow-x-value').textContent = currentStyles.shadowX + 'px';
    document.getElementById('shadow-y').value = currentStyles.shadowY;
    document.getElementById('shadow-y-value').textContent = currentStyles.shadowY + 'px';
    document.getElementById('shadow-spread').value = currentStyles.shadowSpread;
    document.getElementById('shadow-spread-value').textContent = currentStyles.shadowSpread + 'px';
  }
}

// Update preview widget
function updatePreview() {
  const preview = document.getElementById('styling-preview-widget');
  if (!preview) return;

  // Apply background based on type - use currentStyles to ensure consistency
  const bgType = currentStyles.backgroundType || 'solid';
  
  // Clear previous background styles
  preview.style.backgroundColor = '';
  preview.style.backgroundImage = '';
  preview.style.backgroundRepeat = '';
  preview.style.backgroundPosition = '';
  preview.style.backgroundSize = '';
  // Note: Don't clear opacity here - it will be set appropriately below based on background type and widgetOpacity
  
  // Get background opacity (applies to all background types including images)
  const bgOpacity = currentStyles.opacity !== undefined ? currentStyles.opacity : 100;
  
  // Apply background based on type, using currentStyles values
  switch(bgType) {
    case 'solid':
      const solidColor = currentStyles.backgroundColor || '#2a2a2a';
      // Apply background opacity using rgba
      preview.style.backgroundColor = bgOpacity < 100 ? hexToRgba(solidColor, bgOpacity) : solidColor;
      break;
      
    case 'transparent':
      preview.style.backgroundColor = 'transparent';
      break;
      
    case 'gradient':
      const color1 = currentStyles.gradientColor1 || '#2a2a2a';
      const color2 = currentStyles.gradientColor2 || '#3a3a3a';
      const direction = currentStyles.gradientDirection || 'to bottom';
      // Apply background opacity using rgba in gradient
      const rgbaColor1 = bgOpacity < 100 ? hexToRgba(color1, bgOpacity) : color1;
      const rgbaColor2 = bgOpacity < 100 ? hexToRgba(color2, bgOpacity) : color2;
      preview.style.backgroundImage = `linear-gradient(${direction}, ${rgbaColor1}, ${rgbaColor2})`;
      break;
      
    case 'image':
      const imageUrl = currentStyles.backgroundImageUrl || '';
      if (imageUrl) {
        preview.style.backgroundImage = `url(${imageUrl})`;
        preview.style.backgroundRepeat = currentStyles.backgroundRepeat || 'no-repeat';
        preview.style.backgroundPosition = currentStyles.backgroundPosition || 'center';
        preview.style.backgroundSize = currentStyles.backgroundSize || 'cover';
        // For images, apply opacity to preview but content will be set to opacity: 1 below
        if (bgOpacity < 100) {
          preview.style.opacity = bgOpacity / 100;
        } else {
          preview.style.opacity = '';
        }
      } else {
        preview.style.backgroundColor = '#1a1a1a';
      }
      break;
      
    case 'pattern':
      const patternType = currentStyles.patternType || 'dots';
      const patternColor = currentStyles.patternColor || '#3a3a3a';
      const patternSize = currentStyles.patternSize !== undefined ? currentStyles.patternSize : 20;
      const patternCSS = generatePatternCSS(patternType, patternColor, patternSize);
      // Extract background-image and background-size from pattern CSS
      const bgImageMatch = patternCSS.match(/background-image:\s*([^;]+);/);
      const bgSizeMatch = patternCSS.match(/background-size:\s*([^;]+);/);
      if (bgImageMatch) {
        preview.style.backgroundImage = bgImageMatch[1].trim();
      }
      if (bgSizeMatch) {
        preview.style.backgroundSize = bgSizeMatch[1].trim();
      }
      // For patterns, apply opacity to preview but content will be set to opacity: 1 below
      if (bgOpacity < 100) {
        preview.style.opacity = bgOpacity / 100;
      } else {
        preview.style.opacity = '';
      }
      preview.style.backgroundColor = '#1a1a1a';
      break;
  }

  // Apply border
  if (currentStyles.borderColor) {
    preview.style.borderColor = currentStyles.borderColor;
  }
  if (currentStyles.borderWidth !== undefined) {
    preview.style.borderWidth = currentStyles.borderWidth + 'px';
  }
  if (currentStyles.borderStyle) {
    preview.style.borderStyle = currentStyles.borderStyle;
  }
  if (currentStyles.borderRadius !== undefined) {
    preview.style.borderRadius = currentStyles.borderRadius + 'px';
  }

  // Apply shadow
  if (currentStyles.shadowBlur !== undefined || currentStyles.shadowX !== undefined || currentStyles.shadowY !== undefined) {
    const x = currentStyles.shadowX || 0;
    const y = currentStyles.shadowY || 0;
    const blur = currentStyles.shadowBlur || 0;
    const spread = currentStyles.shadowSpread || 0;
    const color = currentStyles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  // Apply title visibility and alignment
  const previewHeader = preview.querySelector('.styling-preview-header');
  if (previewHeader) {
    // Title visibility
    if (currentStyles.titleVisible !== undefined) {
      previewHeader.style.display = currentStyles.titleVisible ? '' : 'none';
    }
    
    // Title alignment
    if (currentStyles.titleAlignment !== undefined) {
      previewHeader.style.justifyContent = currentStyles.titleAlignment === 'center' ? 'center' : 'flex-start';
      previewHeader.style.textAlign = currentStyles.titleAlignment === 'center' ? 'center' : 'left';
    }
  }

  // Apply text
  const titleText = preview.querySelector('.styling-preview-title-text');
  if (titleText) {
    // Get widget icon
    const widgetIcon = WIDGET_CONFIG[currentWidgetId]?.icon || '';
    const showIcon = currentStyles.titleIconVisible !== undefined ? currentStyles.titleIconVisible : true;
    
    // Title text
    let titleTextValue;
    if (currentStyles.titleText !== undefined) {
      titleTextValue = currentStyles.titleText;
    } else {
      // Use default from WIDGET_CONFIG
      titleTextValue = WIDGET_CONFIG[currentWidgetId]?.name || 'Widget';
    }
    
    // Apply icon visibility
    if (showIcon && widgetIcon) {
      titleText.textContent = `${widgetIcon} ${titleTextValue}`;
    } else {
      titleText.textContent = titleTextValue;
    }
    // Handle text color: use dynamic color if textColorDynamic is true, otherwise use manual color
    if (currentStyles.textColorDynamic) {
      // Dynamic mode: calculate color based on preview background
      // Get computed background color from preview
      const previewComputedStyle = window.getComputedStyle(preview);
      let previewBgColor = previewComputedStyle.backgroundColor;
      
      // If background is transparent or rgba(0,0,0,0), use default
      if (!previewBgColor || previewBgColor === 'rgba(0, 0, 0, 0)' || previewBgColor === 'transparent') {
        const previewBgImage = previewComputedStyle.backgroundImage;
        if (previewBgImage && previewBgImage !== 'none') {
          previewBgColor = 'rgb(42, 42, 42)'; // Assume dark for images
        } else {
          previewBgColor = 'rgb(42, 42, 42)';
        }
      }
      
      // Extract RGB values and calculate dynamic color
      const rgbMatch = previewBgColor.match(/\d+/g);
      if (rgbMatch && rgbMatch.length >= 3) {
        const r = parseInt(rgbMatch[0]);
        const g = parseInt(rgbMatch[1]);
        const b = parseInt(rgbMatch[2]);
        
        // Use the same luminance calculation as updateWidgetDynamicStyles
        if (typeof isLightColor === 'function') {
          const isLight = isLightColor(r, g, b);
          titleText.style.color = isLight ? '#1a1a1a' : '#ffffff';
        } else {
          // Fallback if function not available
          titleText.style.color = '#ffffff';
        }
      } else {
        titleText.style.color = '#ffffff'; // Fallback
      }
    } else if (currentStyles.textColor) {
      // Manual mode: use the selected color
      titleText.style.color = currentStyles.textColor;
    } else {
      // No color set: use default
      titleText.style.color = '';
    }
    if (currentStyles.fontSize) {
      titleText.style.fontSize = currentStyles.fontSize + 'px';
    }
    if (currentStyles.fontWeight) {
      titleText.style.fontWeight = currentStyles.fontWeight;
    }
    // Apply widget opacity to title (independent of background opacity)
    if (currentStyles.widgetOpacity !== undefined) {
      titleText.style.opacity = (currentStyles.widgetOpacity / 100);
    } else {
      // If background opacity was applied to preview (for images/patterns), counteract on content
      if ((bgType === 'image' || bgType === 'pattern') && bgOpacity < 100) {
        titleText.style.opacity = '1';
      } else {
        titleText.style.opacity = '';
      }
    }
  }

  // Apply padding
  if (currentStyles.padding !== undefined) {
    preview.style.padding = currentStyles.padding + 'px';
  }

  // Update preview content for dice widget
  const previewContent = preview.querySelector('.styling-preview-content');
  if (previewContent && currentWidgetId === 'dice-widget') {
    const diceFaceColor = currentStyles.diceFaceColor || '#4a90e2';
    const diceDotColor = currentStyles.diceDotColor || '#ffffff';
    
    // Generate static 3D dice preview showing faces 4, 1, 5
    // Front face: 4 dots, Top face: 1 dot, Right face: 5 dots
    if (typeof generateDiceFaceSVG === 'function') {
      const size = 100;
      const dotRadius = 6;
      
      // Face 4 (front)
      const face4Positions = [
        { x: size / 4, y: size / 4 },
        { x: 3 * size / 4, y: size / 4 },
        { x: size / 4, y: 3 * size / 4 },
        { x: 3 * size / 4, y: 3 * size / 4 }
      ];
      const face4Dots = face4Positions.map(pos => 
        `<circle cx="${pos.x}" cy="${pos.y}" r="${dotRadius}" fill="${diceDotColor}"/>`
      ).join('');
      
      // Face 1 (top)
      const face1Positions = [{ x: size / 2, y: size / 2 }];
      const face1Dots = face1Positions.map(pos => 
        `<circle cx="${pos.x}" cy="${pos.y}" r="${dotRadius}" fill="${diceDotColor}"/>`
      ).join('');
      
      // Face 5 (right)
      const face5Positions = [
        { x: size / 4, y: size / 4 },
        { x: 3 * size / 4, y: size / 4 },
        { x: size / 2, y: size / 2 },
        { x: size / 4, y: 3 * size / 4 },
        { x: 3 * size / 4, y: 3 * size / 4 }
      ];
      const face5Dots = face5Positions.map(pos => 
        `<circle cx="${pos.x}" cy="${pos.y}" r="${dotRadius}" fill="${diceDotColor}"/>`
      ).join('');
      
      previewContent.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; perspective: 1000px;">
          <div style="width: 100px; height: 100px; position: relative; transform-style: preserve-3d; transform: rotateX(-20deg) rotateY(25deg);">
            <!-- Front face (4 dots) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateY(0deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                ${face4Dots}
              </svg>
            </div>
            <!-- Top face (1 dot) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateX(90deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                ${face1Dots}
              </svg>
            </div>
            <!-- Right face (5 dots) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateY(90deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                ${face5Dots}
              </svg>
            </div>
            <!-- Back face (opposite of 4 = 3 dots) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateY(180deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                <circle cx="${size / 4}" cy="${size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${size / 2}" cy="${size / 2}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${3 * size / 4}" cy="${3 * size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
              </svg>
            </div>
            <!-- Left face (opposite of 5 = 2 dots) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateY(-90deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                <circle cx="${size / 4}" cy="${size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${3 * size / 4}" cy="${3 * size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
              </svg>
            </div>
            <!-- Bottom face (opposite of 1 = 6 dots) -->
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${diceFaceColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); transform: rotateX(-90deg) translateZ(50px);">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
                <rect width="${size}" height="${size}" rx="8" ry="8" fill="${diceFaceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                <circle cx="${size / 4}" cy="${size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${3 * size / 4}" cy="${size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${size / 4}" cy="${size / 2}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${3 * size / 4}" cy="${size / 2}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${size / 4}" cy="${3 * size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
                <circle cx="${3 * size / 4}" cy="${3 * size / 4}" r="${dotRadius}" fill="${diceDotColor}"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
  } else if (previewContent && currentWidgetId === 'scoreboard-widget') {
    // Render scoreboard preview
    const config = currentStyles.scoreboardConfig || {
      teams: [
        { id: 'team1', name: 'Team 1', icon: '🚀', sliderColor: '#9b59b6' },
        { id: 'team2', name: 'Team 2', icon: '🦄', sliderColor: '#e74c3c' }
      ],
      targetScore: 10,
      increment: 1
    };
    
    // Show first 2 teams in preview with sample scores
    const previewTeams = config.teams.slice(0, 2);
    const sampleScores = [6, 3]; // Sample scores for preview
    
    previewContent.innerHTML = `
      <div style="width: 100%; padding: 12px; display: flex; flex-direction: column; gap: 12px;">
        ${previewTeams.map((team, index) => {
          const score = sampleScores[index] || 0;
          const percentage = config.targetScore > 0 ? Math.min((score / config.targetScore) * 100, 100) : 0;
          return `
            <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; color: var(--widget-text-primary, #fff);">
                <span style="font-size: 16px;">${team.icon}</span>
                <span>${team.name}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button style="width: 28px; height: 28px; border-radius: 50%; border: none; background: #2a2a2a; color: #fff; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer;">−</button>
                <div style="flex: 1; position: relative; height: 32px; display: flex; align-items: center;">
                  <div style="width: 100%; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.2); position: relative; overflow: visible;">
                    <div style="width: ${percentage}%; height: 100%; border-radius: 3px; background: ${team.sliderColor}; transition: width 0.3s ease; position: relative;">
                      <div style="position: absolute; right: -16px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; background: #ffffff; border: 3px solid ${team.sliderColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);">
                        ${team.icon}
                      </div>
                    </div>
                  </div>
                </div>
                <button style="width: 28px; height: 28px; border-radius: 50%; border: none; background: #2a2a2a; color: #fff; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer;">+</button>
                <div style="min-width: 30px; text-align: center; font-size: 18px; font-weight: 600; color: var(--widget-text-primary, #fff);">${score}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (currentWidgetId === 'blank-widget') {
    // Render clip art preview
    const clipArtVisible = currentStyles.clipArtVisible !== false; // Default to true
    const clipArtEmoji = currentStyles.clipArtEmoji || '🎨';
    const clipArtColor = currentStyles.clipArtColor || '#4a90e2';
    const clipArtTintColor = currentStyles.clipArtTintColor || '#ffffff';
    const clipArtImageUrl = currentStyles.clipArtImageUrl || '';
    const clipArtShadowEnabled = currentStyles.clipArtShadowEnabled !== false; // Default to true
    const clipArtTintEnabled = currentStyles.clipArtTintEnabled !== false; // Default to true
    let previewHtml = '';
    
    if (!clipArtVisible) {
      // Image is hidden
      previewHtml = '';
    } else if (clipArtImageUrl) {
      // Build filter string with shadow and tint (only if enabled)
      const shadowFilter = (clipArtShadowEnabled && clipArtColor) ? `drop-shadow(0 0 12px ${clipArtColor})` : '';
      const tintFilter = clipArtTintEnabled ? generateImageTintFilter(clipArtTintColor) : '';
      const combinedFilter = [shadowFilter, tintFilter].filter(f => f).join(' ');
      
      previewHtml = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px;">
          <img src="${clipArtImageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: ${combinedFilter || 'none'};" alt="Clip art">
        </div>
      `;
    } else {
      previewHtml = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px;">
          <div style="font-size: 120px; color: ${clipArtColor}; text-align: center; line-height: 1;">${clipArtEmoji}</div>
        </div>
      `;
    }
    if (previewContent) {
      previewContent.innerHTML = previewHtml;
    }
  } else if (previewContent && currentWidgetId !== 'dice-widget') {
    // Reset to default text for other widgets
    previewContent.innerHTML = 'Preview updates in real-time as you adjust settings';
  }

  // Apply widget opacity to border and shadow (via rgba if widget opacity < 100)
  if (currentStyles.widgetOpacity !== undefined && currentStyles.widgetOpacity < 100) {
    if (currentStyles.borderColor) {
      preview.style.borderColor = hexToRgba(currentStyles.borderColor, currentStyles.widgetOpacity);
    }
    
    if (currentStyles.shadowBlur !== undefined || currentStyles.shadowX !== undefined || currentStyles.shadowY !== undefined) {
      const x = currentStyles.shadowX || 0;
      const y = currentStyles.shadowY || 0;
      const blur = currentStyles.shadowBlur || 0;
      const spread = currentStyles.shadowSpread || 0;
      const shadowColor = currentStyles.shadowColor || 'rgba(0, 0, 0, 0.3)';
      // Extract rgba values and apply widget opacity
      const rgbaMatch = shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        const baseOpacity = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 0.3;
        const finalOpacity = (baseOpacity * currentStyles.widgetOpacity / 100);
        preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
      } else {
        preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${shadowColor}`;
      }
    }
  }
}

// Apply styles to widget(s)
function applyStyles() {
  if (!currentWidgetId) return;

  // Update currentStyles from form inputs before applying
  // This ensures we capture the latest form values even if event listeners didn't fire
  updateCurrentStylesFromForm();

  // Get apply-to-all flags
  updateApplyToAllFlags();

  // Apply to current widget or all widgets on current page
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
    ? window.currentPageIndex 
    : 0;
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  
  const widgetsToStyle = applyToAllFlags.global ? 
    (currentPage ? Array.from(currentPage.querySelectorAll('.widget:not(.hidden)')) : []) : 
    (currentPage ? [currentPage.querySelector(`.${currentWidgetId}`)].filter(w => w !== null) : []);

  widgetsToStyle.forEach(widget => {
    if (!widget) return;
    
    applyCurrentStylesToWidget(widget);
    
      // If applying to all, save styles for each widget on current page
      if (applyToAllFlags.global) {
        const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
        if (widgetId) {
          const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
          localStorage.setItem(`dakboard-widget-styles-${widgetId}-page-${currentPageIndex}`, JSON.stringify(currentStyles));
        }
      }
  });

  // Save styles for current widget
  saveStyles();
  
  // Close modal
  closeStylingModal();
}

// Update currentStyles from form inputs
function updateCurrentStylesFromForm() {
  // Scope queries to the styling modal to avoid conflicts with dashboard background modal
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  // Background type
  const bgType = stylingModal.querySelector('#bg-type');
  if (bgType) {
    currentStyles.backgroundType = bgType.value;
    
    // Update values based on background type
    if (bgType.value === 'solid') {
      const bgColor = stylingModal.querySelector('#bg-color');
      if (bgColor) currentStyles.backgroundColor = bgColor.value;
    } else if (bgType.value === 'transparent') {
      currentStyles.backgroundColor = 'transparent';
    } else if (bgType.value === 'gradient') {
      const gradColor1 = stylingModal.querySelector('#bg-gradient-color1');
      const gradColor2 = stylingModal.querySelector('#bg-gradient-color2');
      const gradDir = stylingModal.querySelector('#bg-gradient-direction');
      if (gradColor1) currentStyles.gradientColor1 = gradColor1.value;
      if (gradColor2) currentStyles.gradientColor2 = gradColor2.value;
      if (gradDir) currentStyles.gradientDirection = gradDir.value;
    } else if (bgType.value === 'image') {
      const imgUrl = stylingModal.querySelector('#bg-image-url');
      const imgRepeat = stylingModal.querySelector('#bg-image-repeat');
      const imgPosition = stylingModal.querySelector('#bg-image-position');
      const imgSize = stylingModal.querySelector('#bg-image-size');
      const imgOpacity = stylingModal.querySelector('#bg-image-opacity');
      if (imgUrl) currentStyles.backgroundImageUrl = imgUrl.value;
      if (imgRepeat) currentStyles.backgroundRepeat = imgRepeat.value;
      if (imgPosition) currentStyles.backgroundPosition = imgPosition.value;
      if (imgSize) currentStyles.backgroundSize = imgSize.value;
      if (imgOpacity) currentStyles.backgroundImageOpacity = parseInt(imgOpacity.value);
    } else if (bgType.value === 'pattern') {
      const patType = stylingModal.querySelector('#bg-pattern-type');
      const patColor = stylingModal.querySelector('#bg-pattern-color');
      const patSize = stylingModal.querySelector('#bg-pattern-size');
      if (patType) currentStyles.patternType = patType.value;
      if (patColor) currentStyles.patternColor = patColor.value;
      if (patSize) currentStyles.patternSize = parseInt(patSize.value);
    }
  }
  
  // Other style properties (scoped to styling modal)
  const bgColor = stylingModal.querySelector('#bg-color');
  if (bgColor) currentStyles.backgroundColor = bgColor.value;
  
  const opacity = document.getElementById('opacity');
  if (opacity) currentStyles.opacity = parseInt(opacity.value);
  
  const borderColor = document.getElementById('border-color');
  if (borderColor) currentStyles.borderColor = borderColor.value;
  
  const borderWidth = document.getElementById('border-width');
  if (borderWidth) currentStyles.borderWidth = parseInt(borderWidth.value);
  
  const borderStyle = document.getElementById('border-style');
  if (borderStyle) currentStyles.borderStyle = borderStyle.value;
  
  const borderRadius = document.getElementById('border-radius');
  if (borderRadius) currentStyles.borderRadius = parseInt(borderRadius.value);
  
  const shadowColor = document.getElementById('shadow-color');
  if (shadowColor) currentStyles.shadowColor = shadowColor.value;
  
  const shadowBlur = document.getElementById('shadow-blur');
  if (shadowBlur) currentStyles.shadowBlur = parseInt(shadowBlur.value);
  
  const shadowX = document.getElementById('shadow-x');
  if (shadowX) currentStyles.shadowX = parseInt(shadowX.value);
  
  const shadowY = document.getElementById('shadow-y');
  if (shadowY) currentStyles.shadowY = parseInt(shadowY.value);
  
  const shadowSpread = document.getElementById('shadow-spread');
  if (shadowSpread) currentStyles.shadowSpread = parseInt(shadowSpread.value);
  
  // Title settings
  const titleVisible = document.getElementById('title-visible');
  if (titleVisible) currentStyles.titleVisible = titleVisible.checked;
  
  const titleIconVisible = document.getElementById('title-icon-visible');
  if (titleIconVisible) currentStyles.titleIconVisible = titleIconVisible.checked;
  
  const titleText = document.getElementById('title-text');
  if (titleText) {
    const defaultTitle = WIDGET_CONFIG[currentWidgetId]?.name || 'Widget';
    // Only save if different from default (to allow resetting to default)
    if (titleText.value && titleText.value !== defaultTitle) {
      currentStyles.titleText = titleText.value;
    } else {
      delete currentStyles.titleText; // Use default
    }
  }
  
  const titleAlignment = document.getElementById('title-alignment');
  if (titleAlignment) currentStyles.titleAlignment = titleAlignment.value;
  
  const textColor = document.getElementById('text-color');
  const textColorDynamic = document.getElementById('text-color-dynamic');
  if (textColorDynamic) {
    currentStyles.textColorDynamic = textColorDynamic.checked;
  }
  if (textColor && !textColorDynamic?.checked) {
    // Only save textColor if dynamic mode is off
    currentStyles.textColor = textColor.value;
  } else if (textColorDynamic?.checked) {
    // If dynamic is on, remove textColor
    delete currentStyles.textColor;
  }
  
  const fontSize = document.getElementById('font-size');
  if (fontSize) currentStyles.fontSize = parseInt(fontSize.value);
  
  const fontWeight = document.getElementById('font-weight');
  if (fontWeight) currentStyles.fontWeight = fontWeight.value;
  
  const padding = document.getElementById('padding');
  if (padding) currentStyles.padding = parseInt(padding.value);
  
  const widgetOpacity = document.getElementById('widget-opacity');
  if (widgetOpacity) currentStyles.widgetOpacity = parseInt(widgetOpacity.value);
  
  // Dice widget colors
  const diceFaceColor = stylingModal.querySelector('#dice-face-color');
  const diceFaceColorText = stylingModal.querySelector('#dice-face-color-text');
  if (diceFaceColor && diceFaceColorText) {
    currentStyles.diceFaceColor = diceFaceColor.value;
  }
  
  const diceDotColor = stylingModal.querySelector('#dice-dot-color');
  const diceDotColorText = stylingModal.querySelector('#dice-dot-color-text');
  if (diceDotColor && diceDotColorText) {
    currentStyles.diceDotColor = diceDotColor.value;
  }
  
  // Stopwatch widget colors
  const stopwatchTextColor = stylingModal.querySelector('#stopwatch-text-color');
  const stopwatchTextColorText = stylingModal.querySelector('#stopwatch-text-color-text');
  if (stopwatchTextColor && stopwatchTextColorText) {
    currentStyles.stopwatchTextColor = stopwatchTextColor.value;
  }
  
  const stopwatchPlayButtonColor = stylingModal.querySelector('#stopwatch-play-button-color');
  const stopwatchPlayButtonColorText = stylingModal.querySelector('#stopwatch-play-button-color-text');
  if (stopwatchPlayButtonColor && stopwatchPlayButtonColorText) {
    currentStyles.stopwatchPlayButtonColor = stopwatchPlayButtonColor.value;
  }
  
  const stopwatchResetButtonColor = stylingModal.querySelector('#stopwatch-reset-button-color');
  const stopwatchResetButtonColorText = stylingModal.querySelector('#stopwatch-reset-button-color-text');
  if (stopwatchResetButtonColor && stopwatchResetButtonColorText) {
    currentStyles.stopwatchResetButtonColor = stopwatchResetButtonColor.value;
  }
  
}

// Apply current styles to a single widget
function applyCurrentStylesToWidget(widget) {
  // When applying to all widgets, only apply if the "apply to all" checkbox is checked for that property
  // When applying to a single widget, always apply (checkbox doesn't matter)
  const isApplyingToAll = applyToAllFlags.global;
  
  // Background - use currentStyles to ensure background is preserved when other properties change
  const bgType = currentStyles.backgroundType || 'solid';
  
  // Clear previous background styles
  widget.style.backgroundColor = '';
  widget.style.backgroundImage = '';
  widget.style.backgroundRepeat = '';
  widget.style.backgroundPosition = '';
  widget.style.backgroundSize = '';
  // Note: Don't clear opacity here - it will be set appropriately below based on background type and widgetOpacity
  
  // Get background opacity (applies to all background types including images)
  const bgOpacity = currentStyles.opacity !== undefined ? currentStyles.opacity : 100;
  
  // Apply background based on type, using currentStyles values
  switch(bgType) {
    case 'solid':
      const solidColor = currentStyles.backgroundColor || '#2a2a2a';
      if (!isApplyingToAll || applyToAllFlags.backgroundColor) {
        // Apply background opacity using rgba
        widget.style.backgroundColor = bgOpacity < 100 ? hexToRgba(solidColor, bgOpacity) : solidColor;
      }
      break;
      
    case 'transparent':
      if (!isApplyingToAll || applyToAllFlags.backgroundColor) {
        widget.style.backgroundColor = 'transparent';
      }
      break;
      
    case 'gradient':
      const color1 = currentStyles.gradientColor1 || '#2a2a2a';
      const color2 = currentStyles.gradientColor2 || '#3a3a3a';
      const direction = currentStyles.gradientDirection || 'to bottom';
      if (!isApplyingToAll || applyToAllFlags.gradientColor1 || applyToAllFlags.gradientColor2) {
        // Apply background opacity using rgba in gradient
        const rgbaColor1 = bgOpacity < 100 ? hexToRgba(color1, bgOpacity) : color1;
        const rgbaColor2 = bgOpacity < 100 ? hexToRgba(color2, bgOpacity) : color2;
        widget.style.backgroundImage = `linear-gradient(${direction}, ${rgbaColor1}, ${rgbaColor2})`;
      }
      break;
      
    case 'image':
      const imageUrl = currentStyles.backgroundImageUrl || '';
      if (imageUrl && (!isApplyingToAll || applyToAllFlags.backgroundImageUrl)) {
        widget.style.backgroundImage = `url(${imageUrl})`;
        widget.style.backgroundRepeat = currentStyles.backgroundRepeat || 'no-repeat';
        widget.style.backgroundPosition = currentStyles.backgroundPosition || 'center';
        widget.style.backgroundSize = currentStyles.backgroundSize || 'cover';
        // For images, apply opacity to widget but content will be set to opacity: 1 below
        if (bgOpacity < 100 && (!isApplyingToAll || applyToAllFlags.opacity)) {
          widget.style.opacity = bgOpacity / 100;
        } else {
          widget.style.opacity = '';
        }
      }
      break;
      
    case 'pattern':
      const patternType = currentStyles.patternType || 'dots';
      const patternColor = currentStyles.patternColor || '#3a3a3a';
      const patternSize = currentStyles.patternSize !== undefined ? currentStyles.patternSize : 20;
      if (!isApplyingToAll || applyToAllFlags.patternType || applyToAllFlags.patternColor) {
        const patternCSS = generatePatternCSS(patternType, patternColor, patternSize);
        // Extract background-image and background-size from pattern CSS
        const bgImageMatch = patternCSS.match(/background-image:\s*([^;]+);/);
        const bgSizeMatch = patternCSS.match(/background-size:\s*([^;]+);/);
        if (bgImageMatch) {
          widget.style.backgroundImage = bgImageMatch[1].trim();
        }
        if (bgSizeMatch) {
          widget.style.backgroundSize = bgSizeMatch[1].trim();
        }
        // For patterns, apply opacity to widget but content will be set to opacity: 1 below
        if (bgOpacity < 100 && (!isApplyingToAll || applyToAllFlags.opacity)) {
          widget.style.opacity = bgOpacity / 100;
        } else {
          widget.style.opacity = '';
        }
        widget.style.backgroundColor = '#1a1a1a';
      }
      break;
  }

  // Border
  if (currentStyles.borderColor !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.borderColor) {
      widget.style.borderColor = currentStyles.borderColor;
    }
  }
  if (currentStyles.borderWidth !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.borderWidth) {
      widget.style.borderWidth = currentStyles.borderWidth + 'px';
    }
  }
  if (currentStyles.borderStyle !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.borderStyle) {
      widget.style.borderStyle = currentStyles.borderStyle;
    }
  }
  if (currentStyles.borderRadius !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.borderRadius) {
      widget.style.borderRadius = currentStyles.borderRadius + 'px';
    }
  }

  // Shadow
  if (currentStyles.shadowBlur !== undefined || currentStyles.shadowX !== undefined || currentStyles.shadowY !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.shadowColor || applyToAllFlags.shadowBlur) {
      const x = currentStyles.shadowX !== undefined ? currentStyles.shadowX : 0;
      const y = currentStyles.shadowY !== undefined ? currentStyles.shadowY : 4;
      const blur = currentStyles.shadowBlur !== undefined ? currentStyles.shadowBlur : 6;
      const spread = currentStyles.shadowSpread !== undefined ? currentStyles.shadowSpread : 0;
      const color = currentStyles.shadowColor || 'rgba(0, 0, 0, 0.3)';
      widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }
  }

  // Title visibility, text, and alignment
  // SPECIAL CASE: Calendar and Whiteboard widgets have custom header layouts with functional elements
  // (Calendar has month-view button, Whiteboard has toolbar) - skip standard title styling for these
  const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
  const isSpecialWidget = widgetId === 'calendar-widget' || widgetId === 'whiteboard-widget';
  
  if (!isSpecialWidget) {
    // Find the real header (not the minimal edit header)
    const allHeaders = widget.querySelectorAll('.widget-header');
    let widgetHeader = null;
    // Find the header that is NOT a minimal edit header
    allHeaders.forEach(h => {
      if (!h.classList.contains('widget-edit-header')) {
        widgetHeader = h;
      }
    });
    
    if (widgetHeader) {
      // Title visibility
      if (currentStyles.titleVisible !== undefined) {
        if (!isApplyingToAll || applyToAllFlags.titleVisible) {
          widgetHeader.style.display = currentStyles.titleVisible ? '' : 'none';
        }
      }
      
      // Title alignment - always apply to override CSS default (space-between)
      // Default to 'left' if not set
      // Use setProperty with !important to ensure it overrides CSS defaults
      // Always apply alignment when not applying to all, or when applying to all with flag checked
      const alignment = currentStyles.titleAlignment || 'left';
      const shouldApplyAlignment = !isApplyingToAll || applyToAllFlags.titleAlignment;
      
      if (shouldApplyAlignment) {
        const justifyContent = alignment === 'center' ? 'center' : 'flex-start';
        const textAlign = alignment === 'center' ? 'center' : 'left';
        // Ensure header always takes full width to prevent collapsing
        widgetHeader.style.setProperty('width', '100%', 'important');
        widgetHeader.style.setProperty('min-width', '100%', 'important');
        widgetHeader.style.setProperty('justify-content', justifyContent, 'important');
        widgetHeader.style.setProperty('text-align', textAlign, 'important');
        // Also ensure the title itself doesn't have centering and doesn't expand to full width
        const title = widgetHeader.querySelector('.widget-title');
        if (title) {
          title.style.setProperty('justify-content', justifyContent, 'important');
          title.style.setProperty('text-align', textAlign, 'important');
          // Prevent title from expanding to full width when left-aligned
          if (alignment === 'left') {
            title.style.setProperty('width', 'auto', 'important');
            title.style.setProperty('flex', '0 0 auto', 'important');
            title.style.setProperty('max-width', 'fit-content', 'important');
            title.style.setProperty('flex-grow', '0', 'important');
            title.style.setProperty('flex-shrink', '0', 'important');
          } else {
            title.style.removeProperty('width');
            title.style.removeProperty('flex');
            title.style.removeProperty('max-width');
            title.style.removeProperty('flex-grow');
            title.style.removeProperty('flex-shrink');
          }
        }
        
        // DEBUG LOGGING - Compare widget dimensions and styles
        const widgetRect = widget.getBoundingClientRect();
        const headerRect = widgetHeader.getBoundingClientRect();
        const titleRect = title ? title.getBoundingClientRect() : null;
        const computedHeaderStyle = window.getComputedStyle(widgetHeader);
        const computedTitleStyle = title ? window.getComputedStyle(title) : null;
        
        // Get all CSS rules that might affect the title
        const titleRules = [];
        if (title) {
          const sheets = document.styleSheets;
          for (let i = 0; i < sheets.length; i++) {
            try {
              const rules = sheets[i].cssRules || sheets[i].rules;
              for (let j = 0; j < rules.length; j++) {
                if (rules[j].selectorText && title.matches(rules[j].selectorText)) {
                  titleRules.push({
                    selector: rules[j].selectorText,
                    width: rules[j].style.width,
                    flex: rules[j].style.flex,
                    flexGrow: rules[j].style.flexGrow,
                    flexShrink: rules[j].style.flexShrink,
                    maxWidth: rules[j].style.maxWidth,
                    display: rules[j].style.display
                  });
                }
              }
            } catch (e) {
              // Cross-origin stylesheet, skip
            }
          }
        }
      }
    }
  }

  // Text (widget title)
  // SPECIAL CASE: Calendar and Whiteboard widgets - skip editable title text for these
  // Calendar has custom icon and month button, Whiteboard has toolbar in header
  const title = widget.querySelector('.widget-title');
  if (title && !isSpecialWidget) {
    // Get widget ID and icon
    const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
    const widgetIcon = widgetId && WIDGET_CONFIG[widgetId] ? WIDGET_CONFIG[widgetId].icon : '';
    
    // Determine title text (custom or default)
    let titleTextValue = currentStyles.titleText;
    if (titleTextValue === undefined) {
      // Use default from WIDGET_CONFIG if no custom title
      if (widgetId && WIDGET_CONFIG[widgetId]) {
        titleTextValue = WIDGET_CONFIG[widgetId].name;
      } else {
        titleTextValue = 'Widget';
      }
    }
    
    // Determine if icon should be shown
    const showIcon = currentStyles.titleIconVisible !== undefined 
      ? currentStyles.titleIconVisible 
      : true; // Default to true if not set
    
    // Apply title text with optional icon
    if (!isApplyingToAll || applyToAllFlags.titleText || applyToAllFlags.titleIconVisible) {
      if (showIcon && widgetIcon) {
        title.textContent = `${widgetIcon} ${titleTextValue}`;
      } else {
        title.textContent = titleTextValue;
      }
    }
    
    // Only apply inline color if textColorDynamic is false (manual mode)
    // If textColorDynamic is true or undefined, let CSS variable handle it
    if (currentStyles.textColorDynamic === false && currentStyles.textColor !== undefined) {
      if (!isApplyingToAll || applyToAllFlags.textColor) {
        title.style.color = currentStyles.textColor;
      }
    } else {
      // Dynamic mode: remove inline color to let CSS variable handle it
      if (!isApplyingToAll || applyToAllFlags.textColor) {
        title.style.color = '';
      }
    }
    if (currentStyles.fontSize !== undefined) {
      if (!isApplyingToAll || applyToAllFlags.fontSize) {
        title.style.fontSize = currentStyles.fontSize + 'px';
      }
    }
    if (currentStyles.fontWeight !== undefined) {
      if (!isApplyingToAll || applyToAllFlags.fontWeight) {
        title.style.fontWeight = currentStyles.fontWeight;
      }
    }
    // Apply widget opacity to title (independent of background opacity)
    if (currentStyles.widgetOpacity !== undefined && (!isApplyingToAll || applyToAllFlags.widgetOpacity)) {
      title.style.opacity = (currentStyles.widgetOpacity / 100);
    } else {
      // If background opacity was applied to widget (for images/patterns), counteract on content
      if ((bgType === 'image' || bgType === 'pattern') && bgOpacity < 100) {
        title.style.opacity = '1';
      } else {
        title.style.opacity = '';
      }
    }
  }

  // Padding
  if (currentStyles.padding !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.padding) {
      widget.style.padding = currentStyles.padding + 'px';
    }
  }

  // Widget opacity for content elements (borders, shadows, etc.)
  // Apply widget opacity to border (via rgba if widget opacity < 100)
  if (currentStyles.widgetOpacity !== undefined && currentStyles.widgetOpacity < 100 && 
      currentStyles.borderColor !== undefined && (!isApplyingToAll || applyToAllFlags.widgetOpacity)) {
    widget.style.borderColor = hexToRgba(currentStyles.borderColor, currentStyles.widgetOpacity);
  }
  
  // Apply widget opacity to shadow (via rgba if widget opacity < 100)
  if (currentStyles.widgetOpacity !== undefined && currentStyles.widgetOpacity < 100 &&
      (currentStyles.shadowBlur !== undefined || currentStyles.shadowX !== undefined || currentStyles.shadowY !== undefined) && 
      (!isApplyingToAll || applyToAllFlags.shadowColor || applyToAllFlags.shadowBlur)) {
    const x = currentStyles.shadowX !== undefined ? currentStyles.shadowX : 0;
    const y = currentStyles.shadowY !== undefined ? currentStyles.shadowY : 4;
    const blur = currentStyles.shadowBlur !== undefined ? currentStyles.shadowBlur : 6;
    const spread = currentStyles.shadowSpread !== undefined ? currentStyles.shadowSpread : 0;
    const shadowColor = currentStyles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    // Extract rgba values and apply widget opacity
    const rgbaMatch = shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = rgbaMatch[1];
      const g = rgbaMatch[2];
      const b = rgbaMatch[3];
      const baseOpacity = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 0.3;
      const finalOpacity = (baseOpacity * currentStyles.widgetOpacity / 100);
      widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    } else {
      widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${shadowColor}`;
    }
  }
  
  // Update thermostat control styles if this is a thermostat widget
  if (widget.classList.contains('thermostat-widget') && typeof updateThermostatControlStyles === 'function') {
    // Use setTimeout to ensure background styles are applied first
    setTimeout(() => updateThermostatControlStyles(widget), 0);
  }
  
  // Update dice colors if this is a dice widget
  if (widget.classList.contains('dice-widget')) {
    const diceFaceColor = currentStyles.diceFaceColor || '#4a90e2';
    const diceDotColor = currentStyles.diceDotColor || '#ffffff';
    if (!isApplyingToAll || applyToAllFlags.diceFaceColor || applyToAllFlags.diceDotColor) {
      // Reload dice with new colors
      if (typeof loadDice === 'function') {
        setTimeout(() => loadDice(), 0);
      }
    }
  }
  
  // Update stopwatch colors if this is a stopwatch widget
  if (widget.classList.contains('stopwatch-widget')) {
    const textColor = currentStyles.stopwatchTextColor || '#1a1a1a';
    const playButtonColor = currentStyles.stopwatchPlayButtonColor || '#4a90e2';
    const resetButtonColor = currentStyles.stopwatchResetButtonColor || '#ffffff';
    if (!isApplyingToAll || applyToAllFlags.stopwatchTextColor || applyToAllFlags.stopwatchPlayButtonColor || applyToAllFlags.stopwatchResetButtonColor) {
      // Apply colors to stopwatch elements
      const display = widget.querySelector('#stopwatch-display');
      const playPauseBtn = widget.querySelector('#stopwatch-play-pause');
      const resetBtn = widget.querySelector('#stopwatch-reset');
      
      if (display) display.style.color = textColor;
      if (playPauseBtn) playPauseBtn.style.backgroundColor = playButtonColor;
      if (resetBtn) {
        resetBtn.style.backgroundColor = resetButtonColor;
        resetBtn.style.color = '#1a1a1a';
      }
    }
  }
  
  // Update scoreboard configuration if this is a scoreboard widget
  if (widget.classList.contains('scoreboard-widget')) {
    if (currentStyles.scoreboardConfig) {
      // Save config to localStorage and reload scoreboard
      const pageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
        ? window.currentPageIndex 
        : 0;
      const widgetIndex = Array.from(document.querySelectorAll('.scoreboard-widget')).indexOf(widget);
      const widgetId = `scoreboard-${pageIndex}-${widgetIndex}`;
      
      const config = typeof currentStyles.scoreboardConfig === 'string'
        ? JSON.parse(currentStyles.scoreboardConfig)
        : currentStyles.scoreboardConfig;
      
      const configKey = `dakboard-scoreboard-config-${widgetId}`;
      localStorage.setItem(configKey, JSON.stringify(config));
      
      // Update the config in memory
      if (typeof scoreboardConfigs !== 'undefined') {
        scoreboardConfigs.set(widgetId, config);
      }
      
      // Reload scoreboard
      if (typeof loadScoreboard === 'function') {
        setTimeout(() => loadScoreboard(), 0);
      }
    }
  }
  
  // Update clip art if this is a blank widget
  if (widget.classList.contains('blank-widget')) {
    const clipArtEmoji = currentStyles.clipArtEmoji || '🎨';
    const clipArtColor = currentStyles.clipArtColor || '#4a90e2';
    if (!isApplyingToAll || applyToAllFlags.clipArtEmoji || applyToAllFlags.clipArtColor) {
      // Reload clip art with new emoji and color
      if (typeof loadClipArt === 'function') {
        setTimeout(() => loadClipArt(), 0);
      }
    }
  }
  
  // Update dynamic styles (for dynamic title color) if enabled
  // This must be called after all background styles are applied
  if (currentStyles.textColorDynamic !== false && typeof updateWidgetDynamicStyles === 'function') {
    // Use setTimeout to ensure background styles are applied first
    setTimeout(() => updateWidgetDynamicStyles(widget), 0);
  }
  
  // Re-initialize z-index controls if in edit mode (header visibility may have changed)
  const pageElement = widget.closest('.dashboard.page');
  if (pageElement && pageElement.classList.contains('edit-mode')) {
    if (typeof addZIndexControls === 'function') {
      setTimeout(() => addZIndexControls(widget), 0);
    }
  }
}

// Update apply-to-all flags from checkboxes
function updateApplyToAllFlags() {
  applyToAllFlags.backgroundColor = document.getElementById('bg-color-apply-all')?.checked || false;
  applyToAllFlags.backgroundType = document.getElementById('bg-type-apply-all')?.checked || false;
  applyToAllFlags.opacity = document.getElementById('opacity-apply-all')?.checked || false;
  applyToAllFlags.borderColor = document.getElementById('border-color-apply-all')?.checked || false;
  applyToAllFlags.borderWidth = document.getElementById('border-width-apply-all')?.checked || false;
  applyToAllFlags.borderStyle = document.getElementById('border-style-apply-all')?.checked || false;
  applyToAllFlags.borderRadius = document.getElementById('border-radius-apply-all')?.checked || false;
  applyToAllFlags.shadowColor = document.getElementById('shadow-color-apply-all')?.checked || false;
  applyToAllFlags.shadowBlur = document.getElementById('shadow-blur-apply-all')?.checked || false;
  applyToAllFlags.titleVisible = document.getElementById('title-visible-apply-all')?.checked || false;
  applyToAllFlags.titleIconVisible = document.getElementById('title-icon-visible-apply-all')?.checked || false;
  applyToAllFlags.titleText = document.getElementById('title-text-apply-all')?.checked || false;
  applyToAllFlags.titleAlignment = document.getElementById('title-alignment-apply-all')?.checked || false;
  applyToAllFlags.textColor = document.getElementById('text-color-apply-all')?.checked || false;
  applyToAllFlags.fontSize = document.getElementById('font-size-apply-all')?.checked || false;
  applyToAllFlags.fontWeight = document.getElementById('font-weight-apply-all')?.checked || false;
  applyToAllFlags.padding = document.getElementById('padding-apply-all')?.checked || false;
  applyToAllFlags.widgetOpacity = document.getElementById('widget-opacity-apply-all')?.checked || false;
  applyToAllFlags.diceFaceColor = document.getElementById('dice-face-color-apply-all')?.checked || false;
  applyToAllFlags.diceDotColor = document.getElementById('dice-dot-color-apply-all')?.checked || false;
  applyToAllFlags.stopwatchTextColor = document.getElementById('stopwatch-text-color-apply-all')?.checked || false;
  applyToAllFlags.stopwatchPlayButtonColor = document.getElementById('stopwatch-play-button-color-apply-all')?.checked || false;
  applyToAllFlags.stopwatchResetButtonColor = document.getElementById('stopwatch-reset-button-color-apply-all')?.checked || false;
  applyToAllFlags.clipArtColor = document.getElementById('clipart-color-apply-all')?.checked || false;
  applyToAllFlags.clipArtTintColor = document.getElementById('clipart-tint-color-apply-all')?.checked || false;
  
  // Check if any apply-to-all is checked
  applyToAllFlags.global = Object.values(applyToAllFlags).some(v => v === true);
}

// Reset styles
function resetStyles() {
  if (!currentWidgetId) return;
  
  // Reset current styles to defaults
  currentStyles = {
    backgroundColor: '#2a2a2a',
    opacity: 100,
    borderColor: '#3a3a3a',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowBlur: 6,
    shadowX: 0,
    shadowY: 4,
    shadowSpread: 0,
      textColorDynamic: true, // Default to dynamic
      fontSize: 18,
      fontWeight: '600',
      padding: 24,
      widgetOpacity: 100
    };
  
  // Reset widget to defaults
  // Find widget on current page
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
    ? window.currentPageIndex 
    : 0;
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  const widget = currentPage ? currentPage.querySelector(`.${currentWidgetId}`) : document.querySelector(`.${currentWidgetId}`);
  if (widget) {
    widget.style.backgroundColor = '#2a2a2a';
    widget.style.borderColor = '';
    widget.style.borderWidth = '';
    widget.style.borderStyle = '';
    widget.style.borderRadius = '12px';
    widget.style.boxShadow = '';
    widget.style.opacity = '';
    widget.style.padding = '24px';
    
    const title = widget.querySelector('.widget-title');
    if (title) {
      // Reset text color to use dynamic (remove inline style)
      title.style.color = '';
      title.style.fontSize = '18px';
      // Reset text color to use dynamic (remove inline style)
      title.style.color = '';
      title.style.fontWeight = '600';
    }
  }
  
  // Clear saved styles (page-specific)
  localStorage.removeItem(`dakboard-widget-styles-${currentWidgetId}-page-${currentPageIndex}`);
  
  // Reload tab to show defaults
  const activeTab = document.querySelector('.styling-tab.active');
  if (activeTab) {
    switchTab(activeTab.dataset.tab);
  }
  
  // Update preview
  updatePreview();
}

// Save theme
function saveTheme() {
  const themeName = prompt('Enter theme name:');
  if (!themeName) return;
  
  const theme = {
    name: themeName,
    styles: currentStyles,
    applyToAll: applyToAllFlags,
    timestamp: new Date().toISOString()
  };
  
  const themes = JSON.parse(localStorage.getItem('dakboard-themes') || '[]');
  themes.push(theme);
  localStorage.setItem('dakboard-themes', JSON.stringify(themes));
  
  alert(`Theme "${themeName}" saved!`);
}

// Load widget styles (page-specific)
function loadWidgetStyles(widgetId) {
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  const saved = localStorage.getItem(`dakboard-widget-styles-${widgetId}-page-${currentPageIndex}`);
  if (saved) {
    currentStyles = JSON.parse(saved);
    // For existing widgets, set textColorDynamic based on whether textColor exists
    // If textColor is set and not the default, assume it was manually set (dynamic = false)
    // If textColor is not set or is default, assume dynamic (dynamic = true)
    if (currentStyles.textColorDynamic === undefined) {
      if (currentStyles.textColor && currentStyles.textColor !== '#fff') {
        currentStyles.textColorDynamic = false; // Manual color was set
      } else {
        currentStyles.textColorDynamic = true; // No manual color, use dynamic
      }
    }
  } else {
    // Set defaults
    // For clock and photos widgets, default titleVisible to false (was hardcoded hidden)
    const defaultTitleVisible = (widgetId === 'clock-widget') ? false : true;
    
    currentStyles = {
      backgroundColor: '#2a2a2a',
      opacity: 100,
      borderColor: '#3a3a3a',
      borderWidth: 0,
      borderStyle: 'none',
      borderRadius: 12,
      shadowColor: '#000000',
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 4,
      shadowSpread: 0,
      titleVisible: defaultTitleVisible,
      titleIconVisible: true, // Default to showing icons
      titleAlignment: 'left',
      textColorDynamic: true, // Default to dynamic for new widgets
      fontSize: 18,
      fontWeight: '600',
      padding: 24,
      widgetOpacity: 100
    };
  }
  
  // Ensure titleVisible is set for existing widgets (migration)
  if (currentStyles.titleVisible === undefined) {
    // For clock and photos, default to false (was hardcoded hidden)
    currentStyles.titleVisible = (widgetId === 'clock-widget') ? false : true;
  }
  
  // Ensure titleIconVisible is set (default to true)
  if (currentStyles.titleIconVisible === undefined) {
    currentStyles.titleIconVisible = true;
  }
  
  // Ensure titleAlignment is set (default to left)
  if (currentStyles.titleAlignment === undefined) {
    currentStyles.titleAlignment = 'left';
  }
  
  // Load scoreboard config if this is a scoreboard widget
  if (widgetId === 'scoreboard-widget') {
    // Try to load from widget-specific localStorage
    const pageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
      ? window.currentPageIndex 
      : 0;
    const widget = document.querySelector(`.scoreboard-widget`);
    if (widget) {
      const widgetIndex = Array.from(document.querySelectorAll('.scoreboard-widget')).indexOf(widget);
      const widgetId = `scoreboard-${pageIndex}-${widgetIndex}`;
      const configKey = `dakboard-scoreboard-config-${widgetId}`;
      const savedConfig = localStorage.getItem(configKey);
      
      if (savedConfig) {
        try {
          currentStyles.scoreboardConfig = JSON.parse(savedConfig);
        } catch (e) {
          console.error('Error parsing scoreboard config:', e);
        }
      }
    }
  }
  
  // Set clip art defaults if this is a blank widget
  if (widgetId === 'blank-widget') {
    if (!currentStyles.clipArtEmoji) {
      currentStyles.clipArtEmoji = '🎨';
    }
    if (!currentStyles.clipArtColor) {
      currentStyles.clipArtColor = '#4a90e2';
    }
  }
}

// Save styles (page-specific)
function saveStyles() {
  if (currentWidgetId) {
    const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
    localStorage.setItem(`dakboard-widget-styles-${currentWidgetId}-page-${currentPageIndex}`, JSON.stringify(currentStyles));
  }
}

// Load all styles on page load (page-specific)
function loadStyles() {
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  if (!currentPage) return;
  
  currentPage.querySelectorAll('.widget').forEach(widget => {
    const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
    if (widgetId) {
      const saved = localStorage.getItem(`dakboard-widget-styles-${widgetId}-page-${currentPageIndex}`);
      if (saved) {
        const styles = JSON.parse(saved);
        loadStylesToWidget(widget, styles);
      } else {
        // Apply default alignment even if no saved styles exist
        // This ensures title alignment works for widgets that haven't been styled yet
        const isSpecialWidget = widgetId === 'calendar-widget' || widgetId === 'whiteboard-widget';
        if (!isSpecialWidget) {
          const widgetHeader = widget.querySelector('.widget-header');
          if (widgetHeader) {
            // Apply default left alignment to override CSS space-between
            // Ensure header always takes full width to prevent collapsing
            widgetHeader.style.setProperty('width', '100%', 'important');
            widgetHeader.style.setProperty('min-width', '100%', 'important');
            widgetHeader.style.setProperty('justify-content', 'flex-start', 'important');
            widgetHeader.style.setProperty('text-align', 'left', 'important');
            const title = widgetHeader.querySelector('.widget-title');
            if (title) {
              title.style.setProperty('justify-content', 'flex-start', 'important');
              title.style.setProperty('text-align', 'left', 'important');
              title.style.setProperty('width', 'auto', 'important');
              title.style.setProperty('flex', '0 0 auto', 'important');
              title.style.setProperty('max-width', 'fit-content', 'important');
              title.style.setProperty('flex-grow', '0', 'important');
              title.style.setProperty('flex-shrink', '0', 'important');
            }
            
            // DEBUG LOGGING - Default alignment application
            setTimeout(() => {
              const widgetRect = widget.getBoundingClientRect();
              const headerRect = widgetHeader.getBoundingClientRect();
              const titleRect = title ? title.getBoundingClientRect() : null;
              const computedHeaderStyle = window.getComputedStyle(widgetHeader);
              const computedTitleStyle = title ? window.getComputedStyle(title) : null;
              
              // Get all CSS rules that might affect the title
              const titleRules = [];
              if (title) {
                const sheets = document.styleSheets;
                for (let i = 0; i < sheets.length; i++) {
                  try {
                    const rules = sheets[i].cssRules || sheets[i].rules;
                    for (let j = 0; j < rules.length; j++) {
                      if (rules[j].selectorText && title.matches(rules[j].selectorText)) {
                        titleRules.push({
                          selector: rules[j].selectorText,
                          width: rules[j].style.width,
                          flex: rules[j].style.flex,
                          flexGrow: rules[j].style.flexGrow,
                          flexShrink: rules[j].style.flexShrink,
                          maxWidth: rules[j].style.maxWidth,
                          display: rules[j].style.display
                        });
                      }
                    }
                  } catch (e) {
                    // Cross-origin stylesheet, skip
                  }
                }
              }
            }, 100);
          }
        }
      }
    }
  });
  
  // Load dashboard background (new format)
  loadBackgroundSettings();
  
  // Reload dice widget if it exists to apply saved colors
  if (typeof loadDice === 'function') {
    setTimeout(() => loadDice(), 100);
  }
}

// Load saved styles to widget (for page load)
function loadStylesToWidget(widget, styles) {
  if (!styles) return;
  
  // Clear previous background styles
  widget.style.backgroundColor = '';
  widget.style.backgroundImage = '';
  widget.style.backgroundRepeat = '';
  widget.style.backgroundPosition = '';
  widget.style.backgroundSize = '';
  
  // Get background opacity (applies to all background types including images)
  const bgOpacity = styles.opacity !== undefined ? styles.opacity : 100;
  
  // Apply background based on type
  const bgType = styles.backgroundType || 'solid';
  switch(bgType) {
    case 'solid':
      if (styles.backgroundColor) {
        // Apply background opacity using rgba
        widget.style.backgroundColor = bgOpacity < 100 ? hexToRgba(styles.backgroundColor, bgOpacity) : styles.backgroundColor;
      }
      break;
      
    case 'transparent':
      widget.style.backgroundColor = 'transparent';
      break;
      
    case 'gradient':
      const color1 = styles.gradientColor1 || '#2a2a2a';
      const color2 = styles.gradientColor2 || '#3a3a3a';
      const direction = styles.gradientDirection || 'to bottom';
      // Apply background opacity using rgba in gradient
      const rgbaColor1 = bgOpacity < 100 ? hexToRgba(color1, bgOpacity) : color1;
      const rgbaColor2 = bgOpacity < 100 ? hexToRgba(color2, bgOpacity) : color2;
      widget.style.backgroundImage = `linear-gradient(${direction}, ${rgbaColor1}, ${rgbaColor2})`;
      break;
      
    case 'image':
      if (styles.backgroundImageUrl) {
        widget.style.backgroundImage = `url(${styles.backgroundImageUrl})`;
        widget.style.backgroundRepeat = styles.backgroundRepeat || 'no-repeat';
        widget.style.backgroundPosition = styles.backgroundPosition || 'center';
        widget.style.backgroundSize = styles.backgroundSize || 'cover';
        // For images, apply opacity to widget but content will be set to opacity: 1 below
        if (bgOpacity < 100) {
          widget.style.opacity = bgOpacity / 100;
        } else {
          widget.style.opacity = '';
        }
      }
      break;
      
    case 'pattern':
      if (styles.patternType && styles.patternColor) {
        const patternType = styles.patternType || 'dots';
        const patternColor = styles.patternColor || '#3a3a3a';
        const patternSize = styles.patternSize !== undefined ? styles.patternSize : 20;
        const patternCSS = generatePatternCSS(patternType, patternColor, patternSize);
        // Extract background-image and background-size from pattern CSS
        const bgImageMatch = patternCSS.match(/background-image:\s*([^;]+);/);
        const bgSizeMatch = patternCSS.match(/background-size:\s*([^;]+);/);
        if (bgImageMatch) {
          widget.style.backgroundImage = bgImageMatch[1].trim();
        }
        if (bgSizeMatch) {
          widget.style.backgroundSize = bgSizeMatch[1].trim();
        }
        // For patterns, apply opacity to widget but content will be set to opacity: 1 below
        if (bgOpacity < 100) {
          widget.style.opacity = bgOpacity / 100;
        } else {
          widget.style.opacity = '';
        }
        widget.style.backgroundColor = '#1a1a1a';
      }
      break;
  }
  
  // Border
  if (styles.borderColor !== undefined) widget.style.borderColor = styles.borderColor;
  if (styles.borderWidth !== undefined) widget.style.borderWidth = styles.borderWidth + 'px';
  if (styles.borderStyle !== undefined) widget.style.borderStyle = styles.borderStyle;
  if (styles.borderRadius !== undefined) widget.style.borderRadius = styles.borderRadius + 'px';
  
  // Shadow - apply if any shadow property is defined
  if (styles.shadowBlur !== undefined || styles.shadowX !== undefined || styles.shadowY !== undefined || styles.shadowSpread !== undefined) {
    const x = styles.shadowX !== undefined ? styles.shadowX : 0;
    const y = styles.shadowY !== undefined ? styles.shadowY : 4;
    const blur = styles.shadowBlur !== undefined ? styles.shadowBlur : 6;
    const spread = styles.shadowSpread !== undefined ? styles.shadowSpread : 0;
    const color = styles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }
  
  // Title visibility, text, and alignment
  // SPECIAL CASE: Calendar and Whiteboard widgets have custom header layouts with functional elements
  // (Calendar has month-view button, Whiteboard has toolbar) - skip standard title styling for these
  const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
  const isSpecialWidget = widgetId === 'calendar-widget' || widgetId === 'whiteboard-widget';
  
  if (!isSpecialWidget) {
    const widgetHeader = widget.querySelector('.widget-header');
    if (widgetHeader) {
      // Title visibility
      if (styles.titleVisible !== undefined) {
        widgetHeader.style.display = styles.titleVisible ? '' : 'none';
      }
      
      // Title alignment - always apply to override CSS default (space-between)
      // Default to 'left' if not set
      // Use setProperty with !important to ensure it overrides CSS defaults
      const alignment = styles.titleAlignment || 'left';
      const justifyContent = alignment === 'center' ? 'center' : 'flex-start';
      const textAlign = alignment === 'center' ? 'center' : 'left';
      // Ensure header always takes full width to prevent collapsing
      widgetHeader.style.setProperty('width', '100%', 'important');
      widgetHeader.style.setProperty('min-width', '100%', 'important');
      widgetHeader.style.setProperty('justify-content', justifyContent, 'important');
      widgetHeader.style.setProperty('text-align', textAlign, 'important');
      // Also ensure the title itself doesn't have centering and doesn't expand to full width
      const title = widgetHeader.querySelector('.widget-title');
      if (title) {
        title.style.setProperty('justify-content', justifyContent, 'important');
        title.style.setProperty('text-align', textAlign, 'important');
        // Prevent title from expanding to full width when left-aligned
        if (alignment === 'left') {
          title.style.setProperty('width', 'auto', 'important');
          title.style.setProperty('flex', '0 0 auto', 'important');
          title.style.setProperty('max-width', 'fit-content', 'important');
          title.style.setProperty('flex-grow', '0', 'important');
          title.style.setProperty('flex-shrink', '0', 'important');
        } else {
          title.style.removeProperty('width');
          title.style.removeProperty('flex');
          title.style.removeProperty('max-width');
          title.style.removeProperty('flex-grow');
          title.style.removeProperty('flex-shrink');
        }
      }
      
      // DEBUG LOGGING - Compare widget dimensions and styles on page load
      setTimeout(() => {
        const widgetRect = widget.getBoundingClientRect();
        const headerRect = widgetHeader.getBoundingClientRect();
        const titleRect = title ? title.getBoundingClientRect() : null;
        const computedHeaderStyle = window.getComputedStyle(widgetHeader);
        const computedTitleStyle = title ? window.getComputedStyle(title) : null;
        
        // Get all CSS rules that might affect the title
        const titleRules = [];
        if (title) {
          const sheets = document.styleSheets;
          for (let i = 0; i < sheets.length; i++) {
            try {
              const rules = sheets[i].cssRules || sheets[i].rules;
              for (let j = 0; j < rules.length; j++) {
                if (rules[j].selectorText && title.matches(rules[j].selectorText)) {
                  titleRules.push({
                    selector: rules[j].selectorText,
                    width: rules[j].style.width,
                    flex: rules[j].style.flex,
                    flexGrow: rules[j].style.flexGrow,
                    flexShrink: rules[j].style.flexShrink,
                    maxWidth: rules[j].style.maxWidth,
                    display: rules[j].style.display
                  });
                }
              }
            } catch (e) {
              // Cross-origin stylesheet, skip
            }
          }
        }
      }, 100); // Small delay to ensure DOM is fully rendered
    }
  }

  // Text (widget title)
  // SPECIAL CASE: Calendar and Whiteboard widgets - skip editable title text for these
  // Calendar has custom icon and month button, Whiteboard has toolbar in header
  const title = widget.querySelector('.widget-title');
  if (title && !isSpecialWidget) {
    // Get widget ID and icon
    const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
    const widgetIcon = widgetId && WIDGET_CONFIG[widgetId] ? WIDGET_CONFIG[widgetId].icon : '';
    
    // Determine title text (custom or default)
    let titleTextValue = styles.titleText;
    if (titleTextValue === undefined) {
      // Use default from WIDGET_CONFIG if no custom title
      if (widgetId && WIDGET_CONFIG[widgetId]) {
        titleTextValue = WIDGET_CONFIG[widgetId].name;
      } else {
        titleTextValue = 'Widget';
      }
    }
    
    // Determine if icon should be shown
    const showIcon = styles.titleIconVisible !== undefined ? styles.titleIconVisible : true;
    
    // Apply title text with optional icon
    if (showIcon && widgetIcon) {
      title.textContent = `${widgetIcon} ${titleTextValue}`;
    } else {
      title.textContent = titleTextValue;
    }
    
    // Only apply inline color if textColorDynamic is false (manual mode)
    // If textColorDynamic is true or undefined, let CSS variable handle it
    if (styles.textColorDynamic === false && styles.textColor !== undefined) {
      title.style.color = styles.textColor;
    } else {
      // Dynamic mode: remove inline color to let CSS variable handle it
      title.style.color = '';
    }
    if (styles.fontSize !== undefined) title.style.fontSize = styles.fontSize + 'px';
    if (styles.fontWeight !== undefined) title.style.fontWeight = styles.fontWeight;
    // Apply widget opacity to title (independent of background opacity)
    if (styles.widgetOpacity !== undefined) {
      title.style.opacity = (styles.widgetOpacity / 100);
    } else {
      // If background opacity was applied to widget (for images/patterns), counteract on content
      if ((bgType === 'image' || bgType === 'pattern') && bgOpacity < 100) {
        title.style.opacity = '1';
      } else {
        title.style.opacity = '';
      }
    }
  }

  // Padding
  if (styles.padding !== undefined) widget.style.padding = styles.padding + 'px';
  
  // Widget opacity for content elements (borders, shadows, etc.)
  // Apply widget opacity to border (via rgba if widget opacity < 100)
  if (styles.widgetOpacity !== undefined && styles.widgetOpacity < 100 && styles.borderColor !== undefined) {
    widget.style.borderColor = hexToRgba(styles.borderColor, styles.widgetOpacity);
  }
  
  // Apply widget opacity to shadow (via rgba if widget opacity < 100)
  if (styles.widgetOpacity !== undefined && styles.widgetOpacity < 100 &&
      (styles.shadowBlur !== undefined || styles.shadowX !== undefined || styles.shadowY !== undefined)) {
    const x = styles.shadowX !== undefined ? styles.shadowX : 0;
    const y = styles.shadowY !== undefined ? styles.shadowY : 4;
    const blur = styles.shadowBlur !== undefined ? styles.shadowBlur : 6;
    const spread = styles.shadowSpread !== undefined ? styles.shadowSpread : 0;
    const shadowColor = styles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    // Extract rgba values and apply widget opacity
    const rgbaMatch = shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = rgbaMatch[1];
      const g = rgbaMatch[2];
      const b = rgbaMatch[3];
      const baseOpacity = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 0.3;
      const finalOpacity = (baseOpacity * styles.widgetOpacity / 100);
      widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    } else {
      widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${shadowColor}`;
    }
  }
  
  // Update dynamic styles for all widgets (controls and text colors)
  if (typeof updateWidgetDynamicStyles === 'function') {
    // Use setTimeout to ensure background styles are applied first
    setTimeout(() => updateWidgetDynamicStyles(widget), 0);
  }
  
  // Also update thermostat-specific styles for backward compatibility
  if (widget.classList.contains('thermostat-widget') && typeof updateThermostatControlStyles === 'function') {
    setTimeout(() => updateThermostatControlStyles(widget), 0);
  }
  
  // Reload dice widget with saved colors if this is a dice widget
  if (widget.classList.contains('dice-widget') && typeof loadDice === 'function') {
    setTimeout(() => loadDice(), 0);
  }
}

// Initialize background configuration modal
function initBackgroundModal() {
  const modal = document.getElementById('background-modal');
  const closeBtn = document.getElementById('close-background-modal');
  const applyBtn = document.getElementById('apply-background-btn');
  const resetBtn = document.getElementById('reset-background-btn');
  const typeSelect = document.getElementById('bg-type-select');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBackgroundModal);
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'background-modal') {
        closeBackgroundModal();
      }
    });
  }
  
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyBackground();
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetBackground);
  }
  
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      showBackgroundSection(e.target.value);
    });
  }
  
  // Initialize background controls
  initBackgroundControls();
  
  // Load saved background
  loadBackgroundSettings();
}

// Show appropriate background section based on type (for dashboard background modal)
function showBackgroundSection(type) {
  const sections = {
    'solid': document.getElementById('bg-solid-section'),
    'gradient': document.getElementById('bg-gradient-section'),
    'image': document.getElementById('bg-image-section'),
    'pattern': document.getElementById('bg-pattern-section')
  };
  
  Object.keys(sections).forEach(key => {
    if (sections[key]) {
      sections[key].style.display = key === type ? 'block' : 'none';
    }
  });
  
  updateBackgroundPreview();
}

// Show appropriate widget background section based on type
function showWidgetBackgroundSection(type) {
  const sections = {
    'solid': document.getElementById('widget-bg-solid-section'),
    'gradient': document.getElementById('widget-bg-gradient-section'),
    'image': document.getElementById('widget-bg-image-section'),
    'pattern': document.getElementById('widget-bg-pattern-section')
  };
  
  Object.keys(sections).forEach(key => {
    if (sections[key]) {
      sections[key].style.display = key === type ? 'block' : 'none';
    }
  });
}

// Initialize background control event listeners
function initBackgroundControls() {
  // Solid color
  const solidColor = document.getElementById('bg-solid-color');
  const solidColorText = document.getElementById('bg-solid-color-text');
  if (solidColor && solidColorText) {
    solidColor.addEventListener('input', (e) => {
      solidColorText.value = e.target.value;
      updateBackgroundPreview();
    });
    solidColorText.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        solidColor.value = e.target.value;
        updateBackgroundPreview();
      }
    });
  }
  
  // Gradient
  const gradColor1 = document.getElementById('bg-gradient-color1');
  const gradColor1Text = document.getElementById('bg-gradient-color1-text');
  const gradColor2 = document.getElementById('bg-gradient-color2');
  const gradColor2Text = document.getElementById('bg-gradient-color2-text');
  const gradDirection = document.getElementById('bg-gradient-direction');
  
  if (gradColor1 && gradColor1Text) {
    gradColor1.addEventListener('input', (e) => {
      gradColor1Text.value = e.target.value;
      updateBackgroundPreview();
    });
    gradColor1Text.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        gradColor1.value = e.target.value;
        updateBackgroundPreview();
      }
    });
  }
  
  if (gradColor2 && gradColor2Text) {
    gradColor2.addEventListener('input', (e) => {
      gradColor2Text.value = e.target.value;
      updateBackgroundPreview();
    });
    gradColor2Text.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        gradColor2.value = e.target.value;
        updateBackgroundPreview();
      }
    });
  }
  
  if (gradDirection) {
    gradDirection.addEventListener('change', updateBackgroundPreview);
  }
  
  // Image
  const imageUrl = document.getElementById('bg-image-url');
  const imageRepeat = document.getElementById('bg-image-repeat');
  const imagePosition = document.getElementById('bg-image-position');
  const imageSize = document.getElementById('bg-image-size');
  const imageOpacity = document.getElementById('bg-image-opacity');
  const imageOpacityValue = document.getElementById('bg-image-opacity-value');
  
  if (imageUrl) imageUrl.addEventListener('input', updateBackgroundPreview);
  if (imageRepeat) imageRepeat.addEventListener('change', updateBackgroundPreview);
  if (imagePosition) imagePosition.addEventListener('change', updateBackgroundPreview);
  if (imageSize) imageSize.addEventListener('change', updateBackgroundPreview);
  if (imageOpacity && imageOpacityValue) {
    imageOpacity.addEventListener('input', (e) => {
      imageOpacityValue.textContent = e.target.value + '%';
      updateBackgroundPreview();
    });
  }
  
  // Pattern
  const patternType = document.getElementById('bg-pattern-type');
  const patternColor = document.getElementById('bg-pattern-color');
  const patternSize = document.getElementById('bg-pattern-size');
  const patternSizeValue = document.getElementById('bg-pattern-size-value');
  
  if (patternType) patternType.addEventListener('change', updateBackgroundPreview);
  if (patternColor) patternColor.addEventListener('input', updateBackgroundPreview);
  if (patternSize && patternSizeValue) {
    patternSize.addEventListener('input', (e) => {
      patternSizeValue.textContent = e.target.value + 'px';
      updateBackgroundPreview();
    });
  }
}

// Open background modal
function openBackgroundModal() {
  loadBackgroundSettings();
  const modal = document.getElementById('background-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    updateBackgroundPreview();
  } else {
    console.error('Background modal element not found');
  }
}

// Close background modal
function closeBackgroundModal() {
  const modal = document.getElementById('background-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

// Update background preview
function updateBackgroundPreview() {
  const preview = document.getElementById('background-preview');
  if (!preview) return;
  
  const type = document.getElementById('bg-type-select')?.value || 'solid';
  let bgStyle = '';
  
  // Clear previous styles
  preview.style.cssText = '';
  preview.style.backgroundColor = '';
  preview.style.backgroundImage = '';
  preview.style.backgroundRepeat = '';
  preview.style.backgroundPosition = '';
  preview.style.backgroundSize = '';
  preview.style.opacity = '';
  
  switch(type) {
    case 'solid':
      const solidColor = document.getElementById('bg-solid-color')?.value || '#1a1a1a';
      bgStyle = `background-color: ${solidColor};`;
      break;
      
    case 'gradient':
      const color1 = document.getElementById('bg-gradient-color1')?.value || '#1a1a1a';
      const color2 = document.getElementById('bg-gradient-color2')?.value || '#2a2a2a';
      const direction = document.getElementById('bg-gradient-direction')?.value || 'to bottom';
      bgStyle = `background: linear-gradient(${direction}, ${color1}, ${color2});`;
      break;
      
    case 'image':
      const imageUrl = document.getElementById('bg-image-url')?.value;
      if (imageUrl) {
        const repeat = document.getElementById('bg-image-repeat')?.value || 'no-repeat';
        const position = document.getElementById('bg-image-position')?.value || 'center';
        const size = document.getElementById('bg-image-size')?.value || 'cover';
        const opacity = (document.getElementById('bg-image-opacity')?.value || 100) / 100;
        bgStyle = `background-image: url(${imageUrl}); background-repeat: ${repeat}; background-position: ${position}; background-size: ${size}; opacity: ${opacity};`;
      } else {
        bgStyle = `background-color: #1a1a1a;`;
      }
      break;
      
    case 'pattern':
      const patternType = document.getElementById('bg-pattern-type')?.value || 'dots';
      const patternColor = document.getElementById('bg-pattern-color')?.value || '#3a3a3a';
      const patternSize = document.getElementById('bg-pattern-size')?.value || 20;
      const patternCSS = generatePatternCSS(patternType, patternColor, patternSize);
      // Extract background-image and background-size from pattern CSS
      const bgImageMatch = patternCSS.match(/background-image:\s*([^;]+);/);
      const bgSizeMatch = patternCSS.match(/background-size:\s*([^;]+);/);
      if (bgImageMatch) {
        preview.style.backgroundImage = bgImageMatch[1].trim();
      }
      if (bgSizeMatch) {
        preview.style.backgroundSize = bgSizeMatch[1].trim();
      }
      // Set a default background color so the pattern is visible
      preview.style.backgroundColor = '#1a1a1a';
      return; // Don't set bgStyle, we've already applied it
  }
  
  if (bgStyle) {
    preview.style.cssText = bgStyle;
  } else {
    // Fallback: ensure preview has some background
    preview.style.backgroundColor = preview.style.backgroundColor || '#1a1a1a';
  }
}

// Generate pattern CSS
function generatePatternCSS(type, color, size) {
  const sizeNum = parseInt(size);
  switch(type) {
    case 'dots':
      return `background-image: radial-gradient(circle, ${color} 1px, transparent 1px); background-size: ${sizeNum}px ${sizeNum}px;`;
    case 'grid':
      return `background-image: linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px); background-size: ${sizeNum}px ${sizeNum}px;`;
    case 'lines':
      return `background-image: repeating-linear-gradient(0deg, transparent, transparent ${sizeNum - 1}px, ${color} ${sizeNum - 1}px, ${color} ${sizeNum}px);`;
    case 'diagonal':
      return `background-image: repeating-linear-gradient(45deg, transparent, transparent ${sizeNum}px, ${color} ${sizeNum}px, ${color} ${sizeNum * 2}px);`;
    case 'crosshatch':
      return `background-image: repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${sizeNum}px), repeating-linear-gradient(90deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${sizeNum}px);`;
    default:
      return '';
  }
}

// Apply background
function applyBackground() {
  const type = document.getElementById('bg-type-select')?.value || 'solid';
  const settings = { type: type };
  
  switch(type) {
    case 'solid':
      settings.color = document.getElementById('bg-solid-color')?.value || '#1a1a1a';
      break;
    case 'gradient':
      settings.color1 = document.getElementById('bg-gradient-color1')?.value || '#1a1a1a';
      settings.color2 = document.getElementById('bg-gradient-color2')?.value || '#2a2a2a';
      settings.direction = document.getElementById('bg-gradient-direction')?.value || 'to bottom';
      break;
    case 'image':
      settings.url = document.getElementById('bg-image-url')?.value || '';
      settings.repeat = document.getElementById('bg-image-repeat')?.value || 'no-repeat';
      settings.position = document.getElementById('bg-image-position')?.value || 'center';
      settings.size = document.getElementById('bg-image-size')?.value || 'cover';
      settings.opacity = parseInt(document.getElementById('bg-image-opacity')?.value || 100);
      break;
    case 'pattern':
      settings.patternType = document.getElementById('bg-pattern-type')?.value || 'dots';
      settings.color = document.getElementById('bg-pattern-color')?.value || '#3a3a3a';
      settings.size = parseInt(document.getElementById('bg-pattern-size')?.value || 20);
      break;
  }
  
  // Check if "Apply to all pages" is checked
  const applyToAllPages = document.getElementById('apply-background-to-all-pages')?.checked || false;
  
  // Apply background to dashboard (current page or all pages)
  applyBackgroundToDashboard(settings, applyToAllPages);
  
  // Only save to global key if applying to all pages (for backward compatibility)
  if (applyToAllPages) {
    localStorage.setItem('dakboard-background', JSON.stringify(settings));
  }
  
  closeBackgroundModal();
}

// Apply background settings to dashboard (page-specific)
function applyBackgroundToDashboard(settings, applyToAllPages = false) {
  // Get current page index from app.js if available
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  
  if (applyToAllPages) {
    // Apply to all pages
    const allPages = document.querySelectorAll('.dashboard.page');
    allPages.forEach((page, index) => {
      applyBackgroundToPageElement(page, settings);
      savePageBackground(index, settings);
    });
  } else {
    // Apply to current page only
    const currentPage = typeof getPageElement === 'function' && typeof currentPageIndex !== 'undefined' 
      ? getPageElement(currentPageIndex)
      : document.querySelector('.dashboard.page[data-page-id]') || document.querySelector('.dashboard');
    
    if (currentPage) {
      applyBackgroundToPageElement(currentPage, settings);
      const pageId = currentPage.getAttribute('data-page-id') || '0';
      if (typeof savePageBackground === 'function') {
        savePageBackground(parseInt(pageId), settings);
      }
    }
  }
}

// Apply background to a specific page element
function applyBackgroundToPageElement(pageElement, settings) {
  if (!pageElement) return;
  
  let bgStyle = '';
  
  switch(settings.type) {
    case 'solid':
      bgStyle = `background-color: ${settings.color};`;
      break;
    case 'gradient':
      bgStyle = `background: linear-gradient(${settings.direction}, ${settings.color1}, ${settings.color2});`;
      break;
    case 'image':
      if (settings.url) {
        bgStyle = `background-image: url(${settings.url}); background-repeat: ${settings.repeat}; background-position: ${settings.position}; background-size: ${settings.size};`;
        if (settings.opacity < 100) {
          pageElement.style.setProperty('--bg-image-opacity', settings.opacity / 100);
        }
      }
      break;
    case 'pattern':
      const patternCSS = generatePatternCSS(settings.patternType, settings.color, settings.size);
      // Extract background-image and background-size from pattern CSS
      const bgImageMatch = patternCSS.match(/background-image:\s*([^;]+);/);
      const bgSizeMatch = patternCSS.match(/background-size:\s*([^;]+);/);
      if (bgImageMatch) {
        pageElement.style.backgroundImage = bgImageMatch[1].trim();
      }
      if (bgSizeMatch) {
        pageElement.style.backgroundSize = bgSizeMatch[1].trim();
      }
      break;
    case 'transparent':
      pageElement.style.background = 'transparent';
      break;
  }
  
  if (bgStyle) {
    pageElement.style.cssText = bgStyle;
  }
  
  // Handle transparent background
  if (settings.type === 'transparent') {
    pageElement.style.background = 'transparent';
  }
}

// Reset background
function resetBackground() {
  const dashboard = document.querySelector('.dashboard');
  if (dashboard) {
    dashboard.style.cssText = 'background: #1a1a1a;';
  }
  
  // Reset form to defaults
  const typeSelect = document.getElementById('bg-type-select');
  if (typeSelect) {
    typeSelect.value = 'solid';
    showBackgroundSection('solid');
  }
  
  const solidColor = document.getElementById('bg-solid-color');
  const solidColorText = document.getElementById('bg-solid-color-text');
  if (solidColor) solidColor.value = '#1a1a1a';
  if (solidColorText) solidColorText.value = '#1a1a1a';
  
  localStorage.removeItem('dakboard-background');
  updateBackgroundPreview();
}

// Load background settings (page-specific)
function loadBackgroundSettings() {
  // Try to load page-specific background first
  // Safely get currentPageIndex - it may not be initialized yet
  let currentPageIndex = 0;
  try {
    if (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') {
      currentPageIndex = window.currentPageIndex;
    }
  } catch (e) {
    // Fallback to 0 if there's any error
    currentPageIndex = 0;
  }
  
  const pageBgKey = `dakboard-page-background-${currentPageIndex}`;
  let saved = localStorage.getItem(pageBgKey);
  
  // Fallback to legacy key if page-specific not found
  if (!saved) {
    saved = localStorage.getItem('dakboard-background');
  }
  
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      const typeSelect = document.getElementById('bg-type-select');
      if (typeSelect) {
        typeSelect.value = settings.type;
        showBackgroundSection(settings.type);
      }
      
      switch(settings.type) {
        case 'solid':
          const solidColor = document.getElementById('bg-solid-color');
          const solidColorText = document.getElementById('bg-solid-color-text');
          if (solidColor) solidColor.value = settings.color;
          if (solidColorText) solidColorText.value = settings.color;
          break;
        case 'gradient':
          const gradColor1 = document.getElementById('bg-gradient-color1');
          const gradColor1Text = document.getElementById('bg-gradient-color1-text');
          const gradColor2 = document.getElementById('bg-gradient-color2');
          const gradColor2Text = document.getElementById('bg-gradient-color2-text');
          const gradDirection = document.getElementById('bg-gradient-direction');
          if (gradColor1) gradColor1.value = settings.color1;
          if (gradColor1Text) gradColor1Text.value = settings.color1;
          if (gradColor2) gradColor2.value = settings.color2;
          if (gradColor2Text) gradColor2Text.value = settings.color2;
          if (gradDirection) gradDirection.value = settings.direction;
          break;
        case 'image':
          const imageUrl = document.getElementById('bg-image-url');
          const imageRepeat = document.getElementById('bg-image-repeat');
          const imagePosition = document.getElementById('bg-image-position');
          const imageSize = document.getElementById('bg-image-size');
          const imageOpacity = document.getElementById('bg-image-opacity');
          const imageOpacityValue = document.getElementById('bg-image-opacity-value');
          if (imageUrl) imageUrl.value = settings.url || '';
          if (imageRepeat) imageRepeat.value = settings.repeat || 'no-repeat';
          if (imagePosition) imagePosition.value = settings.position || 'center';
          if (imageSize) imageSize.value = settings.size || 'cover';
          if (imageOpacity) imageOpacity.value = settings.opacity || 100;
          if (imageOpacityValue) imageOpacityValue.textContent = (settings.opacity || 100) + '%';
          break;
        case 'pattern':
          const patternType = document.getElementById('bg-pattern-type');
          const patternColor = document.getElementById('bg-pattern-color');
          const patternSize = document.getElementById('bg-pattern-size');
          const patternSizeValue = document.getElementById('bg-pattern-size-value');
          if (patternType) patternType.value = settings.patternType;
          if (patternColor) patternColor.value = settings.color;
          if (patternSize) patternSize.value = settings.size;
          if (patternSizeValue) patternSizeValue.textContent = settings.size + 'px';
          break;
      }
      
      applyBackgroundToDashboard(settings);
    } catch (e) {
      console.error('Error loading background settings:', e);
    }
  } else {
    // Fallback to old format
    const dashboardBg = localStorage.getItem('dakboard-background-color');
    if (dashboardBg) {
      const dashboard = document.querySelector('.dashboard');
      if (dashboard) {
        dashboard.style.backgroundColor = dashboardBg;
      }
    }
    const typeSelect = document.getElementById('bg-type-select');
    if (typeSelect) {
      showBackgroundSection('solid');
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initStyling();
    // Load saved styles after a short delay to ensure widgets are rendered
    setTimeout(loadStyles, 100);
  });
// Clip art emoji list (100 fun emojis)
const CLIPART_EMOJIS = [
  '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎮', '🕹️', '🎯', '🎲',
  '🎳', '🎴', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁', '🎤',
  '🎧', '🎼', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁', '🎷',
  '🚀', '🛸', '🛰️', '🌌', '⭐', '🌟', '✨', '💫', '🌠', '☄️',
  '🎃', '🎄', '🎅', '🎁', '🎀', '🎊', '🎉', '🎈', '🎁', '🎀',
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️',
  '🎪', '🎭', '🎨', '🖼️', '🎨', '🖌️', '🖍️', '✏️', '✒️', '🖊️',
  '🖋️', '📝', '📄', '📃', '📑', '📊', '📈', '📉', '🗒️', '🗓️',
  '📆', '📅', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️',
  '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖',
  '🧩', '🎯', '🎲', '🎳', '🎮', '🕹️', '🎰', '🎲', '🎯', '🎪'
];

// Open clip art selection modal
function openClipArtModal() {
  const modal = document.getElementById('clipart-modal');
  const grid = document.getElementById('clipart-grid');
  if (!modal || !grid) return;
  
  // Clear and populate grid
  grid.innerHTML = '';
  CLIPART_EMOJIS.forEach(emoji => {
    const item = document.createElement('div');
    item.className = 'clipart-item';
    item.style.cssText = 'font-size: 48px; text-align: center; padding: 15px; cursor: pointer; border: 2px solid transparent; border-radius: 8px; transition: all 0.2s; background: rgba(255,255,255,0.05);';
    item.textContent = emoji;
    item.title = emoji;
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(255,255,255,0.1)';
      item.style.borderColor = '#4a90e2';
      item.style.transform = 'scale(1.1)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'rgba(255,255,255,0.05)';
      item.style.borderColor = 'transparent';
      item.style.transform = 'scale(1)';
    });
    item.addEventListener('click', () => {
      selectClipArt(emoji);
    });
    grid.appendChild(item);
  });
  
  // Show modal
  modal.classList.add('active');
  
  // Close button
  const closeBtn = document.getElementById('close-clipart-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('active');
    };
  }
  
  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };
}

// Select clip art emoji
function selectClipArt(emoji) {
  currentStyles.clipArtEmoji = emoji;
  currentStyles.clipArtImageUrl = ''; // Clear image if emoji is selected
  
  // Only update preview - don't apply to widget until Apply button is clicked
  updatePreview();
  
  // Close modal
  const modal = document.getElementById('clipart-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Helper function to generate CSS filter for image tinting
// Uses a simpler approach that better matches the selected color
function generateImageTintFilter(tintColor) {
  if (!tintColor || tintColor === '#ffffff' || tintColor === '#FFFFFF') {
    // White tint: brightness(0) invert(1) makes it white with black lines
    return 'brightness(0) invert(1)';
  }
  
  // Convert hex to RGB
  const r = parseInt(tintColor.slice(1, 3), 16);
  const g = parseInt(tintColor.slice(3, 5), 16);
  const b = parseInt(tintColor.slice(5, 7), 16);
  
  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Calculate hue from RGB
  const hue = getHueFromRGB(r, g, b);
  
  // Calculate saturation (simplified)
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  // For better color matching, use a combination that preserves the color better
  // First convert to white, then apply the color
  if (brightness > 200) {
    // Very light colors - use invert and hue-rotate
    return `brightness(0) invert(1) sepia(1) saturate(${Math.max(1, saturation * 3)}) hue-rotate(${hue}deg) brightness(${brightness / 255})`;
  } else if (brightness > 128) {
    // Medium-light colors
    return `brightness(0) invert(1) sepia(1) saturate(${Math.max(2, saturation * 4)}) hue-rotate(${hue}deg) brightness(${brightness / 255})`;
  } else if (brightness > 64) {
    // Medium-dark colors
    return `brightness(0) invert(1) sepia(1) saturate(${Math.max(3, saturation * 5)}) hue-rotate(${hue}deg) brightness(${brightness / 200})`;
  } else {
    // Dark colors
    return `brightness(0) saturate(100%) invert(${brightness / 255}) sepia(1) saturate(${Math.max(4, saturation * 6)}) hue-rotate(${hue}deg)`;
  }
}

// Helper to get hue from RGB
function getHueFromRGB(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  
  if (max === min) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / (max - min)) % 6;
  } else if (max === g) {
    h = (b - r) / (max - min) + 2;
  } else {
    h = (r - g) / (max - min) + 4;
  }
  
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

// Open Pixabay modal
function openPixabayModal() {
  const modal = document.getElementById('pixabay-modal');
  const grid = document.getElementById('pixabay-grid');
  const searchInput = document.getElementById('pixabay-search');
  const searchBtn = document.getElementById('pixabay-search-btn');
  const loading = document.getElementById('pixabay-loading');
  const error = document.getElementById('pixabay-error');
  
  if (!modal || !grid) return;
  
  // Clear previous results
  grid.innerHTML = '';
  error.style.display = 'none';
  error.textContent = '';
  
  // Show modal
  modal.classList.add('active');
  
  // Close button
  const closeBtn = document.getElementById('close-pixabay-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('active');
    };
  }
  
  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };
  
  // Search function
  const performSearch = async () => {
    const query = searchInput ? searchInput.value.trim() : '';
    
    loading.style.display = 'block';
    grid.innerHTML = '';
    error.style.display = 'none';
    
    try {
      // Get API key from window.CONFIG or fetch from API endpoint
      let apiKey = window.CONFIG?.PIXABAY_API_KEY;
      
      // If not in window.CONFIG, try to fetch from API endpoint (for Vercel environment variables)
      if (!apiKey) {
        try {
          const configResponse = await fetch('/api/clip-art-config.js');
          if (configResponse.ok) {
            const config = await configResponse.json();
            apiKey = config.PIXABAY_API_KEY;
            // Cache it in window.CONFIG for future use
            if (!window.CONFIG) window.CONFIG = {};
            window.CONFIG.PIXABAY_API_KEY = apiKey;
          } else {
            console.error('Failed to fetch clip art config:', configResponse.status, configResponse.statusText);
            const errorText = await configResponse.text();
            console.error('Error response:', errorText);
          }
        } catch (e) {
          console.error('Error fetching clip art config:', e);
        }
      }
      
      if (!apiKey) {
        error.innerHTML = 'Pixabay API key not configured. Please see CLIPART_API_SETUP.md for setup instructions.<br><br>Make sure:<br>1. Environment variable PIXABAY_API_KEY is set in Vercel<br>2. You have redeployed after setting the variable<br>3. Check browser console for detailed error messages';
        error.style.display = 'block';
        loading.style.display = 'none';
        return;
      }
      
      // Get filter values
      const imageTypeSelect = document.getElementById('pixabay-image-type');
      const categorySelect = document.getElementById('pixabay-category');
      const colorsSelect = document.getElementById('pixabay-colors');
      
      // Build URL parameters
      const params = new URLSearchParams();
      params.append('key', apiKey);
      if (query) {
        params.append('q', query);
      }
      params.append('safesearch', 'true');
      params.append('per_page', '100');
      
      // Image type - single select dropdown
      if (imageTypeSelect) {
        const imageType = imageTypeSelect.value;
        if (imageType && imageType !== 'all') {
          params.append('image_type', imageType);
        } else {
          params.append('image_type', 'all');
        }
      } else {
        params.append('image_type', 'all');
      }
      
      // Category - single select dropdown, only add if a category is selected
      if (categorySelect) {
        const category = categorySelect.value;
        if (category && category !== '') {
          params.append('category', category);
        }
      }
      
      // Colors - comma-separated list for multiple colors
      if (colorsSelect) {
        const selectedColors = Array.from(colorsSelect.selectedOptions)
          .map(opt => opt.value)
          .filter(val => val !== ''); // Remove empty "All Colors" option
        if (selectedColors.length > 0) {
          params.append('colors', selectedColors.join(','));
        }
      }
      
      const url = `https://pixabay.com/api/?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.hits && data.hits.length > 0) {
        grid.innerHTML = '';
        data.hits.forEach(hit => {
          const item = document.createElement('div');
          item.className = 'pixabay-item';
          item.style.cssText = 'cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.2s; background: rgba(255,255,255,0.05);';
          item.innerHTML = `
            <img src="${hit.previewURL}" alt="${hit.tags}" style="width: 100%; height: 150px; object-fit: cover; display: block;">
            <div style="padding: 8px; font-size: 12px; color: #888; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${hit.tags}</div>
          `;
          item.addEventListener('mouseenter', () => {
            item.style.borderColor = '#4a90e2';
            item.style.background = 'rgba(255,255,255,0.1)';
            item.style.transform = 'scale(1.05)';
          });
          item.addEventListener('mouseleave', () => {
            item.style.borderColor = 'transparent';
            item.style.background = 'rgba(255,255,255,0.05)';
            item.style.transform = 'scale(1)';
          });
          item.addEventListener('click', () => {
            selectClipArtImage(hit.webformatURL || hit.previewURL, hit.largeImageURL);
          });
          grid.appendChild(item);
        });
      } else {
        error.textContent = 'No images found. Try a different search term.';
        error.style.display = 'block';
      }
    } catch (err) {
      error.textContent = `Error: ${err.message}`;
      error.style.display = 'block';
    } finally {
      loading.style.display = 'none';
    }
  };
  
  // Search button
  if (searchBtn) {
    searchBtn.onclick = performSearch;
  }
  
  // Enter key on search input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
}

// Open OpenClipart modal
function openOpenClipartModal() {
  const modal = document.getElementById('openclipart-modal');
  const grid = document.getElementById('openclipart-grid');
  const searchInput = document.getElementById('openclipart-search');
  const searchBtn = document.getElementById('openclipart-search-btn');
  const loading = document.getElementById('openclipart-loading');
  const error = document.getElementById('openclipart-error');
  
  if (!modal || !grid) return;
  
  // Clear previous results
  grid.innerHTML = '';
  error.style.display = 'none';
  error.textContent = '';
  
  // Show modal
  modal.classList.add('active');
  
  // Close button
  const closeBtn = document.getElementById('close-openclipart-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('active');
    };
  }
  
  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };
  
  // Search function
  const performSearch = async () => {
    const query = searchInput ? searchInput.value.trim() : '';
    if (!query) {
      error.textContent = 'Please enter a search term';
      error.style.display = 'block';
      return;
    }
    
    loading.style.display = 'block';
    grid.innerHTML = '';
    error.style.display = 'none';
    
    try {
      // OpenClipart API endpoint (no authentication required)
      // The API v2 is in beta and may have changed. Try alternative endpoint formats.
      // Note: OpenClipart's API may have CORS restrictions, so we try multiple formats
      let url = `https://openclipart.org/search/json/?query=${encodeURIComponent(query)}&amount=100`;
      let response = await fetch(url, { mode: 'cors' });
      
      // If that fails with 401, try the v2 endpoint
      if (!response.ok && response.status === 401) {
        url = `https://openclipart.org/api/v2/search/json?query=${encodeURIComponent(query)}&amount=100`;
        response = await fetch(url, { mode: 'cors' });
      }
      
      // If still fails, try without /api/v2
      if (!response.ok && response.status === 401) {
        url = `https://openclipart.org/search/json?query=${encodeURIComponent(query)}&amount=100`;
        response = await fetch(url, { mode: 'cors' });
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(`OpenClipart API returned 401 Unauthorized. The API may require authentication or the endpoint format has changed. Please check https://openclipart.org/developers for the latest API documentation. Alternatively, you can use Pixabay or emoji clipart instead.`);
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // OpenClipart API response structure may vary - handle different possible formats
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.payload && Array.isArray(data.payload)) {
        items = data.payload;
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      }
      
      if (items && items.length > 0) {
        grid.innerHTML = '';
        items.forEach(item => {
          const clipartItem = document.createElement('div');
          clipartItem.className = 'openclipart-item';
          clipartItem.style.cssText = 'cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.2s; background: rgba(255,255,255,0.05); padding: 15px; display: flex; align-items: center; justify-content: center; position: relative;';
          
          // Try different possible image URL fields
          const imageUrl = item.detail || item.svg?.url || item.png?.url || item.thumb || item.url || item.image_url || item.preview_url;
          const title = item.title || item.name || item.term || 'clipart';
          
          if (imageUrl) {
            clipartItem.innerHTML = `
              <img src="${imageUrl}" alt="${title}" style="max-width: 100%; max-height: 120px; object-fit: contain; filter: ${currentStyles.clipArtColor ? `drop-shadow(0 0 4px ${currentStyles.clipArtColor})` : 'none'};">
              <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 4px; font-size: 11px; color: #888; text-align: center; background: rgba(0,0,0,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</div>
            `;
            clipartItem.addEventListener('mouseenter', () => {
              clipartItem.style.borderColor = '#4a90e2';
              clipartItem.style.background = 'rgba(255,255,255,0.1)';
              clipartItem.style.transform = 'scale(1.05)';
            });
            clipartItem.addEventListener('mouseleave', () => {
              clipartItem.style.borderColor = 'transparent';
              clipartItem.style.background = 'rgba(255,255,255,0.05)';
              clipartItem.style.transform = 'scale(1)';
            });
            clipartItem.addEventListener('click', () => {
              // Use the best available image URL
              const highResUrl = item.svg?.url || item.png?.url || item.detail || imageUrl;
              selectClipArtImage(imageUrl, highResUrl || imageUrl);
            });
            grid.appendChild(clipartItem);
          }
        });
        
        if (grid.innerHTML === '') {
          error.textContent = 'No valid clipart images found. Try a different search term.';
          error.style.display = 'block';
        }
      } else {
        error.textContent = 'No clipart found. Try a different search term.';
        error.style.display = 'block';
      }
    } catch (err) {
      error.textContent = `Error: ${err.message}. OpenClipart API may be temporarily unavailable or the endpoint may have changed.`;
      error.style.display = 'block';
      console.error('OpenClipart API error:', err);
    } finally {
      loading.style.display = 'none';
    }
  };
  
  // Search button
  if (searchBtn) {
    searchBtn.onclick = performSearch;
  }
  
  // Enter key on search input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
}

// Select clip art image (from API)
function selectClipArtImage(imageUrl, highResUrl) {
  // Clear emoji if image is selected
  currentStyles.clipArtEmoji = '';
  currentStyles.clipArtImageUrl = highResUrl || imageUrl;
  
  // Only update preview - don't apply to widget until Apply button is clicked
  updatePreview();
  
  // Close modals
  const pixabayModal = document.getElementById('pixabay-modal');
  const openclipartModal = document.getElementById('openclipart-modal');
  if (pixabayModal) pixabayModal.classList.remove('active');
  if (openclipartModal) openclipartModal.classList.remove('active');
}

} else {
  initStyling();
  setTimeout(loadStyles, 100);
}

