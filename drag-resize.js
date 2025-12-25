// Drag and Resize functionality for widgets
// Supports free positioning, snap-to-grid, and smart content scaling

const GRID_SIZE = 20; // Grid snap size in pixels
let snapToGrid = true; // Toggle for snap-to-grid
let draggedWidget = null;
let resizeWidget = null;
let dragOffset = { x: 0, y: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
let resizeDirection = '';

// Load saved widget layout from localStorage
function loadWidgetLayout() {
  try {
    const saved = localStorage.getItem('dakboard-widget-layout');
    if (saved) {
      const layout = JSON.parse(saved);
      console.log('Loading saved layout:', layout);
      Object.keys(layout).forEach(widgetId => {
        const widget = document.querySelector(`.${widgetId}`);
        if (widget && layout[widgetId]) {
          const { x, y, width, height, zIndex } = layout[widgetId];
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

// Save widget layout to localStorage
function saveWidgetLayout() {
  try {
    const layout = {};
    document.querySelectorAll('.widget').forEach(widget => {
      const widgetId = widget.classList[1]; // Get second class (e.g., 'calendar-widget')
      const rect = widget.getBoundingClientRect();
      const dashboard = document.querySelector('.dashboard');
      const dashboardRect = dashboard.getBoundingClientRect();
      
      const zIndex = parseInt(window.getComputedStyle(widget).zIndex) || 1;
      layout[widgetId] = {
        x: rect.left - dashboardRect.left,
        y: rect.top - dashboardRect.top,
        width: rect.width,
        height: rect.height,
        zIndex: zIndex
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

// Initialize drag and resize for all widgets
function initializeDragAndResize() {
  // Wait a bit for widgets to be rendered
  setTimeout(() => {
    const widgets = document.querySelectorAll('.widget');
    
    if (widgets.length === 0) {
      console.error('No widgets found! Check HTML structure.');
      return;
    }
    
    widgets.forEach((widget, index) => {
      // Add resize handles
      addResizeHandles(widget);
      
      // Make widget draggable (only in edit mode)
      // In edit mode, entire widget is draggable; in normal mode, no dragging
      widget.addEventListener('mousedown', (e) => {
        // Check if edit mode is active (check dashboard class or global variable)
        const dashboard = document.querySelector('.dashboard');
        const inEditMode = dashboard && dashboard.classList.contains('edit-mode');
        
        if (!inEditMode) {
          return; // Don't allow dragging in normal mode
        }
        
        // Don't drag if clicking on resize handles
        if (e.target.classList.contains('resize-handle') || e.target.closest('.resize-handle')) {
          return;
        }
        
        // Don't drag if clicking on buttons or interactive elements
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'SELECT' ||
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('select')) {
          return;
        }
        
        startDrag(widget, e);
      });
      
      // Update scale on initial load
      updateWidgetScale(widget);
    });
  }, 100);
  
  // Global mouse events
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
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
    handleEl.addEventListener('mousedown', (e) => {
      // Only allow resize in edit mode
      const dashboard = document.querySelector('.dashboard');
      const inEditMode = dashboard && dashboard.classList.contains('edit-mode');
      if (!inEditMode) {
        return;
      }
      
      e.stopPropagation();
      startResize(widget, handle.class, e);
    });
    widget.appendChild(handleEl);
  });
  
  // Resize handles added (logging removed to reduce console noise)
}

// Start dragging widget
function startDrag(widget, e) {
  draggedWidget = widget;
  widget.classList.add('dragging');
  
  const rect = widget.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  e.preventDefault();
}

// Start resizing widget
function startResize(widget, direction, e) {
  resizeWidget = widget;
  resizeDirection = direction;
  widget.classList.add('resizing');
  
  const rect = widget.getBoundingClientRect();
  const dashboard = document.querySelector('.dashboard');
  const dashboardRect = dashboard.getBoundingClientRect();
  
  resizeStart.x = e.clientX;
  resizeStart.y = e.clientY;
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
    const dashboard = document.querySelector('.dashboard');
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
    const dashboard = document.querySelector('.dashboard');
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
}

// Handle mouse up - end drag/resize
function handleMouseUp() {
  if (draggedWidget) {
    draggedWidget.classList.remove('dragging', 'snapping');
    updateWidgetScale(draggedWidget);
    saveWidgetLayout();
    draggedWidget = null;
  }
  
  if (resizeWidget) {
    resizeWidget.classList.remove('resizing', 'snapping');
    saveWidgetLayout();
    resizeWidget = null;
    resizeDirection = '';
  }
}

// Toggle snap-to-grid (can be called from UI later)
function toggleSnapToGrid() {
  snapToGrid = !snapToGrid;
  return snapToGrid;
}

