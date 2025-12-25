// Widget Styling System
// Handles dynamic styling of widgets and dashboard background

let currentWidgetId = null;
let currentStyles = {};
let applyToAllFlags = {};

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
  
  console.log('openStylingModal - Loaded styles:', currentStyles);

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
    case 'text':
      return generateTextTab();
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
  const shadowBlur = currentStyles.shadowBlur !== undefined ? currentStyles.shadowBlur : 6;
  const shadowX = currentStyles.shadowX !== undefined ? currentStyles.shadowX : 0;
  const shadowY = currentStyles.shadowY !== undefined ? currentStyles.shadowY : 4;
  const shadowSpread = currentStyles.shadowSpread !== undefined ? currentStyles.shadowSpread : 0;
  
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
            <input type="color" id="shadow-color" value="${shadowColor}">
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
function generateTextTab() {
  const textColor = currentStyles.textColor || '#fff';
  const fontSize = currentStyles.fontSize !== undefined ? currentStyles.fontSize : 18;
  const fontWeight = currentStyles.fontWeight || '600';
  
  return `
    <div class="styling-form-section">
      <div class="styling-section-title">Text Styling</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Color</label>
          <div class="styling-form-control">
            <input type="color" id="text-color" value="${textColor}">
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
      console.log('Attaching gradient color1 listeners');
      gradColor1.addEventListener('input', (e) => {
        console.log('Gradient Color1 changed:', e.target.value);
        gradColor1Text.value = e.target.value;
        currentStyles.gradientColor1 = e.target.value;
        updatePreview();
      });
      gradColor1.addEventListener('change', (e) => {
        console.log('Gradient Color1 changed (change event):', e.target.value);
        gradColor1Text.value = e.target.value;
        currentStyles.gradientColor1 = e.target.value;
        updatePreview();
      });
      gradColor1Text.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          console.log('Gradient Color1 text changed:', e.target.value);
          gradColor1.value = e.target.value;
          currentStyles.gradientColor1 = e.target.value;
          updatePreview();
        }
      });
    } else {
      console.warn('Gradient Color1 elements not found:', { gradColor1: !!gradColor1, gradColor1Text: !!gradColor1Text });
    }
    
    if (gradColor2 && gradColor2Text) {
      console.log('Attaching gradient color2 listeners');
      gradColor2.addEventListener('input', (e) => {
        console.log('Gradient Color2 changed:', e.target.value);
        gradColor2Text.value = e.target.value;
        currentStyles.gradientColor2 = e.target.value;
        updatePreview();
      });
      gradColor2.addEventListener('change', (e) => {
        console.log('Gradient Color2 changed (change event):', e.target.value);
        gradColor2Text.value = e.target.value;
        currentStyles.gradientColor2 = e.target.value;
        updatePreview();
      });
      gradColor2Text.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          console.log('Gradient Color2 text changed:', e.target.value);
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

    document.getElementById('shadow-color').addEventListener('input', (e) => {
      currentStyles.shadowColor = e.target.value;
      updatePreview();
    });

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
  
  if (tabName === 'text') {
    document.getElementById('text-color').addEventListener('input', (e) => {
      currentStyles.textColor = e.target.value;
      updatePreview();
    });

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
    widgetOpacity.addEventListener('input', (e) => {
      const val = e.target.value;
      widgetOpacityValue.textContent = val + '%';
      currentStyles.widgetOpacity = parseInt(val);
      updatePreview();
    });
  }
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

  // Scope queries to the styling modal to avoid conflicts with dashboard background modal
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  // Apply background based on type - read directly from form inputs within styling modal
  const bgType = stylingModal.querySelector('#bg-type')?.value || 'solid';
  
  // Clear previous background styles
  preview.style.backgroundColor = '';
  preview.style.backgroundImage = '';
  preview.style.backgroundRepeat = '';
  preview.style.backgroundPosition = '';
  preview.style.backgroundSize = '';
  preview.style.opacity = '';
  
  switch(bgType) {
    case 'solid':
      const solidColor = stylingModal.querySelector('#bg-color')?.value || '#2a2a2a';
      preview.style.backgroundColor = solidColor;
      break;
      
    case 'transparent':
      preview.style.backgroundColor = 'transparent';
      break;
      
    case 'gradient':
      const color1 = stylingModal.querySelector('#bg-gradient-color1')?.value || '#2a2a2a';
      const color2 = stylingModal.querySelector('#bg-gradient-color2')?.value || '#3a3a3a';
      const direction = stylingModal.querySelector('#bg-gradient-direction')?.value || 'to bottom';
      preview.style.backgroundImage = `linear-gradient(${direction}, ${color1}, ${color2})`;
      break;
      
    case 'image':
      const imageUrl = stylingModal.querySelector('#bg-image-url')?.value || '';
      if (imageUrl) {
        preview.style.backgroundImage = `url(${imageUrl})`;
        preview.style.backgroundRepeat = stylingModal.querySelector('#bg-image-repeat')?.value || 'no-repeat';
        preview.style.backgroundPosition = stylingModal.querySelector('#bg-image-position')?.value || 'center';
        preview.style.backgroundSize = stylingModal.querySelector('#bg-image-size')?.value || 'cover';
        const imgOpacity = parseInt(stylingModal.querySelector('#bg-image-opacity')?.value || 100);
        if (imgOpacity < 100) {
          preview.style.opacity = imgOpacity / 100;
        }
      } else {
        preview.style.backgroundColor = '#1a1a1a';
      }
      break;
      
    case 'pattern':
      const patternType = stylingModal.querySelector('#bg-pattern-type')?.value || 'dots';
      const patternColor = stylingModal.querySelector('#bg-pattern-color')?.value || '#3a3a3a';
      const patternSize = parseInt(stylingModal.querySelector('#bg-pattern-size')?.value || 20);
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
      preview.style.backgroundColor = '#1a1a1a';
      break;
  }
  
  // Apply opacity (for solid/gradient/pattern, not image which has its own opacity)
  if (currentStyles.opacity !== undefined && bgType !== 'image') {
    const opacity = currentStyles.opacity / 100;
    preview.style.opacity = opacity;
  } else if (bgType !== 'image') {
    preview.style.opacity = '1';
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

  // Apply text
  if (currentStyles.textColor) {
    preview.querySelector('.styling-preview-title-text').style.color = currentStyles.textColor;
  }
  if (currentStyles.fontSize) {
    preview.querySelector('.styling-preview-title-text').style.fontSize = currentStyles.fontSize + 'px';
  }
  if (currentStyles.fontWeight) {
    preview.querySelector('.styling-preview-title-text').style.fontWeight = currentStyles.fontWeight;
  }

  // Apply padding
  if (currentStyles.padding !== undefined) {
    preview.style.padding = currentStyles.padding + 'px';
  }

  // Apply widget opacity
  if (currentStyles.widgetOpacity !== undefined) {
    preview.style.opacity = (currentStyles.widgetOpacity / 100);
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
    
    // If applying to all, save styles for each widget
    if (applyToAllFlags.global) {
      const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
      if (widgetId) {
        localStorage.setItem(`dakboard-widget-styles-${widgetId}`, JSON.stringify(currentStyles));
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
  
  const textColor = document.getElementById('text-color');
  if (textColor) currentStyles.textColor = textColor.value;
  
  const fontSize = document.getElementById('font-size');
  if (fontSize) currentStyles.fontSize = parseInt(fontSize.value);
  
  const fontWeight = document.getElementById('font-weight');
  if (fontWeight) currentStyles.fontWeight = fontWeight.value;
  
  const padding = document.getElementById('padding');
  if (padding) currentStyles.padding = parseInt(padding.value);
  
  const widgetOpacity = document.getElementById('widget-opacity');
  if (widgetOpacity) currentStyles.widgetOpacity = parseInt(widgetOpacity.value);
  
  console.log('updateCurrentStylesFromForm - Updated currentStyles:', currentStyles);
}

// Apply current styles to a single widget
function applyCurrentStylesToWidget(widget) {
  // When applying to all widgets, only apply if the "apply to all" checkbox is checked for that property
  // When applying to a single widget, always apply (checkbox doesn't matter)
  const isApplyingToAll = applyToAllFlags.global;
  
  // Background - read directly from form inputs within styling modal (scoped to avoid conflicts)
  const stylingModal = document.getElementById('styling-modal');
  if (!stylingModal) return;
  
  const bgType = stylingModal.querySelector('#bg-type')?.value || 'solid';
  
  // Clear previous background styles
  widget.style.backgroundColor = '';
  widget.style.backgroundImage = '';
  widget.style.backgroundRepeat = '';
  widget.style.backgroundPosition = '';
  widget.style.backgroundSize = '';
  widget.style.opacity = '';
  
  switch(bgType) {
    case 'solid':
      const solidColor = stylingModal.querySelector('#bg-color')?.value || '#2a2a2a';
      if (!isApplyingToAll || applyToAllFlags.backgroundColor) {
        widget.style.backgroundColor = solidColor;
      }
      break;
      
    case 'transparent':
      if (!isApplyingToAll || applyToAllFlags.backgroundColor) {
        widget.style.backgroundColor = 'transparent';
      }
      break;
      
    case 'gradient':
      const color1 = stylingModal.querySelector('#bg-gradient-color1')?.value || '#2a2a2a';
      const color2 = stylingModal.querySelector('#bg-gradient-color2')?.value || '#3a3a3a';
      const direction = stylingModal.querySelector('#bg-gradient-direction')?.value || 'to bottom';
      if (!isApplyingToAll || applyToAllFlags.gradientColor1 || applyToAllFlags.gradientColor2) {
        widget.style.backgroundImage = `linear-gradient(${direction}, ${color1}, ${color2})`;
      }
      break;
      
    case 'image':
      const imageUrl = stylingModal.querySelector('#bg-image-url')?.value || '';
      if (imageUrl && (!isApplyingToAll || applyToAllFlags.backgroundImageUrl)) {
        widget.style.backgroundImage = `url(${imageUrl})`;
        widget.style.backgroundRepeat = stylingModal.querySelector('#bg-image-repeat')?.value || 'no-repeat';
        widget.style.backgroundPosition = stylingModal.querySelector('#bg-image-position')?.value || 'center';
        widget.style.backgroundSize = stylingModal.querySelector('#bg-image-size')?.value || 'cover';
        const imgOpacity = parseInt(stylingModal.querySelector('#bg-image-opacity')?.value || 100);
        if (imgOpacity < 100) {
          widget.style.opacity = imgOpacity / 100;
        }
      }
      break;
      
    case 'pattern':
      const patternType = stylingModal.querySelector('#bg-pattern-type')?.value || 'dots';
      const patternColor = stylingModal.querySelector('#bg-pattern-color')?.value || '#3a3a3a';
      const patternSize = parseInt(stylingModal.querySelector('#bg-pattern-size')?.value || 20);
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
        widget.style.backgroundColor = '#1a1a1a';
      }
      break;
  }
  
  if (currentStyles.opacity !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.opacity) {
      widget.style.opacity = currentStyles.opacity / 100;
    }
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

  // Text (widget title)
  const title = widget.querySelector('.widget-title');
  if (title) {
    if (currentStyles.textColor !== undefined) {
      if (!isApplyingToAll || applyToAllFlags.textColor) {
        title.style.color = currentStyles.textColor;
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
  }

  // Padding
  if (currentStyles.padding !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.padding) {
      widget.style.padding = currentStyles.padding + 'px';
    }
  }

  // Widget opacity (overrides background opacity if both are set)
  if (currentStyles.widgetOpacity !== undefined) {
    if (!isApplyingToAll || applyToAllFlags.widgetOpacity) {
      widget.style.opacity = (currentStyles.widgetOpacity / 100);
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
  applyToAllFlags.textColor = document.getElementById('text-color-apply-all')?.checked || false;
  applyToAllFlags.fontSize = document.getElementById('font-size-apply-all')?.checked || false;
  applyToAllFlags.fontWeight = document.getElementById('font-weight-apply-all')?.checked || false;
  applyToAllFlags.padding = document.getElementById('padding-apply-all')?.checked || false;
  applyToAllFlags.widgetOpacity = document.getElementById('widget-opacity-apply-all')?.checked || false;
  
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
    textColor: '#fff',
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
      title.style.color = '#fff';
      title.style.fontSize = '18px';
      title.style.fontWeight = '600';
    }
  }
  
  // Clear saved styles
  localStorage.removeItem(`dakboard-widget-styles-${currentWidgetId}`);
  
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

// Load widget styles
function loadWidgetStyles(widgetId) {
  const saved = localStorage.getItem(`dakboard-widget-styles-${widgetId}`);
  if (saved) {
    currentStyles = JSON.parse(saved);
  } else {
    // Set defaults
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
      textColor: '#fff',
      fontSize: 18,
      fontWeight: '600',
      padding: 24,
      widgetOpacity: 100
    };
  }
}

// Save styles
function saveStyles() {
  if (currentWidgetId) {
    localStorage.setItem(`dakboard-widget-styles-${currentWidgetId}`, JSON.stringify(currentStyles));
  }
}

// Load all styles on page load
function loadStyles() {
  document.querySelectorAll('.widget').forEach(widget => {
    const widgetId = Array.from(widget.classList).find(c => c.endsWith('-widget'));
    if (widgetId) {
      const saved = localStorage.getItem(`dakboard-widget-styles-${widgetId}`);
      if (saved) {
        const styles = JSON.parse(saved);
        loadStylesToWidget(widget, styles);
      }
    }
  });
  
  // Load dashboard background (new format)
  loadBackgroundSettings();
}

// Load saved styles to widget (for page load)
function loadStylesToWidget(widget, styles) {
  if (!styles) return;
  
  if (styles.backgroundColor) widget.style.backgroundColor = styles.backgroundColor;
  if (styles.opacity !== undefined) widget.style.opacity = styles.opacity / 100;
  if (styles.borderColor) widget.style.borderColor = styles.borderColor;
  if (styles.borderWidth !== undefined) widget.style.borderWidth = styles.borderWidth + 'px';
  if (styles.borderStyle) widget.style.borderStyle = styles.borderStyle;
  if (styles.borderRadius !== undefined) widget.style.borderRadius = styles.borderRadius + 'px';
  
  if (styles.shadowBlur !== undefined || styles.shadowX !== undefined) {
    const x = styles.shadowX || 0;
    const y = styles.shadowY || 0;
    const blur = styles.shadowBlur || 0;
    const spread = styles.shadowSpread || 0;
    const color = styles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }
  
  const title = widget.querySelector('.widget-title');
  if (title) {
    if (styles.textColor) title.style.color = styles.textColor;
    if (styles.fontSize) title.style.fontSize = styles.fontSize + 'px';
    if (styles.fontWeight) title.style.fontWeight = styles.fontWeight;
  }
  
  if (styles.padding !== undefined) widget.style.padding = styles.padding + 'px';
  if (styles.widgetOpacity !== undefined) widget.style.opacity = styles.widgetOpacity / 100;
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
  
  applyBackgroundToDashboard(settings);
  localStorage.setItem('dakboard-background', JSON.stringify(settings));
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
  
  const pageBgKey = `dakboard-background-page-${currentPageIndex}`;
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
} else {
  initStyling();
  setTimeout(loadStyles, 100);
}

