// Drag and Resize functionality for widgets
// Supports free positioning, snap-to-grid, and smart content scaling

const GRID_SIZE = 20; // Grid snap size in pixels
let snapToGrid = true; // Toggle for snap-to-grid
let draggedWidget = null;
let resizeWidget = null;
let rotateWidget = null;
let dragOffset = { x: 0, y: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
let resizeDirection = '';
let rotateStart = { x: 0, y: 0, angle: 0 };

// Load saved widget layout from localStorage (page-specific)
function loadWidgetLayout() {
  // Use page-specific load function if available
  if (typeof loadCurrentPage === 'function') {
    loadCurrentPage();
    return;
  }
  
  // Fallback to old method for backward compatibility
  try {
    const saved = localStorage.getItem('dakboard-widget-layout');
    if (saved) {
      const layout = JSON.parse(saved);
      console.log('Loading saved layout:', layout);
      Object.keys(layout).forEach(widgetId => {
        const widget = document.querySelector(`.${widgetId}`);
        if (widget && layout[widgetId]) {
          const { x, y, width, height, zIndex, rotation } = layout[widgetId];
          // Ensure widgets are within viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Clamp positions to viewport
          const clampedX = Math.max(0, Math.min(x, viewportWidth - width));
          const clampedY = Math.max(0, Math.min(y, viewportHeight - height));
          
          widget.style.left = `${clampedX}px`;
          widget.style.top = `${clampedY}px`;
          widget.style.width = `${width}px`;
          widget.style.height = `${height}px`;
          if (zIndex !== undefined) {
            widget.style.zIndex = zIndex;
          }
          if (rotation !== undefined) {
            widget.style.transform = `rotate(${rotation}deg)`;
            widget.setAttribute('data-rotation', rotation);
          }
          updateWidgetScale(widget);
          // Log removed to reduce console noise
        }
      });
    } else {
      console.log('No saved layout found, using default positions');
    }
  } catch (error) {
    console.error('Error loading widget layout:', error);
  }
}

// Save widget layout to localStorage (page-specific)
function saveWidgetLayout() {
  // Use page-specific save function if available
  if (typeof saveCurrentPageLayout === 'function') {
    saveCurrentPageLayout();
    return;
  }
  
  // Fallback to old method for backward compatibility
  try {
    const layout = {};
    document.querySelectorAll('.widget').forEach(widget => {
      // Get full widget ID from class list (second class should be the full instance ID)
      // Fallback to first class if second doesn't match pattern
      let widgetId = widget.classList[1];
      
      // Check if it's a full instance ID (contains 'page-' and 'instance-')
      if (!widgetId || (!widgetId.includes('page-') && !widgetId.includes('instance-'))) {
        // Try to find a full ID in the class list
        const fullIdClass = Array.from(widget.classList).find(cls => 
          cls.includes('page-') && cls.includes('instance-')
        );
        if (fullIdClass) {
          widgetId = fullIdClass;
        } else {
          // Legacy widget - use widget type
          widgetId = widget.classList[0] || widget.classList[1] || 'unknown-widget';
        }
      }
      
      const rect = widget.getBoundingClientRect();
      const dashboard = widget.closest('.dashboard');
      if (!dashboard) return;
      const dashboardRect = dashboard.getBoundingClientRect();
      
      const zIndex = parseInt(window.getComputedStyle(widget).zIndex) || 1;
      const rotation = widget.getAttribute('data-rotation') ? parseFloat(widget.getAttribute('data-rotation')) : 0;
      layout[widgetId] = {
        x: rect.left - dashboardRect.left,
        y: rect.top - dashboardRect.top,
        width: rect.width,
        height: rect.height,
        zIndex: zIndex,
        rotation: rotation
      };
    });
    localStorage.setItem('dakboard-widget-layout', JSON.stringify(layout));
  } catch (error) {
    console.error('Error saving widget layout:', error);
  }
}

// Update widget content scale based on size
function updateWidgetScale(widget) {
  const rect = widget.getBoundingClientRect();
  
  // Get default size based on widget type
  let defaultWidth = 500;
  let defaultHeight = 400;
  
  if (widget.classList.contains('calendar-widget')) {
    defaultWidth = 800;
    defaultHeight = 500;
  } else if (widget.classList.contains('weather-widget')) {
    defaultWidth = 500;
    defaultHeight = 400;
  } else if (widget.classList.contains('todo-widget')) {
    defaultWidth = 500;
    defaultHeight = 300;
  } else if (widget.classList.contains('garage-widget')) {
    defaultWidth = 800;
    defaultHeight = 200;
  } else if (widget.classList.contains('alarm-widget')) {
    defaultWidth = 500;
    defaultHeight = 200;
  } else if (widget.classList.contains('compressor-widget')) {
    defaultWidth = 300;
    defaultHeight = 200;
  } else if (widget.classList.contains('dice-widget')) {
    defaultWidth = 300;
    defaultHeight = 200;
  }
  
  // Calculate scale factor based on the smaller dimension to maintain aspect ratio
  const widthScale = rect.width / defaultWidth;
  const heightScale = rect.height / defaultHeight;
  const scaleFactor = Math.max(0.4, Math.min(Math.min(widthScale, heightScale), 1.5)); // Between 0.4x and 1.5x
  
  widget.style.setProperty('--scale-factor', scaleFactor);
  widget.setAttribute('data-scale', 'true');
}

// Snap value to grid
function snapToGridValue(value) {
  if (!snapToGrid) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Initialize drag and resize for all widgets on current page
function initializeDragAndResize() {
  // Get current page index (from app.js)
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
    ? window.currentPageIndex 
    : 0;
  
  // Get current page element
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  if (!currentPage) {
    console.warn('Current page not found for drag/resize initialization');
    return;
  }
  
  // Check if edit mode is enabled for this page
  const inEditMode = currentPage.classList.contains('edit-mode');
  
  // Only add handles if in edit mode
  if (!inEditMode) {
    // Remove all handles if not in edit mode
    currentPage.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    return;
  }
  
  // Wait a bit for widgets to be rendered, then process them
  setTimeout(() => {
    // Get all widgets on the current page (including hidden ones, we'll filter below)
    const allWidgets = currentPage.querySelectorAll('.widget');
    
    if (allWidgets.length === 0) {
      console.log('No widgets found on current page.');
      return;
    }
    
    allWidgets.forEach((widget, index) => {
      // Skip hidden widgets
      if (widget.classList.contains('hidden')) {
        return;
      }
      
      // Remove existing resize handles first (in case we're re-initializing)
      widget.querySelectorAll('.resize-handle').forEach(h => h.remove());
      
      // Remove existing rotate handles
      widget.querySelectorAll('.rotate-handle').forEach(h => h.remove());
      
      // Check if widget already has drag listener (using a more specific check)
      // We'll use event delegation or check if the widget has the listener
      // For now, just re-add everything - the handles will be removed above
      
      // Add resize handles
      addResizeHandles(widget);
      
      // Add rotate handle for blank widget only
      if (widget.classList.contains('blank-widget')) {
        addRotateHandle(widget);
      }
      
      // Add z-index controls to widget header (if function exists)
      if (typeof addZIndexControls === 'function') {
        addZIndexControls(widget);
      }
      
      // Remove any existing drag listener by checking if we need to
      // Since we can't easily remove specific listeners, we'll use a flag
      // But actually, having multiple listeners isn't the issue - the issue is
      // that the handles might not be getting the right widget reference
      
      // Make widget draggable (only in edit mode)
      // In edit mode, entire widget is draggable; in normal mode, no dragging
      // Support both mouse and touch events for desktop and tablet
      
      // Remove existing drag listeners to prevent duplicates
      const existingDragHandler = widget.dataset.dragHandler;
      if (existingDragHandler) {
        // We can't easily remove the handler, so we'll use a flag to prevent duplicates
        // Instead, we'll check if the widget already has the edit-mode-active class
        // and only add listeners if they don't exist
      }
      
      const handleDragStart = (e) => {
        // Check if edit mode is active on the current page
        const dashboard = widget.closest('.dashboard.page');
        const inEditMode = dashboard && dashboard.classList.contains('edit-mode');
        
        if (!inEditMode) {
          return; // Don't allow dragging in normal mode
        }
        
        // Don't drag if clicking on resize handles or rotate handle
        const target = e.target || (e.touches && e.touches[0] ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : null);
        if (target && (target.classList.contains('resize-handle') || target.closest('.resize-handle'))) {
          return;
        }
        if (target && (target.classList.contains('rotate-handle') || target.closest('.rotate-handle'))) {
          return;
        }
        
        // Don't drag if clicking on buttons or interactive elements
        if (target && (target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select'))) {
          return;
        }
        
        startDrag(widget, e);
      };
      
      // Only add listeners if widget is in edit mode and doesn't already have them
      if (!widget.dataset.dragListenerAdded) {
        widget.addEventListener('mousedown', handleDragStart);
        widget.addEventListener('touchstart', handleDragStart, { passive: false });
        widget.dataset.dragListenerAdded = 'true';
      }
      
      // Update scale on initial load
      updateWidgetScale(widget);
    });
  }, 100);
  
  // Global mouse and touch events
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchEnd);
}

// Add resize handles to widget
function addResizeHandles(widget) {
  // Remove existing handles
  widget.querySelectorAll('.resize-handle').forEach(h => h.remove());
  
  // Add corner and edge handles
  const handles = [
    { class: 'bottom-right', cursor: 'nwse-resize' },
    { class: 'bottom-left', cursor: 'nesw-resize' },
    { class: 'top-right', cursor: 'nesw-resize' },
    { class: 'top-left', cursor: 'nwse-resize' },
    { class: 'right', cursor: 'ew-resize' },
    { class: 'left', cursor: 'ew-resize' },
    { class: 'bottom', cursor: 'ns-resize' },
    { class: 'top', cursor: 'ns-resize' }
  ];
  
  handles.forEach(handle => {
    const handleEl = document.createElement('div');
    handleEl.className = `resize-handle ${handle.class}`;
    handleEl.style.cursor = handle.cursor;
    const handleResizeStart = (e) => {
      // Only allow resize in edit mode - check the widget's parent dashboard
      const dashboard = widget.closest('.dashboard.page');
      const inEditMode = dashboard && dashboard.classList.contains('edit-mode');
      if (!inEditMode) {
        return;
      }
      
      e.stopPropagation();
      startResize(widget, handle.class, e);
    };
    
    handleEl.addEventListener('mousedown', handleResizeStart);
    handleEl.addEventListener('touchstart', handleResizeStart, { passive: false });
    widget.appendChild(handleEl);
  });
  
  // Resize handles added (logging removed to reduce console noise)
}

// Add rotate handle to widget (only for blank widget)
function addRotateHandle(widget) {
  // Remove existing rotate handle
  widget.querySelectorAll('.rotate-handle').forEach(h => h.remove());
  
  const handleEl = document.createElement('div');
  handleEl.className = 'rotate-handle';
  handleEl.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
      <path d="M8 8c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M16 16c0 2.21-1.79 4-4 4s-4-1.79-4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M8 8l-2-2M16 8l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M8 16l-2 2M16 16l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `;
  
  const handleRotateStart = (e) => {
    // Only allow rotate in edit mode
    const dashboard = widget.closest('.dashboard.page');
    const inEditMode = dashboard && dashboard.classList.contains('edit-mode');
    if (!inEditMode) {
      return;
    }
    
    e.stopPropagation();
    startRotate(widget, e);
  };
  
  handleEl.addEventListener('mousedown', handleRotateStart);
  handleEl.addEventListener('touchstart', handleRotateStart, { passive: false });
  widget.appendChild(handleEl);
}

// Start rotating widget
function startRotate(widget, e) {
  rotateWidget = widget;
  widget.classList.add('rotating');
  
  const rect = widget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Support both mouse and touch events
  const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  // Get current rotation angle
  const currentRotation = widget.getAttribute('data-rotation') ? parseFloat(widget.getAttribute('data-rotation')) : 0;
  
  // Calculate initial angle from center to mouse/touch point
  const initialAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  
  rotateStart.x = clientX;
  rotateStart.y = clientY;
  rotateStart.angle = currentRotation;
  rotateStart.initialAngle = initialAngle;
  rotateStart.centerX = centerX;
  rotateStart.centerY = centerY;
  
  e.preventDefault();
  e.stopPropagation();
}

// Start dragging widget
function startDrag(widget, e) {
  draggedWidget = widget;
  widget.classList.add('dragging');
  
  const rect = widget.getBoundingClientRect();
  // Support both mouse and touch events
  const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  dragOffset.x = clientX - rect.left;
  dragOffset.y = clientY - rect.top;
  
  e.preventDefault();
  if (e.touches) {
    e.stopPropagation();
  }
}

// Start resizing widget
function startResize(widget, direction, e) {
  resizeWidget = widget;
  resizeDirection = direction;
  widget.classList.add('resizing');
  
  const rect = widget.getBoundingClientRect();
  const dashboard = widget.closest('.dashboard.page');
  if (!dashboard) return;
  const dashboardRect = dashboard.getBoundingClientRect();
  
  // Support both mouse and touch events
  const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  resizeStart.x = clientX;
  resizeStart.y = clientY;
  resizeStart.width = rect.width;
  resizeStart.height = rect.height;
  resizeStart.left = rect.left - dashboardRect.left;
  resizeStart.top = rect.top - dashboardRect.top;
  
  e.preventDefault();
  e.stopPropagation();
}

// Handle mouse move for drag and resize
function handleMouseMove(e) {
  if (draggedWidget) {
    const dashboard = draggedWidget.closest('.dashboard.page');
    if (!dashboard) return;
    const dashboardRect = dashboard.getBoundingClientRect();
    
    let newX = e.clientX - dashboardRect.left - dragOffset.x;
    let newY = e.clientY - dashboardRect.top - dragOffset.y;
    
    // Keep widget within dashboard bounds (allow some overflow for partial visibility)
    const rect = draggedWidget.getBoundingClientRect();
    const minVisible = 50; // Minimum pixels that must be visible
    newX = Math.max(-rect.width + minVisible, Math.min(newX, dashboardRect.width - minVisible));
    newY = Math.max(-rect.height + minVisible, Math.min(newY, dashboardRect.height - minVisible));
    
    // Snap to grid
    newX = snapToGridValue(newX);
    newY = snapToGridValue(newY);
    
    draggedWidget.style.left = `${newX}px`;
    draggedWidget.style.top = `${newY}px`;
    
    draggedWidget.classList.add('snapping');
  }
  
  if (resizeWidget) {
    const dashboard = resizeWidget.closest('.dashboard');
    if (!dashboard) return;
    const dashboardRect = dashboard.getBoundingClientRect();
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newLeft = resizeStart.left;
    let newTop = resizeStart.top;
    
    // Handle different resize directions
    if (resizeDirection.includes('right')) {
      newWidth = resizeStart.width + deltaX;
    }
    if (resizeDirection.includes('left')) {
      newWidth = resizeStart.width - deltaX;
      newLeft = resizeStart.left + deltaX;
    }
    if (resizeDirection.includes('bottom')) {
      newHeight = resizeStart.height + deltaY;
    }
    if (resizeDirection.includes('top')) {
      // When dragging top handle up (negative deltaY), height increases and top moves up
      // When dragging top handle down (positive deltaY), height decreases and top moves down
      newHeight = resizeStart.height - deltaY;
      newTop = resizeStart.top + deltaY;
    }
    
    // Enforce minimum size based on widget type
    let minWidth = 200;
    let minHeight = 150;
    
    // Widget-specific minimum sizes
    if (resizeWidget.classList.contains('garage-widget')) {
      minWidth = 400; // Need space for 3 garage doors
      minHeight = 150;
    } else if (resizeWidget.classList.contains('alarm-widget')) {
      minWidth = 200;
      minHeight = 150;
    } else if (resizeWidget.classList.contains('weather-widget')) {
      minWidth = 300;
      minHeight = 300; // Need space for current + forecast
    } else if (resizeWidget.classList.contains('whiteboard-widget')) {
      minWidth = 200;
      minHeight = 150; // Allow smaller whiteboard
    }
    
    // Apply minimum constraints BEFORE boundary checks
    if (newWidth < minWidth) {
      if (resizeDirection.includes('left')) {
        newLeft = resizeStart.left + resizeStart.width - minWidth;
      }
      newWidth = minWidth;
    }
    
    if (newHeight < minHeight) {
      if (resizeDirection.includes('top')) {
        // When constrained to min height, adjust top to keep bottom in place
        newTop = resizeStart.top + resizeStart.height - minHeight;
      }
      newHeight = minHeight;
    }
    
    // Keep within dashboard bounds - but allow some flexibility for resizing
    // Allow widget to go slightly outside bounds during resize for better UX
    const minVisible = 50; // Minimum pixels that must be visible
    newLeft = Math.max(-newWidth + minVisible, Math.min(newLeft, dashboardRect.width - minVisible));
    newTop = Math.max(-newHeight + minVisible, Math.min(newTop, dashboardRect.height - minVisible));
    
    // If resizing from top and top was constrained, adjust height to compensate
    if (resizeDirection.includes('top')) {
      const originalNewTop = newTop;
      const constrainedTop = Math.max(-newHeight + minVisible, Math.min(newTop, dashboardRect.height - minVisible));
      
      if (constrainedTop !== originalNewTop) {
        // Top was constrained, so adjust height to maintain the intended resize effect
        // Calculate the bottom position based on the original resize calculation
        const originalBottom = resizeStart.top + resizeStart.height;
        // The new bottom should be: original bottom + (how much we wanted to move the top)
        // But since top is constrained, adjust height to reach that bottom position
        const intendedBottom = originalBottom + (originalNewTop - resizeStart.top);
        newHeight = intendedBottom - constrainedTop;
        newTop = constrainedTop;
        
        // Re-apply minimum height after adjustment
        if (newHeight < minHeight) {
          newHeight = minHeight;
          // If we hit min height, adjust top to keep bottom in place
          newTop = resizeStart.top + resizeStart.height - minHeight;
          // But still respect dashboard bounds
          newTop = Math.max(-newHeight + minVisible, Math.min(newTop, dashboardRect.height - minVisible));
        }
        
        // Enforce maximum height (prevent widget from growing too large)
        const maxHeight = dashboardRect.height + 100; // Allow slight overflow
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          // Adjust top to keep bottom in reasonable position
          newTop = Math.max(-newHeight + minVisible, Math.min(newTop, dashboardRect.height - minVisible));
        }
      }
    }
    
    // Enforce maximum height for all resize directions
    const maxHeight = dashboardRect.height + 100; // Allow slight overflow
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      // If resizing from bottom, adjust position
      if (resizeDirection.includes('bottom')) {
        // Keep top in place, just limit height
      } else if (resizeDirection.includes('top')) {
        // Adjust top to keep bottom reasonable
        newTop = Math.max(-newHeight + minVisible, Math.min(newTop, dashboardRect.height - minVisible));
      }
    }
    
    // Snap to grid
    newWidth = snapToGridValue(newWidth);
    newHeight = snapToGridValue(newHeight);
    newLeft = snapToGridValue(newLeft);
    newTop = snapToGridValue(newTop);
    
    resizeWidget.style.width = `${newWidth}px`;
    resizeWidget.style.height = `${newHeight}px`;
    resizeWidget.style.left = `${newLeft}px`;
    resizeWidget.style.top = `${newTop}px`;
    
    // Update content scale
    updateWidgetScale(resizeWidget);
    
    resizeWidget.classList.add('snapping');
  }
  
  if (rotateWidget) {
    const rect = rotateWidget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate angle from center to current mouse/touch position
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    // Calculate the difference from initial angle
    let angleDelta = currentAngle - rotateStart.initialAngle;
    
    // Normalize angle delta to -180 to 180 range
    while (angleDelta > 180) angleDelta -= 360;
    while (angleDelta < -180) angleDelta += 360;
    
    // Calculate new rotation angle
    let newAngle = rotateStart.angle + angleDelta;
    
    // Snap to 15-degree increments
    newAngle = Math.round(newAngle / 15) * 15;
    
    // Normalize to 0-360 range
    while (newAngle < 0) newAngle += 360;
    while (newAngle >= 360) newAngle -= 360;
    
    // Apply rotation
    rotateWidget.style.transform = `rotate(${newAngle}deg)`;
    rotateWidget.setAttribute('data-rotation', newAngle);
    rotateWidget.classList.add('snapping');
  }
}

// Handle touch move for drag and resize
function handleTouchMove(e) {
  if (!draggedWidget && !resizeWidget && !rotateWidget) return;
  
  // Only process if we have a touch
  if (!e.touches || e.touches.length === 0) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Create a synthetic mouse event for compatibility
  const touch = e.touches[0];
  const syntheticEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation()
  };
  
  handleMouseMove(syntheticEvent);
}

// Handle touch end - end drag/resize/rotate
function handleTouchEnd(e) {
  if (draggedWidget || resizeWidget || rotateWidget) {
    handleMouseUp();
  }
}

// Handle mouse up - end drag/resize/rotate
function handleMouseUp() {
  if (draggedWidget) {
    draggedWidget.classList.remove('dragging', 'snapping');
    updateWidgetScale(draggedWidget);
    saveWidgetLayout();
    draggedWidget = null;
  }
  
  if (resizeWidget) {
    resizeWidget.classList.remove('resizing', 'snapping');
    updateWidgetScale(resizeWidget);
    saveWidgetLayout();
    resizeWidget = null;
    resizeDirection = '';
  }
  
  if (rotateWidget) {
    rotateWidget.classList.remove('rotating', 'snapping');
    saveWidgetLayout();
    rotateWidget = null;
    rotateStart = { x: 0, y: 0, angle: 0 };
  }
}

// Toggle snap-to-grid (can be called from UI later)
function toggleSnapToGrid() {
  snapToGrid = !snapToGrid;
  return snapToGrid;
}

