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

  // Dashboard background color sync
  const dashboardBgColor = document.getElementById('dashboard-bg-color');
  const dashboardBgColorText = document.getElementById('dashboard-bg-color-text');
  
  dashboardBgColor.addEventListener('input', (e) => {
    dashboardBgColorText.value = e.target.value;
    updateDashboardBackground();
  });
  
  dashboardBgColorText.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      dashboardBgColor.value = e.target.value;
      updateDashboardBackground();
    }
  });

  // Load saved styles
  loadStyles();
}

// Open styling modal for a widget
function openStylingModal(widgetId) {
  currentWidgetId = widgetId;
  const widget = document.querySelector(`.${widgetId}`);
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
  
  // Update preview
  updatePreview();
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

// Generate Background Tab
function generateBackgroundTab() {
  const bgColor = currentStyles.backgroundColor || '#2a2a2a';
  const bgType = currentStyles.backgroundType || 'solid';
  const opacity = currentStyles.opacity !== undefined ? currentStyles.opacity : 100;
  
  return `
    <div class="styling-form-section">
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

      <div class="styling-section-title">Background Type</div>
      <div class="styling-form-group">
        <div class="styling-form-row">
          <label class="styling-form-label">Type</label>
          <div class="styling-form-control">
            <select id="bg-type">
              <option value="solid" ${bgType === 'solid' ? 'selected' : ''}>Solid Color</option>
              <option value="gradient" ${bgType === 'gradient' ? 'selected' : ''}>Gradient</option>
              <option value="pattern" ${bgType === 'pattern' ? 'selected' : ''}>Pattern</option>
              <option value="image" ${bgType === 'image' ? 'selected' : ''}>Image</option>
            </select>
            <label class="styling-apply-all-checkbox">
              <input type="checkbox" id="bg-type-apply-all" ${applyToAllFlags.backgroundType ? 'checked' : ''}> Apply to all
            </label>
          </div>
        </div>
      </div>

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
    const bgColor = document.getElementById('bg-color');
    const bgColorText = document.getElementById('bg-color-text');
    
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

    document.getElementById('bg-type').addEventListener('change', (e) => {
      currentStyles.backgroundType = e.target.value;
      updatePreview();
    });

    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    opacity.addEventListener('input', (e) => {
      const val = e.target.value;
      opacityValue.textContent = val + '%';
      currentStyles.opacity = parseInt(val);
      updatePreview();
    });
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

  // Apply background
  if (currentStyles.backgroundColor) {
    preview.style.backgroundColor = currentStyles.backgroundColor;
  }
  
  if (currentStyles.opacity !== undefined) {
    const opacity = currentStyles.opacity / 100;
    preview.style.opacity = opacity;
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

  // Get apply-to-all flags
  updateApplyToAllFlags();

  // Apply to current widget or all widgets
  const widgetsToStyle = applyToAllFlags.global ? 
    document.querySelectorAll('.widget:not(.hidden)') : 
    [document.querySelector(`.${currentWidgetId}`)];

  widgetsToStyle.forEach(widget => {
    if (!widget) return;
    
    applyCurrentStylesToWidget(widget);
  });

  // Save styles
  saveStyles();
  
  // Close modal
  closeStylingModal();
}

// Apply current styles to a single widget
function applyCurrentStylesToWidget(widget) {
  // Background
  if (currentStyles.backgroundColor && (!applyToAllFlags.backgroundColor || applyToAllFlags.global)) {
    widget.style.backgroundColor = currentStyles.backgroundColor;
  }
  
  if (currentStyles.opacity !== undefined && (!applyToAllFlags.opacity || applyToAllFlags.global)) {
    widget.style.opacity = currentStyles.opacity / 100;
  }

  // Border
  if (currentStyles.borderColor && (!applyToAllFlags.borderColor || applyToAllFlags.global)) {
    widget.style.borderColor = currentStyles.borderColor;
  }
  if (currentStyles.borderWidth !== undefined && (!applyToAllFlags.borderWidth || applyToAllFlags.global)) {
    widget.style.borderWidth = currentStyles.borderWidth + 'px';
  }
  if (currentStyles.borderStyle && (!applyToAllFlags.borderStyle || applyToAllFlags.global)) {
    widget.style.borderStyle = currentStyles.borderStyle;
  }
  if (currentStyles.borderRadius !== undefined && (!applyToAllFlags.borderRadius || applyToAllFlags.global)) {
    widget.style.borderRadius = currentStyles.borderRadius + 'px';
  }

  // Shadow
  if ((currentStyles.shadowBlur !== undefined || currentStyles.shadowX !== undefined) && (!applyToAllFlags.shadowColor || applyToAllFlags.global)) {
    const x = currentStyles.shadowX || 0;
    const y = currentStyles.shadowY || 0;
    const blur = currentStyles.shadowBlur || 0;
    const spread = currentStyles.shadowSpread || 0;
    const color = currentStyles.shadowColor || 'rgba(0, 0, 0, 0.3)';
    widget.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  // Text (widget title)
  const title = widget.querySelector('.widget-title');
  if (title) {
    if (currentStyles.textColor && (!applyToAllFlags.textColor || applyToAllFlags.global)) {
      title.style.color = currentStyles.textColor;
    }
    if (currentStyles.fontSize && (!applyToAllFlags.fontSize || applyToAllFlags.global)) {
      title.style.fontSize = currentStyles.fontSize + 'px';
    }
    if (currentStyles.fontWeight && (!applyToAllFlags.fontWeight || applyToAllFlags.global)) {
      title.style.fontWeight = currentStyles.fontWeight;
    }
  }

  // Padding
  if (currentStyles.padding !== undefined && (!applyToAllFlags.padding || applyToAllFlags.global)) {
    widget.style.padding = currentStyles.padding + 'px';
  }

  // Widget opacity
  if (currentStyles.widgetOpacity !== undefined && (!applyToAllFlags.widgetOpacity || applyToAllFlags.global)) {
    widget.style.opacity = (currentStyles.widgetOpacity / 100);
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
  
  // Reset current styles
  currentStyles = {};
  
  // Reset widget
  const widget = document.querySelector(`.${currentWidgetId}`);
  if (widget) {
    widget.style.backgroundColor = '';
    widget.style.borderColor = '';
    widget.style.borderWidth = '';
    widget.style.borderStyle = '';
    widget.style.borderRadius = '';
    widget.style.boxShadow = '';
    widget.style.opacity = '';
    widget.style.padding = '';
    
    const title = widget.querySelector('.widget-title');
    if (title) {
      title.style.color = '';
      title.style.fontSize = '';
      title.style.fontWeight = '';
    }
  }
  
  // Reload tab to show defaults
  const activeTab = document.querySelector('.styling-tab.active');
  if (activeTab) {
    switchTab(activeTab.dataset.tab);
  }
  
  // Save
  saveStyles();
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
    currentStyles = {};
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
        applyStylesToWidget(widget, styles);
      }
    }
  });
  
  // Load dashboard background
  const dashboardBg = localStorage.getItem('dakboard-background-color');
  if (dashboardBg) {
    document.querySelector('.dashboard').style.backgroundColor = dashboardBg;
    document.getElementById('dashboard-bg-color').value = dashboardBg;
    document.getElementById('dashboard-bg-color-text').value = dashboardBg;
  }
}

// Apply styles to widget (for loading)
function applyStylesToWidget(widget, styles) {
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

// Update dashboard background
function updateDashboardBackground() {
  const color = document.getElementById('dashboard-bg-color').value;
  document.querySelector('.dashboard').style.backgroundColor = color;
  localStorage.setItem('dakboard-background-color', color);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStyling);
} else {
  initStyling();
}

