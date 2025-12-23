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
      Object.keys(layout).forEach(widgetId => {
        const widget = document.querySelector(`.${widgetId}`);
        if (widget && layout[widgetId]) {
          const { x, y, width, height } = layout[widgetId];
          widget.style.left = `${x}px`;
          widget.style.top = `${y}px`;
          widget.style.width = `${width}px`;
          widget.style.height = `${height}px`;
          updateWidgetScale(widget);
        }
      });
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
      
      layout[widgetId] = {
        x: rect.left - dashboardRect.left,
        y: rect.top - dashboardRect.top,
        width: rect.width,
        height: rect.height
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
  const defaultWidth = 500; // Base width for scaling
  const defaultHeight = 400; // Base height for scaling
  
  // Calculate scale factor based on average of width and height scaling
  const widthScale = rect.width / defaultWidth;
  const heightScale = rect.height / defaultHeight;
  const scaleFactor = Math.min(widthScale, heightScale, 1.5); // Cap at 1.5x
  
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
  document.querySelectorAll('.widget').forEach(widget => {
    // Add resize handles
    addResizeHandles(widget);
    
    // Make header draggable
    const header = widget.querySelector('.widget-header');
    if (header) {
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.resize-handle')) return; // Don't drag if clicking resize handle
        startDrag(widget, e);
      });
    }
    
    // Update scale on initial load
    updateWidgetScale(widget);
  });
  
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
      e.stopPropagation();
      startResize(widget, handle.class, e);
    });
    widget.appendChild(handleEl);
  });
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
    
    // Keep widget within dashboard bounds
    const rect = draggedWidget.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, dashboardRect.width - rect.width));
    newY = Math.max(0, Math.min(newY, dashboardRect.height - rect.height));
    
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
      newHeight = resizeStart.height - deltaY;
      newTop = resizeStart.top + deltaY;
    }
    
    // Enforce minimum size
    const minWidth = 200;
    const minHeight = 150;
    
    if (newWidth < minWidth) {
      if (resizeDirection.includes('left')) {
        newLeft = resizeStart.left + resizeStart.width - minWidth;
      }
      newWidth = minWidth;
    }
    
    if (newHeight < minHeight) {
      if (resizeDirection.includes('top')) {
        newTop = resizeStart.top + resizeStart.height - minHeight;
      }
      newHeight = minHeight;
    }
    
    // Keep within dashboard bounds
    newLeft = Math.max(0, Math.min(newLeft, dashboardRect.width - newWidth));
    newTop = Math.max(0, Math.min(newTop, dashboardRect.height - newHeight));
    
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

