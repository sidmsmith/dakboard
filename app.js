// Dakboard - Main Application Logic
// Configuration - Update these with your HA entity IDs


const CONFIG = {
  // Home Assistant Entity IDs
  HA_WEATHER_ENTITY: 'weather.pirateweather', // Update with your Pirate Weather entity ID
  HA_TODO_ENTITY: 'todo.dakboard', // Update with your todo list entity ID
  HA_GARAGE_DOOR_1: 'binary_sensor.z_wave_garage_door_sensor_sensor_state_any', // Update with your garage door entity IDs
  HA_GARAGE_DOOR_2: 'binary_sensor.z_wave_garage_door_sensor_sensor_state_any_2',
  HA_GARAGE_DOOR_3: 'binary_sensor.z_wave_garage_door_sensor_sensor_state_any_3',
  HA_ALARM_ENTITY: 'alarm_control_panel.dev_ttyusb0_alarm_panel', // Update with your alarm entity ID
  HA_COMPRESSOR_ENTITY: 'switch.z_wave_outdoor_smart_plug', // Air Compressor switch
  
  // Thermostat Configuration
  HA_THERMOSTAT_1: 'climate.trane_z_wave_programmable_thermostat', // Basement
  HA_THERMOSTAT_2: 'climate.trane_z_wave_programmable_thermostat_2', // Living Room
  HA_THERMOSTAT_3: 'climate.trane_z_wave_programmable_thermostat_3', // Master Bedroom
  
  GOOGLE_PHOTOS_ALBUM_ID: null, // Optional: Specific album ID to display photos from. If null or empty, randomizes from all photos.
  GOOGLE_PHOTOS_ROTATION_MINUTES: 0.5, // Photo rotation interval in minutes (0.5 = 30 seconds for testing)
  
  // Google Picker API Configuration (NEW - replaces deprecated Library API)
  // Set to true to enable Google Picker API (requires app verification)
  USE_GOOGLE_PICKER_API: true, // Enabled for video recording (app verification pending)
  GOOGLE_PICKER_CLIENT_ID: null, // Your Google OAuth 2.0 Client ID (falls back to GOOGLE_PHOTOS_CLIENT_ID if not set)
  
  // Home Assistant Webhook IDs (for triggering actions)
  // Just the webhook ID, not the full URL - the code will handle the URL construction
  HA_GARAGE_WEBHOOK_1: 'garage1toggle', // Update with your webhook IDs
  HA_GARAGE_WEBHOOK_2: 'garage2toggle',
  HA_GARAGE_WEBHOOK_3: 'garage3toggle',
  HA_ALARM_WEBHOOK: 'setalarm', // Alarm set webhook (only used when disarmed)
  HA_COMPRESSOR_WEBHOOK: 'http://homeassistant.local:8123/api/webhook/compressor', // Air Compressor webhook
  
  // Refresh interval (milliseconds)
  REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Calendar configuration
  CALENDAR_SOURCES: [], // Will be populated when calendar integration is added
};

// Current week tracking for calendar
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of week (Sunday)

// Page Management
let currentPageIndex = 0;
let totalPages = 1;
let pagesContainer = null;
let swipeStartX = 0;
let swipeStartY = 0;
let isSwiping = false;
let isInitialLoad = true; // Track if this is the initial page load

// Clock interval management
let clockInterval = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  
  // Check if drag-resize functions are available
  if (typeof initializeDragAndResize === 'function') {
  } else {
    console.error('initializeDragAndResize function NOT found! Check drag-resize.js loading.');
  }
  
  // Initialize pages system first (creates page structure)
  if (typeof initializePages === 'function') {
    initializePages();
  } else {
    console.error('initializePages function not found!');
  }
  
  // Load visibility for all pages first - this ensures widgets are hidden before layout is applied
  // This prevents widgets from appearing on wrong pages
  const savedTotalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
  for (let i = 0; i < savedTotalPages; i++) {
    const tempPageIndex = currentPageIndex;
    currentPageIndex = i;
    window.currentPageIndex = i;
    if (typeof loadWidgetVisibility === 'function') {
      loadWidgetVisibility();
    }
    // Also load styles for all pages
    if (typeof loadStyles === 'function') {
      loadStyles();
    }
    currentPageIndex = tempPageIndex;
    window.currentPageIndex = tempPageIndex;
  }
  
  // Now load layout - this will position visible widgets correctly
  loadWidgetLayout(); // Load saved positions/sizes
  
  // Ensure current page is fully loaded after all initialization
  // This fixes the issue where initial page display is incorrect after import/refresh
  // showPage() will call loadCurrentPage() which loads visibility, layout, styles, etc.
  if (typeof showPage === 'function') {
    showPage(currentPageIndex);
  }
  
  // Apply dynamic styles to all widgets after initialization
  if (typeof updateWidgetDynamicStyles === 'function') {
    setTimeout(() => {
      document.querySelectorAll('.widget').forEach(widget => {
        updateWidgetDynamicStyles(widget);
      });
    }, 100); // Small delay to ensure all styles are applied first
  }
  
  initializeWidgetControlPanel(); // Initialize widget visibility panel
  initializeCalendar();
  initializeClock(); // Initialize clock
  initializeEventListeners();
  initializeAnnotationCanvas(); // Initialize annotation system
  initializeAnnotationListeners(); // Set up annotation event listeners
  
  // Styling system will initialize itself via styling.js
  
  // Initialize drag and resize - with retry if function not available
  if (typeof initializeDragAndResize === 'function') {
    initializeDragAndResize(); // Initialize drag and resize functionality
  } else {
    console.error('Cannot initialize drag and resize - function not available');
    // Retry after a short delay
    setTimeout(() => {
      if (typeof initializeDragAndResize === 'function') {
        initializeDragAndResize();
      } else {
        console.error('initializeDragAndResize still not available after retry');
      }
    }, 500);
  }
  
  // Load data for current page first
  loadAllData().then(() => {
    // After current page loads, preload all other pages
    const savedTotalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    
    // Preload other pages sequentially to avoid overwhelming the system
    // Load adjacent pages first (before and after current page), then others
    const sortedPages = [];
    
    // Add pages before current (in reverse order)
    for (let i = currentPageIndex - 1; i >= 0; i--) {
      sortedPages.push(i);
    }
    
    // Add pages after current (in order)
    for (let i = currentPageIndex + 1; i < savedTotalPages; i++) {
      sortedPages.push(i);
    }
    
    // Load pages sequentially (one at a time to avoid overwhelming APIs)
    async function preloadNextPage() {
      if (sortedPages.length === 0) return;
      const pageIndex = sortedPages.shift();
      await loadDataForPage(pageIndex);
      // Use a small delay between pages to avoid overwhelming the system
      setTimeout(preloadNextPage, 100);
    }
    
    if (sortedPages.length > 0) {
      preloadNextPage();
    }
  });
  
  startAutoRefresh();
});

// Calendar events cache
let calendarEvents = [];

// Load calendar events from HA
async function loadCalendarEvents() {
  try {
    // Calculate week range
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Use serverless function for calendar API
    const response = await fetch(`/api/ha-calendar?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }
    
    const data = await response.json();
    const allEvents = data.events || [];
    
    // Format events
    calendarEvents = allEvents.map(event => {
        const startTime = event.start || event.start_time || event.dtstart;
        const endTime = event.end || event.end_time || event.dtend;
        const summary = event.summary || event.title || event.name || 'Untitled Event';
        
        // Detect all-day events: check if all_day flag is set, or if times indicate all-day
        let isAllDay = event.all_day || false;
        if (!isAllDay && startTime) {
          const start = new Date(startTime);
          // Check if event starts at midnight and spans full day (or ends at midnight next day)
          const startHour = start.getHours();
          const startMinute = start.getMinutes();
          const startSecond = start.getSeconds();
          
          // Some calendar systems set all-day events to 7pm (19:00) or midnight
          // If it starts at 00:00:00 or 19:00:00 and has no specific time component, treat as all-day
          if ((startHour === 0 && startMinute === 0 && startSecond === 0) || 
              (startHour === 19 && startMinute === 0 && startSecond === 0)) {
            if (endTime) {
              const end = new Date(endTime);
              const endHour = end.getHours();
              const endMinute = end.getMinutes();
              const endSecond = end.getSeconds();
              // If it ends at 00:00:00 next day or 19:00:00 same day, it's likely all-day
              if ((endHour === 0 && endMinute === 0 && endSecond === 0) ||
                  (endHour === 19 && endMinute === 0 && endSecond === 0)) {
                isAllDay = true;
            }
          } else {
              // No end time, but starts at midnight or 7pm - likely all-day
              isAllDay = true;
            }
          }
        }
        
        return {
          id: event.uid || event.id || `${event.calendar}-${startTime}`,
          title: summary,
          start: startTime,
          end: endTime,
          location: event.location || null,
          description: event.description || null,
          calendar: event.calendar,
          allDay: isAllDay
        };
      });
      
      // De-duplicate events: compare by title and start/end times (ignore calendar source)
      calendarEvents = deduplicateEvents(calendarEvents);
    
    // Re-render calendar with events
    renderCalendar();
  } catch (error) {
    console.error('Error loading calendar events:', error);
    calendarEvents = [];
    renderCalendar(); // Re-render even on error
  }
}

// De-duplicate calendar events based on title and start/end times (not calendar source)
function deduplicateEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }
  
  const seen = new Map();
  const unique = [];
  
  for (const event of events) {
    // Create a key from title and normalized start/end times
    const start = new Date(event.start);
    const end = new Date(event.end || event.start);
    
    // Normalize times to date strings (ignore time for comparison)
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    // For all-day events, compare by date only
    // For timed events, compare by date and time
    let key;
    if (event.allDay) {
      key = `${event.title || ''}|${startDateStr}|${endDateStr}|allDay`;
    } else {
      // Include time for timed events
      const startTimeStr = start.toTimeString().split(' ')[0]; // HH:MM:SS
      const endTimeStr = end.toTimeString().split(' ')[0];
      key = `${event.title || ''}|${startDateStr}|${startTimeStr}|${endDateStr}|${endTimeStr}`;
    }
    
    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(event);
    }
  }
  
  return unique;
}

// Initialize calendar view
function initializeCalendar() {
  renderCalendar();
  loadCalendarEvents(); // Load events from HA
}

// Initialize clock
function initializeClock() {
  function updateClock() {
    const now = new Date();
    const timeElements = document.querySelectorAll('#clock-time');
    const dateElements = document.querySelectorAll('#clock-date');
    
      // 12-hour format with AM/PM
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeText = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    timeElements.forEach(el => el.textContent = timeText);
    
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateText = now.toLocaleDateString('en-US', options);
    dateElements.forEach(el => el.textContent = dateText);
    }
  
  // Clear any existing interval to prevent memory leaks
  if (clockInterval) {
    clearInterval(clockInterval);
  }
  
  // Update immediately
  updateClock();
  
  // Update every second
  clockInterval = setInterval(updateClock, 1000);
}

// Initialize event listeners
function initializeEventListeners() {
  // Calendar navigation - use querySelectorAll for multi-page support
  const prevWeekBtns = document.querySelectorAll('#prev-week-btn');
  prevWeekBtns.forEach(btn => {
    if (!btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
    loadCalendarEvents(); // Reload events for new week
      });
    }
  });
  
  const nextWeekBtns = document.querySelectorAll('#next-week-btn');
  nextWeekBtns.forEach(btn => {
    if (!btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
    loadCalendarEvents(); // Reload events for new week
      });
    }
  });
  
  // Monthly view modal - single instance, safe to use getElementById
  const monthViewBtn = document.getElementById('month-view-btn');
  if (monthViewBtn && !monthViewBtn.dataset.listenerAttached) {
    monthViewBtn.dataset.listenerAttached = 'true';
    monthViewBtn.addEventListener('click', () => {
    showMonthModal();
  });
  }
  
  // Todo add item - use querySelectorAll for multi-page support
  const todoInputs = document.querySelectorAll('#todo-input');
  const todoAddBtns = document.querySelectorAll('#todo-add-btn');
  
  todoAddBtns.forEach(btn => {
    if (!btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', () => {
        const input = btn.closest('.todo-widget')?.querySelector('#todo-input');
        if (activeTodoList && input && input.value.trim()) {
          addTodoItem(activeTodoList, input.value);
      }
    });
  }
  });
  
  todoInputs.forEach(input => {
    if (!input.dataset.listenerAttached) {
      input.dataset.listenerAttached = 'true';
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && activeTodoList && input.value.trim()) {
          addTodoItem(activeTodoList, input.value);
      }
    });
  }
  });
  
  // Modal close buttons - single instances, safe to use getElementById
  const closeMonthModalBtn = document.getElementById('close-month-modal');
  if (closeMonthModalBtn && !closeMonthModalBtn.dataset.listenerAttached) {
    closeMonthModalBtn.dataset.listenerAttached = 'true';
    closeMonthModalBtn.addEventListener('click', () => {
    closeMonthModal();
  });
  }
  
  // Close modal on background click
  const monthModal = document.getElementById('month-modal');
  if (monthModal && !monthModal.dataset.listenerAttached) {
    monthModal.dataset.listenerAttached = 'true';
    monthModal.addEventListener('click', (e) => {
    if (e.target.id === 'month-modal') {
      closeMonthModal();
    }
  });
  }
  
  // Hourly forecast modal
  const closeHourlyModalBtn = document.getElementById('close-hourly-modal');
  if (closeHourlyModalBtn && !closeHourlyModalBtn.dataset.listenerAttached) {
    closeHourlyModalBtn.dataset.listenerAttached = 'true';
    closeHourlyModalBtn.addEventListener('click', () => {
    closeHourlyModal();
  });
  }
  
  const hourlyModal = document.getElementById('hourly-modal');
  if (hourlyModal && !hourlyModal.dataset.listenerAttached) {
    hourlyModal.dataset.listenerAttached = 'true';
    hourlyModal.addEventListener('click', (e) => {
    if (e.target.id === 'hourly-modal') {
      closeHourlyModal();
    }
  });
  }
  
  // Calendar event details modal - single instances, safe to use getElementById
  const closeEventModalBtn = document.getElementById('close-event-modal');
  const eventModal = document.getElementById('event-modal');
  
  if (closeEventModalBtn && !closeEventModalBtn.dataset.listenerAttached) {
    closeEventModalBtn.dataset.listenerAttached = 'true';
    closeEventModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeEventModal();
    });
  }
  
  if (eventModal && !eventModal.dataset.listenerAttached) {
    eventModal.dataset.listenerAttached = 'true';
    eventModal.addEventListener('click', (e) => {
      // Close if clicking directly on the modal background (not on modal-content)
      if (e.target === eventModal || e.target.id === 'event-modal') {
        closeEventModal();
      }
    });
    
    // Prevent clicks inside modal-content from closing the modal
    const modalContent = eventModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
  
  // Daily agenda modal - single instances, safe to use getElementById
  const closeDailyAgendaModalBtn = document.getElementById('close-daily-agenda-modal');
  const dailyAgendaModal = document.getElementById('daily-agenda-modal');
  
  if (closeDailyAgendaModalBtn && !closeDailyAgendaModalBtn.dataset.listenerAttached) {
    closeDailyAgendaModalBtn.dataset.listenerAttached = 'true';
    closeDailyAgendaModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDailyAgendaModal();
    });
  }
  
  if (dailyAgendaModal && !dailyAgendaModal.dataset.listenerAttached) {
    dailyAgendaModal.dataset.listenerAttached = 'true';
    dailyAgendaModal.addEventListener('click', (e) => {
      // Close if clicking directly on the modal background (not on modal-content)
      if (e.target === dailyAgendaModal || e.target.id === 'daily-agenda-modal') {
        closeDailyAgendaModal();
      }
    });
    
    // Prevent clicks inside modal-content from closing the modal
    const modalContent = dailyAgendaModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
}

// Render weekly calendar
function renderCalendar() {
  // Get all calendar widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('calendar-widget', currentPageIndex);
  const calendarWidgets = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const grid = widget.querySelector('#calendar-grid');
    const weekRange = widget.querySelector('#week-range');
    // Use fullId (not fullWidgetId) - getWidgetInstances returns fullId
    const fullWidgetId = instance.fullId || instance.fullWidgetId;
    if (grid) calendarWidgets.push({ grid, weekRange, fullWidgetId });
  });
  
  if (calendarWidgets.length === 0) return;
  
  // Update each calendar widget instance
  calendarWidgets.forEach(({ grid, weekRange, fullWidgetId }) => {
    // Load calendar day colors from styles
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    let calendarTodayColor = '#4a90e2'; // Default blue
    let calendarDayColor = '#333333'; // Default dark gray
    
    console.log('[renderCalendar] Widget ID:', fullWidgetId, 'Styles key:', stylesKey);
    
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        console.log('[renderCalendar] Loaded styles:', styles);
        if (styles.calendarTodayColor) {
          // Normalize 3-digit hex to 6-digit
          calendarTodayColor = styles.calendarTodayColor.replace(/^#([0-9A-F])([0-9A-F])([0-9A-F])$/i, '#$1$1$2$2$3$3');
        }
        if (styles.calendarDayColor) {
          // Normalize 3-digit hex to 6-digit
          calendarDayColor = styles.calendarDayColor.replace(/^#([0-9A-F])([0-9A-F])([0-9A-F])$/i, '#$1$1$2$2$3$3');
        }
        console.log('[renderCalendar] Using colors - today:', calendarTodayColor, 'other:', calendarDayColor);
      } catch (e) {
        console.error('Error parsing calendar styles:', e);
      }
    } else {
      console.log('[renderCalendar] No saved styles found, using defaults');
    }
  
  // Clear existing days (keep headers)
  const headers = Array.from(grid.querySelectorAll('.calendar-day-header'));
  grid.innerHTML = '';
  headers.forEach(header => grid.appendChild(header));
  
  // Calculate week dates
  const weekStart = new Date(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Update week range display
    if (weekRange) {
  weekRange.textContent = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    }
  
  // Get today's date for highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Render each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    // Highlight today
    const dateForCompare = new Date(date);
    dateForCompare.setHours(0, 0, 0, 0);
    if (dateForCompare.getTime() === today.getTime()) {
      dayDiv.classList.add('today');
      dayDiv.style.setProperty('background-color', calendarTodayColor, 'important');
      dayDiv.style.setProperty('color', '#fff', 'important'); // White text for today
    } else {
      dayDiv.style.setProperty('background-color', calendarDayColor, 'important');
    }
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = date.getDate();
    dayNumber.style.cursor = 'pointer';
    dayNumber.title = 'Click to view daily agenda';
    
    // Add click handler to show daily agenda
    dayNumber.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isEditMode) {
        showDailyAgenda(date, dayEvents);
      }
    });
    
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'calendar-events';
    
    // Filter and display events for this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEvents = calendarEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // For all-day events, check if the day falls within the event's date range (ignoring time)
      if (event.allDay) {
        // Parse date string directly to avoid timezone conversion issues
        // Event dates are typically in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ"
        const parseDateString = (dateStr) => {
          // Extract date part (before 'T' if present)
          const datePart = dateStr.split('T')[0];
          const parts = datePart.split('-');
          return {
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10) - 1, // JavaScript months are 0-indexed
            day: parseInt(parts[2], 10)
          };
        };
        
        const eventStartParts = parseDateString(event.start);
        const eventEndParts = parseDateString(event.end || event.start);
        
        // For all-day events, end date is typically the day after (exclusive), so subtract 1 day
        const eventEndDateObj = new Date(eventEndParts.year, eventEndParts.month, eventEndParts.day);
        eventEndDateObj.setDate(eventEndDateObj.getDate() - 1);
        
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth();
        const currentDay = date.getDate();
        const currentDateObj = new Date(currentYear, currentMonth, currentDay);
        
        const eventStartDateObj = new Date(eventStartParts.year, eventStartParts.month, eventStartParts.day);
        
        // Check if current day is within the event's date range
        return (currentDateObj >= eventStartDateObj && currentDateObj <= eventEndDateObj);
      } else {
        // For timed events, check if event overlaps with this day
      return (eventStart <= dayEnd && eventEnd >= dayStart);
      }
    });
    
    // Sort events by start time
    dayEvents.sort((a, b) => {
      return new Date(a.start) - new Date(b.start);
    });
    
    // Display events (limit to 3 visible, show "+X more" if needed)
    const maxVisible = 3;
    dayEvents.slice(0, maxVisible).forEach(event => {
      const eventDiv = document.createElement('div');
      eventDiv.className = 'calendar-event';
      
      const eventStart = new Date(event.start);
      let eventText = event.title;
      
      // Add time if not all-day
      if (!event.allDay && eventStart >= dayStart && eventStart <= dayEnd) {
        const timeStr = eventStart.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        eventText = `${timeStr} ${eventText}`;
      }
      
      eventDiv.textContent = eventText;
      eventDiv.title = `${event.title}${event.location ? ` - ${event.location}` : ''}`;
      
      // Add click handler to show event details
      eventDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isEditMode) {
          showEventDetails(event);
        }
      });
      
      eventsDiv.appendChild(eventDiv);
    });
    
    // Show "+X more" if there are more events
    if (dayEvents.length > maxVisible) {
      const moreDiv = document.createElement('div');
      moreDiv.className = 'calendar-event-more';
      moreDiv.textContent = `+${dayEvents.length - maxVisible} more`;
      eventsDiv.appendChild(moreDiv);
    }
    
    dayDiv.appendChild(dayNumber);
    dayDiv.appendChild(eventsDiv);
    grid.appendChild(dayDiv);
  }
    
    if (weekRange) {
      weekRange.textContent = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    }
  });
}

// Show monthly calendar modal
async function showMonthModal() {
  const modal = document.getElementById('month-modal');
  const content = document.getElementById('month-calendar-content');
  
  // Show loading state
  content.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">Loading calendar...</p>';
  modal.classList.add('active');
  
  // Get current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Calculate month start and end
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  
  // Fetch events for the entire month
  const monthEvents = await fetchMonthEvents(monthStart, monthEnd);
  
  // Render month calendar
  renderMonthCalendar(content, currentYear, currentMonth, monthEvents);
}

// Render month calendar view
function renderMonthCalendar(container, year, month, events) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  let html = `
    <div class="month-calendar-header">
      <button class="month-nav-btn" id="prev-month-btn">←</button>
      <h3>${monthNames[month]} ${year}</h3>
      <button class="month-nav-btn" id="next-month-btn">→</button>
    </div>
    <div class="month-calendar-grid">
      <div class="month-calendar-day-header">${dayNames.join('</div><div class="month-calendar-day-header">')}</div>
  `;
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="month-calendar-day empty"></div>';
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Find events for this day
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // For all-day events, check if the day falls within the event's date range (ignoring time)
      if (event.allDay) {
        // Parse date string directly to avoid timezone conversion issues
        const parseDateString = (dateStr) => {
          const datePart = dateStr.split('T')[0];
          const parts = datePart.split('-');
          return {
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10) - 1, // JavaScript months are 0-indexed
            day: parseInt(parts[2], 10)
          };
        };
        
        const eventStartParts = parseDateString(event.start);
        const eventEndParts = parseDateString(event.end || event.start);
        
        // For all-day events, end date is typically the day after (exclusive), so subtract 1 day
        const eventEndDateObj = new Date(eventEndParts.year, eventEndParts.month, eventEndParts.day);
        eventEndDateObj.setDate(eventEndDateObj.getDate() - 1);
        
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth();
        const currentDay = date.getDate();
        const currentDateObj = new Date(currentYear, currentMonth, currentDay);
        
        const eventStartDateObj = new Date(eventStartParts.year, eventStartParts.month, eventStartParts.day);
        
        // Check if current day is within the event's date range
        return (currentDateObj >= eventStartDateObj && currentDateObj <= eventEndDateObj);
      } else {
        // For timed events, check if event overlaps with this day
      return (eventStart <= dayEnd && eventEnd >= dayStart);
      }
    });
    
    const isToday = date.toDateString() === new Date().toDateString();
    const dayClass = isToday ? 'month-calendar-day today' : 'month-calendar-day';
    
    html += `<div class="${dayClass}">
      <div class="month-day-number">${day}</div>
      <div class="month-day-events">`;
    
    // Show up to 3 events, with indicator for more
    const eventsToShow = dayEvents.slice(0, 3);
    const moreCount = dayEvents.length - 3;
    
    eventsToShow.forEach(event => {
      // Don't show time for all-day events
      let timeStr = '';
      let titleText = event.title;
      if (!event.allDay) {
      const eventStart = new Date(event.start);
        timeStr = eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        titleText = `${event.title} - ${timeStr}`;
      }
      html += `<div class="month-event" style="border-left-color: ${event.color || '#4a90e2'}" title="${titleText}">
        ${timeStr ? `<span class="month-event-time">${timeStr}</span>` : ''}
        <span class="month-event-title">${event.title}</span>
      </div>`;
    });
    
    if (moreCount > 0) {
      html += `<div class="month-event-more">+${moreCount} more</div>`;
    }
    
    html += `</div></div>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
  
  // Add navigation listeners
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  
  if (prevBtn) {
    prevBtn.onclick = async () => {
      const newMonth = month === 0 ? 11 : month - 1;
      const newYear = month === 0 ? year - 1 : year;
      const newMonthStart = new Date(newYear, newMonth, 1);
      const newMonthEnd = new Date(newYear, newMonth + 1, 0, 23, 59, 59, 999);
      const newEvents = await fetchMonthEvents(newMonthStart, newMonthEnd);
      renderMonthCalendar(container, newYear, newMonth, newEvents);
    };
  }
  
  if (nextBtn) {
    nextBtn.onclick = async () => {
      const newMonth = month === 11 ? 0 : month + 1;
      const newYear = month === 11 ? year + 1 : year;
      const newMonthStart = new Date(newYear, newMonth, 1);
      const newMonthEnd = new Date(newYear, newMonth + 1, 0, 23, 59, 59, 999);
      const newEvents = await fetchMonthEvents(newMonthStart, newMonthEnd);
      renderMonthCalendar(container, newYear, newMonth, newEvents);
    };
  }
}

// Fetch events for a month range
async function fetchMonthEvents(monthStart, monthEnd) {
  let monthEvents = [];
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      const haUrl = window.CONFIG.HA_URL;
      const haToken = window.CONFIG.HA_TOKEN;
      const calendarEntities = window.CONFIG.HA_CALENDAR_ENTITIES || [];
      
      if (calendarEntities.length > 0) {
        const allEvents = [];
        for (const calEntityId of calendarEntities) {
          try {
            const serviceResponse = await fetch(`${haUrl}/api/services/calendar/get_events`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${haToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                entity_id: calEntityId,
                start_date_time: monthStart.toISOString(),
                end_date_time: monthEnd.toISOString()
              })
            });
            
            if (serviceResponse.ok) {
              const serviceData = await serviceResponse.json();
              let events = [];
              
              // Same parsing logic as weekly calendar
              if (serviceData.service_response && serviceData.service_response[calEntityId]) {
                const calendarData = serviceData.service_response[calEntityId];
                if (calendarData.events && Array.isArray(calendarData.events)) {
                  events = calendarData.events;
                } else if (Array.isArray(calendarData)) {
                  events = calendarData;
                }
              } else if (serviceData[calEntityId]) {
                const calendarData = serviceData[calEntityId];
                if (calendarData.events && Array.isArray(calendarData.events)) {
                  events = calendarData.events;
                } else if (Array.isArray(calendarData)) {
                  events = calendarData;
                }
              } else if (Array.isArray(serviceData)) {
                events = serviceData;
              } else if (serviceData.events && Array.isArray(serviceData.events)) {
                events = serviceData.events;
              }
              
              // Add calendar source to each event (same as weekly calendar)
              if (Array.isArray(events)) {
                events.forEach(event => {
                  event.calendar = calEntityId;
                  allEvents.push(event);
                });
              }
            }
          } catch (err) {
            console.error(`Error fetching events from ${calEntityId}:`, err);
          }
        }
        
        // Format events (same as weekly calendar)
        monthEvents = allEvents.map(event => {
          const startTime = event.start || event.start_time || event.dtstart;
          const endTime = event.end || event.end_time || event.dtend;
          const summary = event.summary || event.title || event.name || 'Untitled Event';
          
          // Detect all-day events (same logic as weekly calendar)
          let isAllDay = event.all_day || false;
          if (!isAllDay && startTime) {
            const start = new Date(startTime);
            const startHour = start.getHours();
            const startMinute = start.getMinutes();
            const startSecond = start.getSeconds();
            
            if ((startHour === 0 && startMinute === 0 && startSecond === 0) || 
                (startHour === 19 && startMinute === 0 && startSecond === 0)) {
              if (endTime) {
                const end = new Date(endTime);
                const endHour = end.getHours();
                const endMinute = end.getMinutes();
                const endSecond = end.getSeconds();
                if ((endHour === 0 && endMinute === 0 && endSecond === 0) ||
                    (endHour === 19 && endMinute === 0 && endSecond === 0)) {
                  isAllDay = true;
                }
              } else {
                isAllDay = true;
              }
            }
          }
          
          return {
            id: event.uid || event.id || `${event.calendar}-${startTime}`,
            title: summary,
            start: startTime,
            end: endTime,
            location: event.location || null,
            description: event.description || null,
            calendar: event.calendar,
            allDay: isAllDay
          };
        });
        
        // De-duplicate month events
        monthEvents = deduplicateEvents(monthEvents);
      } else {
        monthEvents = [];
      }
    } else {
      // Use serverless function (for Vercel production) - match weekly calendar format
      const response = await fetch(`/api/ha-calendar?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`);
      
      if (response.ok) {
        const data = await response.json();
        monthEvents = data.events || [];
        
        // Detect and fix all-day events, then de-duplicate
        monthEvents = monthEvents.map(event => {
          let isAllDay = event.allDay || false;
          if (!isAllDay && event.start) {
            const start = new Date(event.start);
            const startHour = start.getHours();
            const startMinute = start.getMinutes();
            const startSecond = start.getSeconds();
            
            if ((startHour === 0 && startMinute === 0 && startSecond === 0) || 
                (startHour === 19 && startMinute === 0 && startSecond === 0)) {
              if (event.end) {
                const end = new Date(event.end);
                const endHour = end.getHours();
                const endMinute = end.getMinutes();
                const endSecond = end.getSeconds();
                if ((endHour === 0 && endMinute === 0 && endSecond === 0) ||
                    (endHour === 19 && endMinute === 0 && endSecond === 0)) {
                  isAllDay = true;
                }
              } else {
                isAllDay = true;
              }
            }
          }
          return { ...event, allDay: isAllDay };
        });
        
        monthEvents = deduplicateEvents(monthEvents);
      } else {
        console.error('Failed to fetch month calendar events:', response.status);
        monthEvents = [];
      }
    }
  } catch (error) {
    console.error('Error loading month events:', error);
    monthEvents = [];
  }
  return monthEvents;
}

// Close monthly calendar modal
function closeMonthModal() {
  document.getElementById('month-modal').classList.remove('active');
}

// Show hourly forecast modal
function showHourlyForecast(dayOffset, dayName, high, low) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  const modal = document.getElementById('hourly-modal');
  const title = document.getElementById('hourly-modal-title');
  const content = document.getElementById('hourly-forecast-content');
  
  // Update title
  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + dayOffset);
  const dateStr = forecastDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  title.textContent = `Hourly Forecast - ${dayName}, ${dateStr}`;
  
  // Show loading state
  content.innerHTML = '<div class="hourly-loading">Loading hourly forecast...</div>';
  
  // Show modal
  modal.classList.add('active');
  
  // Load hourly data
  loadHourlyForecast(dayOffset, content);
}

// Close hourly forecast modal
function closeHourlyModal() {
  document.getElementById('hourly-modal').classList.remove('active');
}

// Show calendar event details modal
function showEventDetails(event) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  const modal = document.getElementById('event-modal');
  const title = document.getElementById('event-modal-title');
  const content = document.getElementById('event-details-content');
  
  // Set title
  title.textContent = event.title || 'Event Details';
  
  // Format start and end times
  const startDate = new Date(event.start);
  const endDate = new Date(event.end || event.start);
  
  const startStr = startDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endStr = endDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Build event details HTML
  let detailsHTML = `
    <div class="event-detail-row">
      <div class="event-detail-label">Time:</div>
      <div class="event-detail-value">${startStr} - ${endStr}</div>
    </div>
  `;
  
  if (event.location) {
    detailsHTML += `
      <div class="event-detail-row">
        <div class="event-detail-label">Location:</div>
        <div class="event-detail-value">${event.location}</div>
      </div>
    `;
  }
  
  if (event.description) {
    // Clean up description (remove HTML tags if any, handle line breaks)
    let description = event.description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\[CAUTION:.*?\]/g, '') // Remove CAUTION notices
      .trim();
    
    if (description) {
      // Convert line breaks to <br>
      description = description.replace(/\n/g, '<br>');
      detailsHTML += `
        <div class="event-detail-row">
          <div class="event-detail-label">Description:</div>
          <div class="event-detail-value event-description">${description}</div>
        </div>
      `;
    }
  }
  
  if (event.calendar) {
    // Extract calendar name from entity ID (remove calendar. prefix)
    const calendarName = event.calendar.replace(/^calendar\./, '').replace(/_/g, ' ');
    detailsHTML += `
      <div class="event-detail-row">
        <div class="event-detail-label">Calendar:</div>
        <div class="event-detail-value">${calendarName}</div>
      </div>
    `;
  }
  
  content.innerHTML = detailsHTML;
  
  // Show modal
  modal.classList.add('active');
}

// Close calendar event details modal
function closeEventModal() {
  const modal = document.getElementById('event-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Store current agenda date for navigation
let currentAgendaDate = null;

// Show daily agenda modal
function showDailyAgenda(date, events) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  // Store the date for navigation
  currentAgendaDate = new Date(date);
  currentAgendaDate.setHours(0, 0, 0, 0);
  
  loadDailyAgendaForDate(currentAgendaDate);
}

// Load and display agenda for a specific date
function loadDailyAgendaForDate(date) {
  const modal = document.getElementById('daily-agenda-modal');
  const title = document.getElementById('daily-agenda-title');
  const content = document.getElementById('daily-agenda-content');
  
  // Format date for title
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  title.textContent = dateStr;
  
  // Get events for this date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayEvents = calendarEvents.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end || event.start);
    
    // For all-day events, check if the day falls within the event's date range (ignoring time)
    if (event.allDay) {
      // Parse date string directly to avoid timezone conversion issues
      const parseDateString = (dateStr) => {
        const datePart = dateStr.split('T')[0];
        const parts = datePart.split('-');
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10) - 1, // JavaScript months are 0-indexed
          day: parseInt(parts[2], 10)
        };
      };
      
      const eventStartParts = parseDateString(event.start);
      const eventEndParts = parseDateString(event.end || event.start);
      
      // For all-day events, end date is typically the day after (exclusive), so subtract 1 day
      const eventEndDateObj = new Date(eventEndParts.year, eventEndParts.month, eventEndParts.day);
      eventEndDateObj.setDate(eventEndDateObj.getDate() - 1);
      
      const currentYear = date.getFullYear();
      const currentMonth = date.getMonth();
      const currentDay = date.getDate();
      const currentDateObj = new Date(currentYear, currentMonth, currentDay);
      
      const eventStartDateObj = new Date(eventStartParts.year, eventStartParts.month, eventStartParts.day);
      
      // Check if current day is within the event's date range
      return (currentDateObj >= eventStartDateObj && currentDateObj <= eventEndDateObj);
    } else {
      // For timed events, check if event overlaps with this day
      return (eventStart <= dayEnd && eventEnd >= dayStart);
    }
  });
  
  // Sort events by start time
  const sortedEvents = [...dayEvents].sort((a, b) => {
    return new Date(a.start) - new Date(b.start);
  });
  
  // Build agenda HTML
  let agendaHTML = '';
  
  if (sortedEvents.length === 0) {
    agendaHTML = '<div class="daily-agenda-empty">No events scheduled for this day.</div>';
  } else {
    sortedEvents.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // Format time
      let timeStr = '';
      if (event.allDay) {
        timeStr = 'All Day';
      } else {
        const startTime = eventStart.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const endTime = eventEnd.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        timeStr = `${startTime} - ${endTime}`;
      }
      
      // Build event HTML (removed calendar name)
      agendaHTML += `
        <div class="daily-agenda-event" data-event-id="${event.uid || ''}">
          <div class="daily-agenda-event-time">${timeStr}</div>
          <div class="daily-agenda-event-content">
            <div class="daily-agenda-event-title">${event.title || 'Untitled Event'}</div>
            ${event.location ? `<div class="daily-agenda-event-location">📍 ${event.location}</div>` : ''}
            ${event.description ? `<div class="daily-agenda-event-description">${event.description.replace(/<[^>]*>/g, '').replace(/\[CAUTION:.*?\]/g, '').trim()}</div>` : ''}
          </div>
        </div>
      `;
    });
  }
  
  content.innerHTML = agendaHTML;
  
  // Add click handlers to events to show details
  content.querySelectorAll('.daily-agenda-event').forEach(eventEl => {
    eventEl.style.cursor = 'pointer';
    eventEl.addEventListener('click', () => {
      const eventId = eventEl.dataset.eventId;
      const event = sortedEvents.find(e => (e.uid || '') === eventId);
      if (event) {
        closeDailyAgendaModal();
        setTimeout(() => showEventDetails(event), 100);
      }
    });
  });
  
  // Show modal if not already visible
  if (!modal.classList.contains('active')) {
    modal.classList.add('active');
  }
  
  // Set up navigation button event listeners
  setupDailyAgendaNavigation();
}

// Set up daily agenda navigation buttons
function setupDailyAgendaNavigation() {
  const prevDayBtn = document.getElementById('prev-day-btn');
  const nextDayBtn = document.getElementById('next-day-btn');
  
  // Remove existing listeners by cloning and replacing
  if (prevDayBtn) {
    const newPrevBtn = prevDayBtn.cloneNode(true);
    prevDayBtn.parentNode?.replaceChild(newPrevBtn, prevDayBtn);
    newPrevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentAgendaDate) {
        currentAgendaDate.setDate(currentAgendaDate.getDate() - 1);
        loadDailyAgendaForDate(currentAgendaDate);
      }
    });
  }
  
  if (nextDayBtn) {
    const newNextBtn = nextDayBtn.cloneNode(true);
    nextDayBtn.parentNode?.replaceChild(newNextBtn, nextDayBtn);
    newNextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentAgendaDate) {
        currentAgendaDate.setDate(currentAgendaDate.getDate() + 1);
        loadDailyAgendaForDate(currentAgendaDate);
      }
    });
  }
}

// Close daily agenda modal
function closeDailyAgendaModal() {
  const modal = document.getElementById('daily-agenda-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Load hourly forecast for a specific day
async function loadHourlyForecast(dayOffset, contentElement) {
  try {
    // Pirate Weather hourly entities use pattern:
    // sensor.pirateweather_temperature_0h, 1h, 2h, etc. (for current day)
    // For future days, might be: sensor.pirateweather_temperature_24h, 25h, etc. (24h = tomorrow 0h)
    
    const hourlyData = [];
    const hoursToShow = 24; // Show 24 hours
    
    // Calculate starting hour offset (0h = current hour, 24h = tomorrow 0h, etc.)
    const startHour = dayOffset * 24;
    
    // Track consecutive failures to stop early
    let consecutiveFailures = 0;
    const maxFailures = 3;
    
    for (let hourOffset = 0; hourOffset < hoursToShow; hourOffset++) {
      const totalHourOffset = startHour + hourOffset;
      const hourSuffix = `${totalHourOffset}h`;
      
      try {
        // Fetch hourly entities (don't fetch condition - it doesn't exist)
        const [tempEntity, iconEntity, precipEntity] = await Promise.all([
          fetchHAEntity(`sensor.pirateweather_temperature_${hourSuffix}`).catch(() => null),
          fetchHAEntity(`sensor.pirateweather_icon_${hourSuffix}`).catch(() => null),
          fetchHAEntity(`sensor.pirateweather_precip_probability_${hourSuffix}`).catch(() => null)
        ]);
        
        if (tempEntity && tempEntity.state) {
          consecutiveFailures = 0; // Reset on success
          const temp = Math.round(parseFloat(tempEntity.state) || 0);
          
          // Get icon and condition
          let condition = 'unknown';
          let icon = '🌤️';
          
          if (iconEntity && iconEntity.state) {
            const iconState = iconEntity.state;
            if (/[\u{1F300}-\u{1F9FF}]/u.test(iconState)) {
              icon = iconState;
              condition = iconEntity.attributes?.condition || iconEntity.attributes?.friendly_name || 'unknown';
            } else {
              condition = iconState;
              icon = getWeatherIcon(iconState);
            }
          }
          
          // Get precipitation probability
          const precipProb = precipEntity && precipEntity.state ? Math.round(parseFloat(precipEntity.state) || 0) : null;
          
          // Calculate time
          const hourTime = new Date();
          hourTime.setHours(hourTime.getHours() + totalHourOffset);
          const timeStr = hourTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          
          hourlyData.push({
            time: timeStr,
            hour: hourTime.getHours(),
            temp,
            icon,
            condition,
            precipProb
          });
        } else {
          // Entity doesn't exist
          consecutiveFailures++;
          if (consecutiveFailures >= maxFailures) {
            // Stop if we hit too many failures in a row
            break;
          }
        }
      } catch (error) {
        // Silently handle errors - entity doesn't exist
        consecutiveFailures++;
        if (consecutiveFailures >= maxFailures) {
          break;
        }
      }
    }
    
    if (hourlyData.length === 0) {
      contentElement.innerHTML = '<div class="hourly-error">Hourly forecast data not available for this day.</div>';
      return;
    }
    
    // Render hourly forecast
    renderHourlyForecast(hourlyData, contentElement);
  } catch (error) {
    console.error('Error loading hourly forecast:', error);
    contentElement.innerHTML = '<div class="hourly-error">Error loading hourly forecast. Please try again.</div>';
  }
}

// Render hourly forecast
function renderHourlyForecast(hourlyData, container) {
  container.innerHTML = '';
  
  const grid = document.createElement('div');
  grid.className = 'hourly-forecast-grid';
  
  hourlyData.forEach(hour => {
    const item = document.createElement('div');
    item.className = 'hourly-forecast-item';
    
    const time = document.createElement('div');
    time.className = 'hourly-time';
    time.textContent = hour.time;
    
    const icon = document.createElement('div');
    icon.className = 'hourly-icon';
    icon.textContent = hour.icon;
    
    const temp = document.createElement('div');
    temp.className = 'hourly-temp';
    temp.textContent = `${hour.temp}°`;
    
    const details = document.createElement('div');
    details.className = 'hourly-details';
    
    if (hour.precipProb !== null && hour.precipProb > 0) {
      const precip = document.createElement('div');
      precip.textContent = `💧 ${hour.precipProb}%`;
      details.appendChild(precip);
    }
    
    item.appendChild(time);
    item.appendChild(icon);
    item.appendChild(temp);
    if (details.children.length > 0) {
      item.appendChild(details);
    }
    
    grid.appendChild(item);
  });
  
  container.appendChild(grid);
}

// Format date helper
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Load all dashboard data
async function loadAllData() {
  try {
    await Promise.all([
      loadWeather(),
      loadTodos(),
      loadGarageDoors(),
      loadAlarm(),
      loadCompressor(), // Load air compressor
      loadDice(), // Load dice widget
      loadStopwatch(), // Load stopwatch widget
      loadScoreboard(), // Load scoreboard widget
      loadClipArt(), // Load clip art widget
      loadStoplight(), // Load stoplight widget
      loadThermostat(), // Load thermostat
      loadNews(), // Load news feed
      initializeWhiteboard(), // Initialize whiteboard
      loadCalendarEvents() // Reload calendar events on refresh - agenda will load after this
    ]).then(() => {
      // Load agenda after calendar events are loaded
      loadAgenda();
      // Load tasks widget (after todos for list discovery)
      loadTasks();
    });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load widget data for a specific page index
async function loadDataForPage(pageIndex) {
  // Save current page index
  const originalPageIndex = currentPageIndex;
  
  try {
    // Temporarily set currentPageIndex to the target page
    currentPageIndex = pageIndex;
    window.currentPageIndex = pageIndex;
    
    // Load all data for this page
    await loadAllData();
  } catch (error) {
    console.error(`Error loading data for page ${pageIndex}:`, error);
  } finally {
    // Restore original page index
    currentPageIndex = originalPageIndex;
    window.currentPageIndex = originalPageIndex;
  }
}

// Load weather data from HA
async function loadWeather() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_WEATHER_ENTITY);
    if (!entity) return;
    
    const state = entity.state;
    const attrs = entity.attributes;
    
    // Get all weather widget instances on the current page
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const instances = getWidgetInstances('weather-widget', currentPageIndex);
    
    // Update each instance
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      
      // Find elements within this specific widget instance
      const iconEl = widget.querySelector('#weather-icon');
      const temp = widget.querySelector('#weather-temp');
      const condition = widget.querySelector('#weather-conditions');
      const feelsLike = widget.querySelector('#weather-feels-like');
      const humidity = widget.querySelector('#weather-humidity');
      const wind = widget.querySelector('#weather-wind');
      const weatherTime = widget.querySelector('#weather-time');
      
      // Update current conditions
      const icon = getWeatherIcon(attrs.condition || state);
      if (iconEl) iconEl.textContent = icon;
      
      // Primary temp is now "Feels Like" (apparent temperature)
      const feelsLikeTemp = attrs.apparent_temperature || attrs.temperature || attrs.temp || '--';
      if (temp) temp.textContent = `${Math.round(feelsLikeTemp)}°F`;
      
      // Update condition text
      const conditionText = attrs.condition || state || '--';
      if (condition) condition.textContent = conditionText;
      
      // Hide date/time (removed since we have clock widget)
      if (weatherTime) weatherTime.style.display = 'none';
      
      // Update details - "Actual Temperature" shows the current temp
      const actualTemp = attrs.temperature || attrs.temp || '--';
      const actualTempText = actualTemp !== '--' ? `${Math.round(actualTemp)}°F` : '--°F';
      if (feelsLike) feelsLike.textContent = actualTempText;
      if (humidity) humidity.textContent = attrs.humidity ? `${Math.round(attrs.humidity)}%` : '--%';
      if (wind) wind.textContent = attrs.wind_speed ? `${Math.round(attrs.wind_speed)} mph` : '-- mph';
    });
    
    // Load forecast (updates all instances)
    loadWeatherForecast(attrs);
  } catch (error) {
    console.error('Error loading weather:', error);
    const pageElement = getPageElement(currentPageIndex);
    if (pageElement) {
      const instances = getWidgetInstances('weather-widget', currentPageIndex);
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const condition = widget.querySelector('#weather-conditions');
        if (condition) condition.textContent = 'Error loading weather';
      });
    }
  }
}

// Load weather forecast from Pirate Weather entities
async function loadWeatherForecast(attrs) {
  // Get all weather widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('weather-widget', currentPageIndex);
  const forecastLists = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const forecastList = widget.querySelector('#weather-forecast-list');
    if (forecastList) forecastLists.push(forecastList);
  });
  
  if (forecastLists.length === 0) return;
  
  forecastLists.forEach(list => {
    list.innerHTML = '<div style="color: #888; text-align: center; padding: 10px;">Loading forecast...</div>';
  });
  
  try {
    const daysToShow = 5; // Only show 5 days (0d-4d) - entities beyond don't exist
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const forecastData = [];
    
    // Pirate Weather uses pattern:
    // - Highs: sensor.pirateweather_daytime_high_temperature_0d, 1d, 2d, etc.
    // - Lows: sensor.pirateweather_overnight_low_temperature_0d, 1d, 2d, etc.
    // - Icons: sensor.pirateweather_icon_0d, 1d, 2d, etc.
    // Days are 0d (today), 1d (tomorrow), 2d, etc.
    // Only days 0d-4d are available
    
    for (let dayOffset = 0; dayOffset < daysToShow; dayOffset++) {
      try {
        const daySuffix = `${dayOffset}d`;
        
        // Fetch entities for this day
        const [highEntity, lowEntity, iconEntity] = await Promise.all([
          fetchHAEntity(`sensor.pirateweather_daytime_high_temperature_${daySuffix}`).catch(() => null),
          fetchHAEntity(`sensor.pirateweather_overnight_low_temperature_${daySuffix}`).catch(() => null),
          fetchHAEntity(`sensor.pirateweather_icon_${daySuffix}`).catch(() => null)
        ]);
        
        // If we have high and low, we can build the forecast
        if (highEntity && lowEntity && highEntity.state && lowEntity.state) {
          const high = Math.round(parseFloat(highEntity.state) || 0);
          const low = Math.round(parseFloat(lowEntity.state) || 0);
          
          // Get icon and condition from icon entity
          let condition = 'unknown';
          let icon = '🌤️';
          
          if (iconEntity && iconEntity.state) {
            // Icon entity state might be the condition name or icon emoji
            const iconState = iconEntity.state;
            // Check if it's an emoji (contains emoji characters)
            if (/[\u{1F300}-\u{1F9FF}]/u.test(iconState)) {
              icon = iconState;
              // Try to get condition from attributes if available
              condition = iconEntity.attributes?.condition || iconEntity.attributes?.friendly_name || 'unknown';
            } else {
              // It's a condition name, convert to icon
              condition = iconState;
              icon = getWeatherIcon(iconState);
            }
          }
          
          // Calculate day name (today + day offset)
          const forecastDate = new Date();
          forecastDate.setDate(forecastDate.getDate() + dayOffset);
          const dayName = dayNames[forecastDate.getDay()];
          
          forecastData.push({ 
            day: dayOffset + 1, 
            dayName, 
            dayOffset, // Store for click handler
            high, 
            low, 
            condition, 
            icon 
          });
        } else {
          // Entity doesn't exist, stop trying further days
          break;
        }
      } catch (error) {
        // Silently stop if entity doesn't exist
        break;
      }
    }
    
    if (forecastData.length === 0) {
      forecastList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Forecast data not available. Check browser console for entity list.</div>';
      // Log available entities for debugging
      const pirateEntities = await getPirateWeatherEntities();
      return;
    }
    
    // Render forecast
    renderForecast(forecastData, attrs);
  } catch (error) {
    console.error('Error loading forecast:', error);
    forecastList.innerHTML = '<div style="color: #e74c3c; text-align: center; padding: 20px;">Error loading forecast</div>';
  }
}

// Parse forecast from entity list (fallback method)
function parseForecastFromEntities(entities, daysToShow) {
  const forecastData = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Group entities by day offset (0d, 1d, 2d, etc.)
  const dayMap = {};
  
  entities.forEach(entity => {
    const id = entity.entity_id.toLowerCase();
    // Extract day offset from entity ID (e.g., "daily_high_temperature_0d" -> 0, "1d" -> 1)
    const dayMatch = id.match(/(\d+)d$/);
    if (dayMatch) {
      const dayOffset = parseInt(dayMatch[1]);
      if (dayOffset >= 0 && dayOffset < daysToShow) {
        if (!dayMap[dayOffset]) {
          dayMap[dayOffset] = {};
        }
        
        const stateValue = entity.state;
        if (id.includes('daytime_high_temperature')) {
          dayMap[dayOffset].high = Math.round(parseFloat(stateValue) || 0);
        } else if (id.includes('overnight_low_temperature')) {
          dayMap[dayOffset].low = Math.round(parseFloat(stateValue) || 0);
        } else if (id.includes('condition')) {
          dayMap[dayOffset].condition = stateValue || 'unknown';
        } else if (id.includes('icon') && !id.includes('time')) {
          dayMap[dayOffset].icon = stateValue;
        }
      }
    }
  });
  
  // Build forecast array
  for (let dayOffset = 0; dayOffset < daysToShow; dayOffset++) {
    if (dayMap[dayOffset] && dayMap[dayOffset].high !== undefined && dayMap[dayOffset].low !== undefined) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + dayOffset);
      const dayName = dayNames[forecastDate.getDay()];
      
      forecastData.push({
        day: dayOffset + 1,
        dayName,
        high: dayMap[dayOffset].high,
        low: dayMap[dayOffset].low,
        condition: dayMap[dayOffset].condition || 'unknown',
        icon: dayMap[dayOffset].icon || getWeatherIcon(dayMap[dayOffset].condition || 'unknown')
      });
    }
  }
  
  return forecastData;
}

// Render forecast items
function renderForecast(forecastData, attrs) {
  const forecastLists = document.querySelectorAll('#weather-forecast-list');
  if (forecastLists.length === 0) return;
  
  if (forecastData.length === 0) {
    const noDataHtml = '<div style="color: #888; text-align: center; padding: 20px;">No forecast data available</div>';
    forecastLists.forEach(list => list.innerHTML = noDataHtml);
    return;
  }
  
  // Calculate temperature range for bars
  const allHighs = forecastData.map(d => d.high);
  const allLows = forecastData.map(d => d.low);
  const minTemp = Math.min(...allLows);
  const maxTemp = Math.max(...allHighs);
  const range = maxTemp - minTemp;
  
  // Current temp for marker
  const currentTemp = attrs.temperature ? Math.round(attrs.temperature) : null;
  
  // Helper function to create a forecast item
  function createForecastItem(day, index, range, minTemp, currentTemp) {
    const lowPercent = range > 0 ? ((day.low - minTemp) / range) * 100 : 0;
    const highPercent = range > 0 ? ((day.high - minTemp) / range) * 100 : 100;
    const barWidth = highPercent - lowPercent;
    const barLeft = lowPercent;
    
    // Current temp marker on first day
    let markerPercent = null;
    if (currentTemp && index === 0 && currentTemp >= minTemp && currentTemp <= maxTemp) {
      markerPercent = range > 0 ? ((currentTemp - minTemp) / range) * 100 : 50;
    }
    
    const forecastItem = document.createElement('div');
    forecastItem.className = 'weather-forecast-item';
    
    // Day name
    const dayDiv = document.createElement('div');
    dayDiv.className = 'weather-forecast-day';
    dayDiv.textContent = day.dayName;
    
    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'weather-forecast-icon';
    iconDiv.textContent = day.icon;
    
    // Temps container
    const tempsDiv = document.createElement('div');
    tempsDiv.className = 'weather-forecast-temps';
    
    // Low temp
    const lowDiv = document.createElement('div');
    lowDiv.className = 'weather-forecast-low';
    lowDiv.textContent = `${day.low}°`;
    
    // Bar
    const bar = document.createElement('div');
    bar.className = 'weather-forecast-bar';
    
    // Bar fill
    const barFill = document.createElement('div');
    barFill.className = 'weather-forecast-bar-fill';
    barFill.style.width = `${barWidth}%`;
    barFill.style.left = `${barLeft}%`;
    
    // Current temp marker (if today)
    if (markerPercent !== null) {
      const marker = document.createElement('div');
      marker.className = 'weather-forecast-bar-marker';
      marker.style.left = `${markerPercent}%`;
      barFill.appendChild(marker);
    }
    
    bar.appendChild(barFill);
    
    // High temp
    const highDiv = document.createElement('div');
    highDiv.className = 'weather-forecast-high';
    highDiv.textContent = `${day.high}°`;
    
    // Assemble
    tempsDiv.appendChild(lowDiv);
    tempsDiv.appendChild(bar);
    tempsDiv.appendChild(highDiv);
    
    forecastItem.appendChild(dayDiv);
    forecastItem.appendChild(iconDiv);
    forecastItem.appendChild(tempsDiv);
    
    // Add click handler to load hourly forecast (capture day data in closure)
    const dayOffsetForClick = day.dayOffset !== undefined ? day.dayOffset : index;
    forecastItem.addEventListener('click', (function(offset, name, highTemp, lowTemp) {
      return function(e) {
        e.stopPropagation();
        if (!isEditMode) {
          showHourlyForecast(offset, name, highTemp, lowTemp);
        }
      };
    })(dayOffsetForClick, day.dayName, day.high, day.low));
    
    return forecastItem;
  }
  
  // Update all forecast lists - simplified: just add all items directly to the list
  forecastLists.forEach(forecastList => {
    forecastList.innerHTML = '';
    
    if (forecastData.length === 0) return;
    
    // Add all forecast items directly to the list (no separate containers)
    forecastData.forEach((day, index) => {
      const dayItem = createForecastItem(day, index, range, minTemp, currentTemp);
      forecastList.appendChild(dayItem);
    });
    
    // Calculate available height for forecast list and enable scrolling if needed
    updateForecastListHeight(forecastList);
  });
}

// Calculate available height for forecast list and enable scrolling
function updateForecastListHeight(forecastList) {
  const widget = forecastList.closest('.weather-widget');
  const weatherContent = widget?.querySelector('#weather-content');
  const weatherCurrent = weatherContent?.querySelector('.weather-current');
  const forecastSection = forecastList.closest('.weather-forecast');
  const forecastHeader = forecastSection?.querySelector('.weather-forecast-header');
  
  if (!widget || !weatherContent || !forecastSection) return;
  
  // Get widget's actual rendered height (including borders, padding)
  const widgetRect = widget.getBoundingClientRect();
  const widgetHeight = widgetRect.height;
  
  // Get widget-header height (title)
  const widgetHeader = widget.querySelector('.widget-header');
  const widgetHeaderHeight = widgetHeader ? widgetHeader.getBoundingClientRect().height : 0;
  
  // Get widget padding (top + bottom)
  const widgetStyle = window.getComputedStyle(widget);
  const widgetPaddingTop = parseFloat(widgetStyle.paddingTop) || 0;
  const widgetPaddingBottom = parseFloat(widgetStyle.paddingBottom) || 0;
  const widgetBorderTop = parseFloat(widgetStyle.borderTopWidth) || 0;
  const widgetBorderBottom = parseFloat(widgetStyle.borderBottomWidth) || 0;
  const widgetPadding = widgetPaddingTop + widgetPaddingBottom + widgetBorderTop + widgetBorderBottom;
  
  // Get weather-content gap and padding
  const contentStyle = window.getComputedStyle(weatherContent);
  const contentGap = parseFloat(contentStyle.gap) || 0;
  
  // Get weather-current height
  const currentHeight = weatherCurrent ? weatherCurrent.getBoundingClientRect().height : 0;
  
  // Get forecast section margin-top
  const forecastStyle = window.getComputedStyle(forecastSection);
  const forecastMarginTop = parseFloat(forecastStyle.marginTop) || 0;
  
  // Get forecast header height
  const headerHeight = forecastHeader ? forecastHeader.getBoundingClientRect().height : 0;
  const headerMarginBottom = forecastHeader ? parseFloat(window.getComputedStyle(forecastHeader).marginBottom) || 0 : 0;
  const totalHeaderHeight = headerHeight + headerMarginBottom;
  
  // Calculate available height for forecast list
  const availableHeight = widgetHeight 
    - widgetHeaderHeight 
    - widgetPadding 
    - currentHeight 
    - contentGap 
    - forecastMarginTop 
    - totalHeaderHeight;
  
  // Only constrain if content exceeds available space
  const totalContentHeight = forecastList.scrollHeight;
  if (totalContentHeight > availableHeight && availableHeight > 0) {
    forecastList.style.maxHeight = `${availableHeight}px`;
    forecastList.style.overflowY = 'auto';
  } else {
    forecastList.style.maxHeight = '';
    forecastList.style.overflowY = '';
  }
}

// Fetch all HA states (helper function)
async function fetchAllHAStates() {
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      const response = await fetch(`${window.CONFIG.HA_URL}/api/states`, {
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) return await response.json();
    } else {
      // Use serverless function
      const response = await fetch('/api/ha-list-entities');
      if (response.ok) {
        const data = await response.json();
        return data.entities || [];
      }
    }
  } catch (error) {
    console.error('Error fetching all states:', error);
  }
  return null;
}

// Get Pirate Weather entities for debugging
async function getPirateWeatherEntities() {
  try {
    const allStates = await fetchAllHAStates();
    if (allStates) {
      return allStates
        .filter(e => e.entity_id.toLowerCase().includes('pirate') || e.entity_id.toLowerCase().includes('weather'))
        .map(e => e.entity_id)
        .slice(0, 50); // First 50 for debugging
    }
  } catch (error) {
    console.error('Error getting Pirate Weather entities:', error);
  }
  return [];
}

// Get weather icon from condition
function getWeatherIcon(condition) {
  if (!condition) return '⏳';
  
  const lower = condition.toLowerCase();
  
  const iconMap = {
    // Clear/Sunny
    'sunny': '☀️',
    'clear': '☀️',
    'clear-day': '☀️',
    'clear-night': '🌙',
    
    // Partly Cloudy
    'partlycloudy': '⛅',
    'partly-cloudy': '⛅',
    'partly-cloudy-day': '⛅',
    'partly-cloudy-night': '☁️',
    
    // Cloudy
    'cloudy': '☁️',
    'overcast': '☁️',
    
    // Rain
    'rainy': '🌧️',
    'rain': '🌧️',
    'shower': '🌦️',
    'showers': '🌦️',
    'light-rain': '🌦️',
    'heavy-rain': '🌧️',
    
    // Thunderstorm
    'thunderstorm': '⛈️',
    'thunder': '⛈️',
    
    // Snow
    'snowy': '❄️',
    'snow': '❄️',
    'sleet': '🌨️',
    'hail': '🌨️',
    
    // Wind/Fog
    'windy': '💨',
    'wind': '💨',
    'foggy': '🌫️',
    'fog': '🌫️',
    'mist': '🌫️',
    
    // Extreme
    'tornado': '🌪️',
    'hurricane': '🌀',
  };
  
  // Try exact match first
  if (iconMap[lower]) {
    return iconMap[lower];
  }
  
  // Try partial matches
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('clear') || lower.includes('sun')) return '☀️';
  if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
  if (lower.includes('wind')) return '💨';
  if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
  
  // Default
  return '🌤️';
}

// Todo list state
let todoLists = [];
let activeTodoList = null;

// Load todos from HA - discover all todo lists
async function loadTodos() {
  try {
    // Get all todo widget instances on the current page
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const instances = getWidgetInstances('todo-widget', currentPageIndex);
    const todoListElements = [];
    
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      const todoList = widget.querySelector('#todo-list');
      if (todoList) todoListElements.push(todoList);
    });
    
    if (todoListElements.length === 0) return;
    
    // Discover all todo list entities
    const allStates = await fetchAllHAStates();
    if (!allStates) {
      const errorHtml = '<li class="todo-item"><span style="color: #888;">Error discovering todo lists</span></li>';
      todoListElements.forEach(list => list.innerHTML = errorHtml);
      return;
    }
    
    // Filter for todo entities - ONLY entities that start with "todo."
    todoLists = allStates
      .filter(e => {
        const entityId = e.entity_id;
        // Only include entities that start with "todo." (case-sensitive)
        return entityId.startsWith('todo.');
      })
      .map(e => ({
        entityId: e.entity_id,
        name: e.attributes?.friendly_name || 
              e.attributes?.name || 
              e.entity_id.replace(/^todo\./, '').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()),
        entity: e
      }));
    
    // Found todo entities
    
    if (todoLists.length === 0) {
      // Try to find any entity with 'todo' in the name for debugging
      const todoLike = allStates.filter(e => 
        e.entity_id.toLowerCase().includes('todo') || 
        (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase().includes('todo'))
      );
      // Filtered todo-like entities for debugging
      
      const noListHtml = '<li class="todo-item"><span style="color: #888;">No todo lists found. Check console for debug info.</span></li>';
      todoListElements.forEach(list => list.innerHTML = noListHtml);
      return;
    }
    
    // Render tabs
    renderTodoTabs();
    
    // Load first list if none active
    if (!activeTodoList && todoLists.length > 0) {
      activeTodoList = todoLists[0].entityId;
      await loadTodoListItems(activeTodoList);
    }
  } catch (error) {
    console.error('Error loading todos:', error);
    const errorHtml = '<li class="todo-item"><span class="error">Error loading todos</span></li>';
    const todoListElements = document.querySelectorAll('#todo-list');
    todoListElements.forEach(list => list.innerHTML = errorHtml);
  }
}

// Render todo list tabs
function renderTodoTabs() {
  // Get all todo widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('todo-widget', currentPageIndex);
  const tabsContainers = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const tabsContainer = widget.querySelector('#todo-tabs');
    if (tabsContainer) tabsContainers.push(tabsContainer);
  });
  
  if (tabsContainers.length === 0) return;
  
  tabsContainers.forEach(tabsContainer => {
  tabsContainer.innerHTML = '';
  
  todoLists.forEach(list => {
    const tab = document.createElement('button');
    tab.className = 'todo-tab';
    if (list.entityId === activeTodoList) {
      tab.classList.add('active');
    }
    tab.textContent = list.name;
    tab.addEventListener('click', () => {
      activeTodoList = list.entityId;
      renderTodoTabs();
      loadTodoListItems(list.entityId);
    });
    tabsContainer.appendChild(tab);
  });
  });
}

// Load items for a specific todo list
async function loadTodoListItems(entityId) {
  try {
    // HA todo items are not in the entity attributes - we need to fetch them via the todo service
    // Use the todo/item/list endpoint
    let items = [];
    
    // Use serverless function - use ha-todo-action with list_items action
      const response = await fetch('/api/ha-todo-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'list_items',
          entity_id: entityId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        items = data.items || [];
      } else {
        console.error('Failed to fetch todo items:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
    }
    
    // Fetched todo items
    
    const todoLists = document.querySelectorAll('#todo-list');
    if (todoLists.length === 0) return;
    
    if (!items || items.length === 0) {
      const noTodosHtml = '<li class="todo-item"><span style="color: #888;">No todos</span></li>';
      todoLists.forEach(list => list.innerHTML = noTodosHtml);
      return;
    }
    
    // Separate completed and incomplete items
    // HA todo items have status: 'needs_action' (incomplete) or 'completed'
    const incomplete = items.filter(item => {
      return !item.status || item.status === 'needs_action' || item.status === 'incomplete';
    });
    const completed = items.filter(item => {
      return item.status === 'completed';
    });
    
    // Update all todo lists across all pages
    todoLists.forEach(todoList => {
      todoList.innerHTML = '';
    
    // Show incomplete first (up to 5 visible, rest scrollable)
    incomplete.forEach(item => {
      const li = createTodoItem(item, entityId);
      todoList.appendChild(li);
    });
    
    // Show completed at bottom (muted/strikethrough)
    completed.forEach(item => {
      const li = createTodoItem(item, entityId, true);
      todoList.appendChild(li);
      });
    });
  } catch (error) {
    console.error('Error loading todo list items:', error);
    const errorHtml = '<li class="todo-item"><span class="error">Error loading items</span></li>';
    const todoLists = document.querySelectorAll('#todo-list');
    todoLists.forEach(list => list.innerHTML = errorHtml);
  }
}

// Create a todo item element
function createTodoItem(item, entityId, isCompleted = false) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  if (isCompleted) {
    li.classList.add('completed');
  }
  
  const checkbox = document.createElement('div');
  checkbox.className = 'todo-checkbox';
  if (isCompleted) {
    checkbox.classList.add('checked');
  }
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    if (!isEditMode) {
      // Checkbox clicked
      toggleTodoItem(entityId, item.uid, !isCompleted);
    }
  });
  
  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = item.summary || 'Untitled';
  
  li.appendChild(checkbox);
  li.appendChild(text);
  
  return li;
}

// Toggle todo item completion
async function toggleTodoItem(entityId, itemUid, complete) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  try {
    const action = complete ? 'complete' : 'uncomplete';
    
    // Use serverless function
    const response = await fetch('/api/ha-todo-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          entity_id: entityId,
          uid: itemUid
        })
      });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to toggle todo item:', response.status, errorText);
      return;
    }
    
    // Successfully toggled todo item
    
    // Reload items after a short delay
    setTimeout(() => {
      loadTodoListItems(entityId);
    }, 500);
  } catch (error) {
    console.error('Error toggling todo item:', error);
  }
}

// Add new todo item
async function addTodoItem(entityId, summary) {
  if (!summary || !summary.trim()) return;
  
  try {
    // Use serverless function
      await fetch('/api/ha-todo-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          entity_id: entityId,
          item: summary.trim()
        })
      });
    
    // Clear input and reload
    // Clear all todo inputs across all pages
    document.querySelectorAll('#todo-input').forEach(input => {
      input.value = '';
    });
    setTimeout(() => {
      loadTodoListItems(entityId);
    }, 300);
  } catch (error) {
    console.error('Error adding todo item:', error);
  }
}

// Cache for MDI icons
const mdiIconCache = {};

// Fetch MDI icon SVG
async function fetchMDIIcon(iconName) {
  if (mdiIconCache[iconName]) {
    return mdiIconCache[iconName];
  }
  
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${iconName}.svg`);
    if (response.ok) {
      const svgText = await response.text();
      mdiIconCache[iconName] = svgText;
      return svgText;
    }
  } catch (error) {
    console.error(`Error fetching MDI icon ${iconName}:`, error);
  }
  
  return null;
}

// Load garage doors from HA
async function loadGarageDoors() {
  const doors = [
    { id: 1, entity: CONFIG.HA_GARAGE_DOOR_1, webhook: CONFIG.HA_GARAGE_WEBHOOK_1, name: 'Garage 1: Truck' },
    { id: 2, entity: CONFIG.HA_GARAGE_DOOR_2, webhook: CONFIG.HA_GARAGE_WEBHOOK_2, name: 'Garage 2: Sarah' },
    { id: 3, entity: CONFIG.HA_GARAGE_DOOR_3, webhook: CONFIG.HA_GARAGE_WEBHOOK_3, name: 'Garage 3: Sidney' },
  ];
  
  // Get all garage widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('garage-widget', currentPageIndex);
  const containers = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const container = widget.querySelector('#garage-doors');
    if (container) containers.push(container);
  });
  
  if (containers.length === 0) return;
  
  // Clear all containers first to prevent duplicate rows
  containers.forEach(container => container.innerHTML = '');
  
  // Pre-fetch both icons
  const [garageIcon, garageOpenIcon] = await Promise.all([
    fetchMDIIcon('garage'),
    fetchMDIIcon('garage-open')
  ]);
  
  for (const door of doors) {
    try {
      const entity = await fetchHAEntity(door.entity);
      // Handle binary_sensor entities (on = open, off = closed)
      // Also handle cover entities (open/closed/opening/closing states)
      const isOpen = entity && (
        entity.state === 'open' || 
        entity.state === 'opening' || 
        entity.state === 'on' // For binary_sensor entities
      );
      
      const doorDiv = document.createElement('div');
      doorDiv.className = `garage-door ${isOpen ? 'open' : 'closed'}`;
      doorDiv.dataset.doorId = door.id;
      doorDiv.dataset.webhookId = door.webhook;
      
      // Use MDI icon based on state
      const iconSvg = isOpen ? (garageOpenIcon || garageIcon) : (garageIcon || garageOpenIcon);
      const iconHtml = iconSvg ? iconSvg.replace('<svg', '<svg class="mdi-icon"') : '<div style="width: 120px; height: 120px; background: currentColor; opacity: 0.3;"></div>';
      
      doorDiv.innerHTML = `
        <div class="garage-door-icon ${isOpen ? 'open' : 'closed'}">
          ${iconHtml}
        </div>
        <div class="garage-door-name">${door.name}</div>
      `;
      
      // Attach event listener to original
      doorDiv.addEventListener('click', (e) => {
        if (!isEditMode) {
          toggleGarageDoor(doorDiv);
        }
      });
      
      // Clone and attach event listeners to each container
      containers.forEach(container => {
        const clonedDoor = doorDiv.cloneNode(true);
        // Re-attach event listener to cloned element
        clonedDoor.addEventListener('click', (e) => {
          if (!isEditMode) {
            toggleGarageDoor(clonedDoor);
          }
        });
        container.appendChild(clonedDoor);
      });
    } catch (error) {
      console.error(`Error loading garage door ${door.id}:`, error);
      // Still create the door element but show error state
      const doorDiv = document.createElement('div');
      doorDiv.className = 'garage-door closed';
      doorDiv.dataset.doorId = door.id;
      doorDiv.dataset.webhookId = door.webhook;
      const iconHtml = garageIcon ? garageIcon.replace('<svg', '<svg class="mdi-icon"') : '<div style="width: 120px; height: 120px; background: currentColor; opacity: 0.3;"></div>';
      doorDiv.innerHTML = `
        <div class="garage-door-icon closed">
          ${iconHtml}
        </div>
        <div class="garage-door-name">${door.name}</div>
      `;
      
      // Clone and attach event listeners to each container
      containers.forEach(container => {
        const clonedDoor = doorDiv.cloneNode(true);
        // Re-attach event listener to cloned element
        clonedDoor.addEventListener('click', (e) => {
          if (!isEditMode) {
            toggleGarageDoor(clonedDoor);
          }
        });
        container.appendChild(clonedDoor);
      });
    }
  }
}

// Show toast notification
function showToast(message, duration = 1000) {
  // Remove any existing toast
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = 'toast-notification';
  toast.textContent = message;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // Wait for fade-out animation
  }, duration);
}

// Toggle garage door
async function toggleGarageDoor(doorElement) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  const webhookId = doorElement.dataset.webhookId;
  if (!webhookId) {
    console.error('No webhook ID for garage door');
    return;
  }
  
  doorElement.classList.add('loading');
  
  // Show toast notification immediately
  showToast('Garage Button Pressed', 1500);
  
  try {
    await triggerHAWebhook(webhookId);
    
    // Reload garage doors after a short delay to get updated state
    setTimeout(() => {
      loadGarageDoors();
    }, 1000);
    
    // Trigger a full refresh after 2-3 seconds to ensure all widgets are updated
    setTimeout(() => {
      loadAllData();
    }, 2500);
  } catch (error) {
    console.error('Error toggling garage door:', error);
    // Still show success message since the webhook likely worked
    // Still trigger full refresh
    setTimeout(() => {
      loadAllData();
    }, 2500);
  } finally {
    doorElement.classList.remove('loading');
  }
}

// Load alarm status from HA
async function loadAlarm() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_ALARM_ENTITY);
    
    // Get all alarm widget instances on the current page
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const instances = getWidgetInstances('alarm-widget', currentPageIndex);
    
    if (!entity) {
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const statusText = widget.querySelector('#alarm-status-text');
        if (statusText) statusText.textContent = 'Not Available';
      });
      return;
    }
    
    const state = entity.state;
    
    // Update each alarm widget instance
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      
      const statusDiv = widget.querySelector('#alarm-status');
      const icon = widget.querySelector('#alarm-icon');
      const text = widget.querySelector('#alarm-status-text');
      
      if (!statusDiv || !icon || !text) return;
    
    // Remove existing state classes
    statusDiv.classList.remove('armed', 'disarmed');
    
    if (state === 'armed_away' || state === 'armed_home' || state === 'armed_night') {
      statusDiv.classList.add('armed');
      icon.textContent = '🔒';
      text.textContent = 'ARMED';
    } else {
      statusDiv.classList.add('disarmed');
      icon.textContent = '🔓';
      text.textContent = 'DISARMED';
    }
    
      // Add click handler - only clickable when DISARMED
      if (state === 'disarmed' || state === 'disarming' || (!state.includes('armed'))) {
        // Only allow clicking when disarmed
        icon.style.cursor = 'pointer';
        icon.onclick = () => {
          if (!isEditMode) {
            setAlarm();
          }
        };
      } else {
        // Armed states are not clickable
        icon.style.cursor = 'not-allowed';
        icon.onclick = null;
      }
    });
  } catch (error) {
    console.error('Error loading alarm:', error);
    const pageElement = getPageElement(currentPageIndex);
    if (pageElement) {
      const instances = getWidgetInstances('alarm-widget', currentPageIndex);
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const statusText = widget.querySelector('#alarm-status-text');
        if (statusText) statusText.textContent = 'Error';
      });
    }
  }
}

// Set alarm (only works when disarmed)
async function setAlarm() {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  // Check current state - only allow if disarmed (check first instance on current page)
  const pageElement = getPageElement(currentPageIndex);
  if (pageElement) {
    const instances = getWidgetInstances('alarm-widget', currentPageIndex);
    if (instances.length > 0) {
      const firstWidget = instances[0].element;
      const firstStatusDiv = firstWidget ? firstWidget.querySelector('#alarm-status') : null;
      if (firstStatusDiv && firstStatusDiv.classList.contains('armed')) {
        return;
      }
    }
  }
  
  // Add loading state to all alarm icons on current page
  if (pageElement) {
    const instances = getWidgetInstances('alarm-widget', currentPageIndex);
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      const icon = widget.querySelector('#alarm-icon');
      if (icon) icon.classList.add('loading');
    });
  }
  
  // Show toast notification immediately (like garage widget)
  showToast('Alarm Button Pressed', 1500);
  
  try {
    // Use triggerHAWebhook which handles both webhook IDs and full URLs
    // It will extract the webhook ID from URLs and use serverless function in production
    // This avoids mixed content errors (HTTP from HTTPS page)
    await triggerHAWebhook(CONFIG.HA_ALARM_WEBHOOK);
    
    // Reload alarm after a short delay to get updated state
    setTimeout(() => {
      loadAlarm();
    }, 1000);
    
    // Trigger a full refresh after 2-3 seconds to ensure all widgets are updated
    setTimeout(() => {
      loadAllData();
    }, 2500);
  } catch (error) {
    console.error('Error setting alarm:', error);
    // Still reload alarm since the webhook likely worked (serverless function may return 500 even on success)
    // This matches the garage widget behavior
    setTimeout(() => {
      loadAlarm();
    }, 1000);
    // Still trigger full refresh
    setTimeout(() => {
      loadAllData();
    }, 2500);
    // Don't show error toast since webhook likely succeeded despite the error
  } finally {
    // Remove loading state from all alarm icons
    const allIcons = document.querySelectorAll('#alarm-icon');
    allIcons.forEach(icon => icon.classList.remove('loading'));
  }
}

// Load air compressor status from HA
async function loadCompressor() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_COMPRESSOR_ENTITY);
    
    // Get all compressor widget instances on the current page
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const instances = getWidgetInstances('compressor-widget', currentPageIndex);
    
    if (!entity) {
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const icon = widget.querySelector('#compressor-icon');
        if (icon) icon.innerHTML = '<div style="color: #999;">Not Available</div>';
      });
      return;
    }
    
    const state = entity.state;
    const isOn = state === 'on';
    
    if (instances.length === 0) return;
    
    // Fetch fan icon if not already cached
    const fanIcon = await fetchMDIIcon('fan');
    
    // Update each compressor widget instance
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      const iconElement = widget.querySelector('#compressor-icon');
      if (!iconElement) return;
      // Clear existing content
      iconElement.innerHTML = '';
      
      // Remove existing state classes
      iconElement.classList.remove('on', 'off');
      
      // Add state class
      if (isOn) {
        iconElement.classList.add('on');
      } else {
        iconElement.classList.add('off');
      }
      
      // Set icon color
      const iconColor = isOn ? '#28a745' : '#dc3545'; // Green for ON, Red for OFF
      
      // Insert fan icon SVG with color
      if (fanIcon) {
        // Replace fill attributes and add inline style to ensure color is applied
        let iconSvg = fanIcon.replace(/fill="[^"]*"/g, ''); // Remove existing fill attributes
        iconSvg = iconSvg.replace('<svg', `<svg style="fill: ${iconColor}; width: 100%; height: 100%;"`);
        iconElement.innerHTML = iconSvg;
      } else {
        // Fallback if icon fails to load
        iconElement.innerHTML = `<div style="font-size: 80px; color: ${iconColor};">🌬️</div>`;
      }
      
      // Make icon clickable
      iconElement.style.cursor = 'pointer';
      iconElement.onclick = () => {
        if (!isEditMode) {
          toggleCompressor();
        }
      };
    });
  } catch (error) {
    console.error('Error loading compressor:', error);
    const pageElement = getPageElement(currentPageIndex);
    if (pageElement) {
      const instances = getWidgetInstances('compressor-widget', currentPageIndex);
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const icon = widget.querySelector('#compressor-icon');
        if (icon) icon.innerHTML = '<div style="color: #999;">Error</div>';
      });
    }
  }
}

// Toggle air compressor (trigger webhook)
async function toggleCompressor() {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  // Add loading state to all compressor icons on current page
  const pageElement = getPageElement(currentPageIndex);
  if (pageElement) {
    const instances = getWidgetInstances('compressor-widget', currentPageIndex);
    instances.forEach(instance => {
      const widget = instance.element;
      if (!widget || widget.classList.contains('hidden')) return;
      const icon = widget.querySelector('#compressor-icon');
      if (icon) icon.classList.add('loading');
    });
  }
  
  // Show toast notification immediately
  showToast('Compressor Button Pressed', 1500);
  
  try {
    // Use triggerHAWebhook which handles both webhook IDs and full URLs
    await triggerHAWebhook(CONFIG.HA_COMPRESSOR_WEBHOOK);
    
    // Reload compressor after a short delay to get updated state
    setTimeout(() => {
      loadCompressor();
    }, 1000);
    
    // Trigger a full refresh after 2-3 seconds to ensure all widgets are updated
    setTimeout(() => {
      loadAllData();
    }, 2500);
  } catch (error) {
    console.error('Error toggling compressor:', error);
    // Still reload compressor since the webhook likely worked
    setTimeout(() => {
      loadCompressor();
    }, 1000);
    // Still trigger full refresh
    setTimeout(() => {
      loadAllData();
    }, 2500);
  } finally {
    // Remove loading state from all compressor icons on current page
    const pageElement = getPageElement(currentPageIndex);
    if (pageElement) {
      const instances = getWidgetInstances('compressor-widget', currentPageIndex);
      instances.forEach(instance => {
        const widget = instance.element;
        if (!widget || widget.classList.contains('hidden')) return;
        const icon = widget.querySelector('#compressor-icon');
        if (icon) icon.classList.remove('loading');
      });
    }
  }
}

// Generate 3D dice cube HTML for a given number (1-6)
// Uses standard die layout where opposite faces sum to 7
function generate3DDice(number, faceColor = '#4a90e2', dotColor = '#ffffff') {
  const size = 120;
  const dotRadius = 8;
  const positions = {
    1: [{ x: size / 2, y: size / 2 }],
    2: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    3: [{ x: size / 4, y: size / 4 }, { x: size / 2, y: size / 2 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    4: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    5: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 2, y: size / 2 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    6: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 4, y: size / 2 }, { x: 3 * size / 4, y: size / 2 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }]
  };
  
  const dots = positions[number] || positions[1];
  const dotsHtml = dots.map(pos => 
    `<circle cx="${pos.x}" cy="${pos.y}" r="${dotRadius}" fill="${dotColor}"/>`
  ).join('');
  
  // Generate all 6 faces of the cube
  const faceHtml = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="dice-face-svg">
      <rect width="${size}" height="${size}" rx="12" ry="12" fill="${faceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      ${dotsHtml}
    </svg>
  `;
  
  // Standard die layout: opposite faces sum to 7
  // Front and back are opposites
  const back = 7 - number;
  
  // Get remaining 4 numbers (excluding front and back)
  const allNumbers = [1, 2, 3, 4, 5, 6];
  const remaining = allNumbers.filter(n => n !== number && n !== back);
  
  // Standard die arrangement based on front number
  // This ensures consistent, unique faces for each orientation
  // Using a deterministic arrangement based on front number
  let top, bottom, right, left;
  
  if (number === 1) {
    // Front: 1, Back: 6
    top = 2; bottom = 5; right = 3; left = 4;
  } else if (number === 2) {
    // Front: 2, Back: 5
    top = 6; bottom = 1; right = 3; left = 4;
  } else if (number === 3) {
    // Front: 3, Back: 4
    top = 1; bottom = 6; right = 2; left = 5;
  } else if (number === 4) {
    // Front: 4, Back: 3
    top = 1; bottom = 6; right = 5; left = 2;
  } else if (number === 5) {
    // Front: 5, Back: 2
    top = 1; bottom = 6; right = 4; left = 3;
  } else { // number === 6
    // Front: 6, Back: 1
    top = 5; bottom = 2; right = 3; left = 4;
  }
  
  // Create 3D cube with 6 faces
  return `
    <div class="dice-3d-cube" data-face="${number}">
      <div class="dice-face dice-face-front" style="background-color: ${faceColor};">
        ${faceHtml}
      </div>
      <div class="dice-face dice-face-back" style="background-color: ${faceColor};">
        ${generateDiceFaceSVG(back, faceColor, dotColor)}
      </div>
      <div class="dice-face dice-face-right" style="background-color: ${faceColor};">
        ${generateDiceFaceSVG(right, faceColor, dotColor)}
      </div>
      <div class="dice-face dice-face-left" style="background-color: ${faceColor};">
        ${generateDiceFaceSVG(left, faceColor, dotColor)}
      </div>
      <div class="dice-face dice-face-top" style="background-color: ${faceColor};">
        ${generateDiceFaceSVG(top, faceColor, dotColor)}
      </div>
      <div class="dice-face dice-face-bottom" style="background-color: ${faceColor};">
        ${generateDiceFaceSVG(bottom, faceColor, dotColor)}
      </div>
    </div>
  `;
}

// Generate SVG for a dice face (helper function)
function generateDiceFaceSVG(number, faceColor, dotColor) {
  const size = 120;
  const dotRadius = 8;
  const positions = {
    1: [{ x: size / 2, y: size / 2 }],
    2: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    3: [{ x: size / 4, y: size / 4 }, { x: size / 2, y: size / 2 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    4: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    5: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 2, y: size / 2 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }],
    6: [{ x: size / 4, y: size / 4 }, { x: 3 * size / 4, y: size / 4 }, { x: size / 4, y: size / 2 }, { x: 3 * size / 4, y: size / 2 }, { x: size / 4, y: 3 * size / 4 }, { x: 3 * size / 4, y: 3 * size / 4 }]
  };
  
  const dots = positions[number] || positions[1];
  const dotsHtml = dots.map(pos => 
    `<circle cx="${pos.x}" cy="${pos.y}" r="${dotRadius}" fill="${dotColor}"/>`
  ).join('');
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="dice-face-svg">
      <rect width="${size}" height="${size}" rx="12" ry="12" fill="${faceColor}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      ${dotsHtml}
    </svg>
  `;
}

// Generate multiple 3D dice variations (different rotations for same number)
function generateDiceFaces(faceColor = '#4a90e2', dotColor = '#ffffff') {
  const faces = [];
  // Generate 3-4 variations of each number (1-6) with different 3D rotations
  for (let num = 1; num <= 6; num++) {
    for (let variant = 0; variant < 3; variant++) {
      faces.push({
        number: num,
        html: generate3DDice(num, faceColor, dotColor),
        rotation: variant * 90 // Different rotations for visual variety
      });
    }
  }
  return faces; // 18 total faces
}

// Load and initialize dice widget
function loadDice() {
  const diceWidgets = document.querySelectorAll('.dice-widget');
  
  if (diceWidgets.length === 0) return;
  
  // Initialize all dice widgets across all pages
  diceWidgets.forEach((widget) => {
    const container = widget.querySelector('.dice-container');
    if (!container) return;
    
    // Get the page index from the widget's parent page
    const pageElement = widget.closest('.dashboard.page');
    const pageIndex = pageElement ? parseInt(pageElement.getAttribute('data-page-id')) || 0 : 0;
    
    // Get widget instance ID from widget's class list
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('dice-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || generateWidgetId('dice-widget', pageIndex, 0);
    
    // If widget doesn't have instance ID, add it
    if (!instanceIdClass) {
      widget.classList.add(fullWidgetId);
    }
    
    // Get widget-specific colors from saved styles or use defaults
    // Storage key: fullWidgetId already includes page index, so don't add it again
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    let diceFaceColor = '#4a90e2';
    let diceDotColor = '#ffffff';
    
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        diceFaceColor = styles.diceFaceColor || diceFaceColor;
        diceDotColor = styles.diceDotColor || diceDotColor;
      } catch (e) {
        console.error('Error parsing dice styles:', e);
      }
    }
    
    // Generate all dice faces with widget-specific colors
    const diceFaces = generateDiceFaces(diceFaceColor, diceDotColor);
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create dice element
    const diceElement = document.createElement('div');
    diceElement.className = 'dice-display';
    diceElement.innerHTML = diceFaces[0].html; // Start with first face
    container.appendChild(diceElement);
    
    // Add default 3D rotation to show it's 3D (slight angle)
    const cube = diceElement.querySelector('.dice-3d-cube');
    if (cube) {
      cube.style.transform = 'rotateX(-15deg) rotateY(15deg)';
    }
    
    // Store dice faces for rolling
    diceElement.dataset.faceColor = diceFaceColor;
    diceElement.dataset.dotColor = diceDotColor;
    
    // Make dice clickable (only in normal mode)
    diceElement.style.cursor = 'pointer';
    diceElement.onclick = () => {
      if (!isEditMode) {
        // Regenerate faces with current colors in case they changed
        const currentFaces = generateDiceFaces(diceFaceColor, diceDotColor);
        rollDice(diceElement, currentFaces);
      }
    };
  });
}

// Stopwatch state management
let stopwatchIntervals = new Map(); // Track intervals per widget instance
let stopwatchStates = new Map(); // Track state per widget instance: { elapsed: number, startTime: number, isRunning: boolean }

// Load and initialize stopwatch widgets
function loadStopwatch() {
  const stopwatchWidgets = document.querySelectorAll('.stopwatch-widget');
  
  if (stopwatchWidgets.length === 0) return;
  
  // Initialize all stopwatch widgets across all pages
  stopwatchWidgets.forEach((widget) => {
    const container = widget.querySelector('.stopwatch-content');
    if (!container) return;
    
    // Get the page index from the widget's parent page
    const pageElement = widget.closest('.dashboard.page');
    const pageIndex = pageElement ? parseInt(pageElement.getAttribute('data-page-id')) || 0 : 0;
    
    // Get widget instance ID from widget's class list
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('stopwatch-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || generateWidgetId('stopwatch-widget', pageIndex, 0);
    
    // If widget doesn't have instance ID, add it
    if (!instanceIdClass) {
      widget.classList.add(fullWidgetId);
    }
    
    // Get saved state from localStorage
    const stateKey = `dakboard-stopwatch-${fullWidgetId}`;
    const savedState = localStorage.getItem(stateKey);
    let state = {
      elapsed: 0, // milliseconds
      startTime: null,
      isRunning: false
    };
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        state.elapsed = parsed.elapsed || 0;
        state.isRunning = parsed.isRunning || false;
        // If it was running, calculate elapsed time since last save
        if (state.isRunning && parsed.lastUpdate) {
          const now = Date.now();
          const timeSinceUpdate = now - parsed.lastUpdate;
          state.elapsed += timeSinceUpdate;
          state.startTime = now - state.elapsed;
        } else {
          state.startTime = null;
        }
      } catch (e) {
        console.error('Error parsing stopwatch state:', e);
      }
    }
    
    stopwatchStates.set(fullWidgetId, state);
    
    // Get widget-specific colors from saved styles or use defaults
    // Storage key: fullWidgetId already includes page index, so don't add it again
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    let textColor = '#1a1a1a';
    let playButtonColor = '#4a90e2';
    let resetButtonColor = '#ffffff';
    
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        textColor = styles.stopwatchTextColor || textColor;
        playButtonColor = styles.stopwatchPlayButtonColor || playButtonColor;
        resetButtonColor = styles.stopwatchResetButtonColor || resetButtonColor;
      } catch (e) {
        console.error('Error parsing stopwatch styles:', e);
      }
    }
    
    // Apply colors
    const display = container.querySelector('.stopwatch-display');
    const playPauseBtn = container.querySelector('.stopwatch-play-pause');
    const resetBtn = container.querySelector('.stopwatch-reset');
    
    if (display) {
      display.style.color = textColor;
    }
    if (playPauseBtn) {
      playPauseBtn.style.backgroundColor = playButtonColor;
    }
    if (resetBtn) {
      resetBtn.style.backgroundColor = resetButtonColor;
      resetBtn.style.color = '#1a1a1a';
    }
    
    // Update display
    updateStopwatchDisplay(fullWidgetId, container);
    
    // Set up button handlers (always reattach to ensure they work)
    if (playPauseBtn) {
      // Remove old listener if exists and reattach
      const newPlayPauseBtn = playPauseBtn.cloneNode(true);
      playPauseBtn.parentNode.replaceChild(newPlayPauseBtn, playPauseBtn);
      newPlayPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const widget = container.closest('.widget');
        const isEditMode = widget && widget.closest('.dashboard.page') && widget.closest('.dashboard.page').classList.contains('edit-mode');
        if (!isEditMode) {
          toggleStopwatch(fullWidgetId, container);
        }
      });
      // Update button state after cloning
      updateStopwatchButton(fullWidgetId, container);
    }
    
    if (resetBtn) {
      // Remove old listener if exists and reattach
      const newResetBtn = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
      newResetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const widget = container.closest('.widget');
        const isEditMode = widget && widget.closest('.dashboard.page') && widget.closest('.dashboard.page').classList.contains('edit-mode');
        if (!isEditMode) {
          resetStopwatch(fullWidgetId, container);
        }
      });
    }
    
    // Update button state
    updateStopwatchButton(fullWidgetId, container);
    
    // Start interval if running
    if (state.isRunning) {
      startStopwatchInterval(fullWidgetId, container);
    }
  });
}

// Update stopwatch display
function updateStopwatchDisplay(widgetId, container) {
  const state = stopwatchStates.get(widgetId);
  if (!state) return;
  
  const display = container.querySelector('.stopwatch-display');
  if (!display) return;
  
  let elapsed = state.elapsed;
  
  // If running, add time since start
  if (state.isRunning && state.startTime) {
    elapsed += Date.now() - state.startTime;
  }
  
  // Format as MM:SS.hh (with smaller milliseconds)
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((elapsed % 1000) / 10);
  
  const mainTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const milliseconds = `.${String(hundredths).padStart(2, '0')}`;
  display.innerHTML = `${mainTime}<span class="stopwatch-milliseconds">${milliseconds}</span>`;
}

// Update stopwatch button state
function updateStopwatchButton(widgetId, container) {
  const state = stopwatchStates.get(widgetId);
  if (!state) return;
  
  const playPauseBtn = container.querySelector('.stopwatch-play-pause');
  const resetBtn = container.querySelector('.stopwatch-reset');
  
  if (playPauseBtn) {
    // Ensure button is always enabled
    playPauseBtn.disabled = false;
    if (state.isRunning) {
      playPauseBtn.classList.add('running');
      playPauseBtn.classList.remove('paused');
    } else {
      playPauseBtn.classList.add('paused');
      playPauseBtn.classList.remove('running');
    }
  }
  
  if (resetBtn) {
    // Ensure button is always enabled
    resetBtn.disabled = false;
  }
}

// Toggle stopwatch (start/pause)
function toggleStopwatch(widgetId, container) {
  const state = stopwatchStates.get(widgetId);
  if (!state) return;
  
  if (state.isRunning) {
    // Pause
    if (state.startTime) {
      state.elapsed += Date.now() - state.startTime;
    }
    state.isRunning = false;
    state.startTime = null;
    stopStopwatchInterval(widgetId);
  } else {
    // Start
    state.isRunning = true;
    state.startTime = Date.now();
    startStopwatchInterval(widgetId, container);
  }
  
  updateStopwatchButton(widgetId, container);
  saveStopwatchState(widgetId);
}

// Reset stopwatch
function resetStopwatch(widgetId, container) {
  const state = stopwatchStates.get(widgetId);
  if (!state) return;
  
  state.elapsed = 0;
  state.isRunning = false;
  state.startTime = null;
  
  stopStopwatchInterval(widgetId);
  updateStopwatchDisplay(widgetId, container);
  updateStopwatchButton(widgetId, container);
  saveStopwatchState(widgetId);
}

// Start stopwatch interval
function startStopwatchInterval(widgetId, container) {
  // Clear any existing interval
  stopStopwatchInterval(widgetId);
  
  // Update every 10ms for smooth hundredths display
  const interval = setInterval(() => {
    updateStopwatchDisplay(widgetId, container);
  }, 10);
  
  stopwatchIntervals.set(widgetId, interval);
}

// Stop stopwatch interval
function stopStopwatchInterval(widgetId) {
  const interval = stopwatchIntervals.get(widgetId);
  if (interval) {
    clearInterval(interval);
    stopwatchIntervals.delete(widgetId);
  }
}

// Save stopwatch state to localStorage
function saveStopwatchState(widgetId) {
  const state = stopwatchStates.get(widgetId);
  if (!state) return;
  
  // Storage key format matches load function: dakboard-stopwatch-{widgetId}
  const stateKey = `dakboard-stopwatch-${widgetId}`;
  const stateToSave = {
    elapsed: state.elapsed,
    isRunning: state.isRunning,
    lastUpdate: Date.now()
  };
  
  localStorage.setItem(stateKey, JSON.stringify(stateToSave));
}

// Scoreboard icon options (make globally accessible, sorted alphabetically by label)
window.SCOREBOARD_ICONS = [
  { value: '🏹', label: 'Archery' },
  { value: '🏀', label: 'Basketball' },
  { value: '⚾', label: 'Baseball' },
  { value: '🏸', label: 'Badminton' },
  { value: '🐻', label: 'Bear' },
  { value: '🥊', label: 'Boxing' },
  { value: '👑', label: 'Crown' },
  { value: '💎', label: 'Diamond' },
  { value: '🦅', label: 'Eagle' },
  { value: '🔥', label: 'Fire' },
  { value: '🥇', label: 'Gold Medal' },
  { value: '🌟', label: 'Glowing Star' },
  { value: '🦁', label: 'Lion' },
  { value: '⚡', label: 'Lightning' },
  { value: '🥋', label: 'Martial Arts' },
  { value: '🦉', label: 'Owl' },
  { value: '🏓', label: 'Ping Pong' },
  { value: '🌈', label: 'Rainbow' },
  { value: '🚀', label: 'Rocket' },
  { value: '🥈', label: 'Silver Medal' },
  { value: '⚽', label: 'Soccer Ball' },
  { value: '⭐', label: 'Star' },
  { value: '🎯', label: 'Target' },
  { value: '🎾', label: 'Tennis' },
  { value: '🐯', label: 'Tiger' },
  { value: '🏆', label: 'Trophy' },
  { value: '🦄', label: 'Unicorn' },
  { value: '🏐', label: 'Volleyball' },
  { value: '🏈', label: 'Football' },
  { value: '🥉', label: 'Bronze Medal' }
].sort((a, b) => a.label.localeCompare(b.label));

// Scoreboard state management
let scoreboardConfigs = new Map(); // Track config per widget instance: { teams, targetScore, increment, sliderColors }
let scoreboardScores = new Map(); // Track scores per widget instance: { teamId: score, ... }
let scoreboardWinners = new Map(); // Track which teams have won per widget instance: Set of teamIds

// Load and initialize scoreboard widgets
function loadScoreboard() {
  const scoreboardWidgets = document.querySelectorAll('.scoreboard-widget');
  
  if (scoreboardWidgets.length === 0) return;
  
  scoreboardWidgets.forEach((widget) => {
    const container = widget.querySelector('.scoreboard-content');
    if (!container) return;
  
    // Get the page index from the widget's parent page
    const pageElement = widget.closest('.dashboard.page');
    const pageIndex = pageElement ? parseInt(pageElement.getAttribute('data-page-id')) || 0 : 0;
    
    // Get widget instance ID from widget's class list
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('scoreboard-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || generateWidgetId('scoreboard-widget', pageIndex, 0);
    
    // If widget doesn't have instance ID, add it
    if (!instanceIdClass) {
      widget.classList.add(fullWidgetId);
    }
    
    // Get saved configuration from localStorage
    const configKey = `dakboard-scoreboard-config-${fullWidgetId}`;
    const savedConfig = localStorage.getItem(configKey);
    
    let config = {
      teams: [
        { id: 'team1', name: 'Team 1', icon: '🚀', sliderColor: '#9b59b6' },
        { id: 'team2', name: 'Team 2', icon: '🦄', sliderColor: '#e74c3c' }
      ],
      targetScore: 10,
      increment: 1
    };
    
    if (savedConfig) {
      try {
        config = JSON.parse(savedConfig);
        // Ensure minimum 2 teams
        if (!config.teams || config.teams.length < 2) {
          config.teams = [
            { id: 'team1', name: 'Team 1', icon: '🚀', sliderColor: '#9b59b6' },
            { id: 'team2', name: 'Team 2', icon: '🦄', sliderColor: '#e74c3c' }
          ];
        }
      } catch (e) {
        console.error('Error parsing scoreboard config:', e);
      }
    }
    
    scoreboardConfigs.set(fullWidgetId, config);
    
    // Get saved scores
    const scoresKey = `dakboard-scoreboard-scores-${fullWidgetId}`;
    const savedScores = localStorage.getItem(scoresKey);
    let scores = {};
    if (savedScores) {
      try {
        scores = JSON.parse(savedScores);
      } catch (e) {
        console.error('Error parsing scoreboard scores:', e);
      }
    }
    
    // Initialize scores for all teams
    config.teams.forEach(team => {
      if (scores[team.id] === undefined) {
        scores[team.id] = 0;
      }
    });
    
    scoreboardScores.set(fullWidgetId, scores);
    
    // Get saved winners
    const winnersKey = `dakboard-scoreboard-winners-${fullWidgetId}`;
    const savedWinners = localStorage.getItem(winnersKey);
    let winners = new Set();
    if (savedWinners) {
      try {
        winners = new Set(JSON.parse(savedWinners));
      } catch (e) {
        console.error('Error parsing scoreboard winners:', e);
      }
    }
    
    scoreboardWinners.set(fullWidgetId, winners);
    
    // Render the scoreboard
    renderScoreboard(fullWidgetId, container);
    
    // Set up reset button (always reattach after render)
    setupResetButton(fullWidgetId, container);
  });
}

// Set up reset button (helper function to ensure it's always active)
function setupResetButton(widgetId, container) {
  const resetBtn = container.querySelector('.scoreboard-reset-btn');
  if (resetBtn) {
    // Remove old listener if exists and reattach
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const widget = container.closest('.widget');
      const isEditMode = widget && widget.closest('.dashboard.page') && widget.closest('.dashboard.page').classList.contains('edit-mode');
      if (!isEditMode) {
        resetScoreboard(widgetId, container);
      }
    });
  }
}

// Render scoreboard
function renderScoreboard(widgetId, container) {
  const config = scoreboardConfigs.get(widgetId);
  const scores = scoreboardScores.get(widgetId);
  const winners = scoreboardWinners.get(widgetId);
  
  if (!config || !scores) return;
  
  // Preserve the reset button before clearing
  const resetBtn = container.querySelector('.scoreboard-reset-btn');
  const resetBtnClone = resetBtn ? resetBtn.cloneNode(true) : null;
  
  container.innerHTML = '';
  
  // Re-add the reset button if it existed (without listener, will be reattached after)
  if (resetBtnClone) {
    // Clear the listener flag so it gets reattached
    resetBtnClone.dataset.listenerAttached = '';
    container.appendChild(resetBtnClone);
  }
  
  config.teams.forEach(team => {
    const score = scores[team.id] || 0;
    const hasWon = winners.has(team.id);
    const percentage = config.targetScore > 0 ? Math.min((score / config.targetScore) * 100, 100) : 0;
    
    const teamElement = document.createElement('div');
    teamElement.className = 'scoreboard-team';
    teamElement.dataset.teamId = team.id;
    
    teamElement.innerHTML = `
      <div class="scoreboard-team-header">
        <span class="scoreboard-team-icon">${team.icon}</span>
        <span class="scoreboard-team-name">${team.name}</span>
      </div>
      <div class="scoreboard-team-controls">
        <button class="scoreboard-btn scoreboard-minus" data-team-id="${team.id}" ${hasWon ? 'disabled' : ''}>−</button>
        <div class="scoreboard-slider-container">
          <div class="scoreboard-slider-track" style="background: rgba(255, 255, 255, 0.2);">
            <div class="scoreboard-slider-fill" style="width: ${percentage}%; background: ${team.sliderColor};">
              <div class="scoreboard-slider-handle" style="border-color: ${team.sliderColor};">
                ${team.icon}
              </div>
            </div>
          </div>
        </div>
        <button class="scoreboard-btn scoreboard-plus" data-team-id="${team.id}" ${hasWon ? 'disabled' : ''}>+</button>
        <div class="scoreboard-score">${score}</div>
      </div>
    `;
    
    container.appendChild(teamElement);
    
    // Attach event listeners
    const minusBtn = teamElement.querySelector('.scoreboard-minus');
    const plusBtn = teamElement.querySelector('.scoreboard-plus');
    
    if (minusBtn && !minusBtn.dataset.listenerAttached) {
      minusBtn.dataset.listenerAttached = 'true';
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isEditMode && !hasWon) {
          updateScore(widgetId, team.id, -config.increment, container);
        }
      });
    }
    
    if (plusBtn && !plusBtn.dataset.listenerAttached) {
      plusBtn.dataset.listenerAttached = 'true';
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isEditMode && !hasWon) {
          updateScore(widgetId, team.id, config.increment, container);
        }
      });
    }
  });
}

// Update score
function updateScore(widgetId, teamId, delta, container) {
  const config = scoreboardConfigs.get(widgetId);
  const scores = scoreboardScores.get(widgetId);
  const winners = scoreboardWinners.get(widgetId);
  
  if (!config || !scores) return;
  
  // Update score
  scores[teamId] = Math.max(0, (scores[teamId] || 0) + delta);
  
  // Check if team reached target
  if (scores[teamId] >= config.targetScore && !winners.has(teamId)) {
    winners.add(teamId);
    // Trigger confetti
    triggerConfetti();
    // Re-render to disable buttons
    renderScoreboard(widgetId, container);
    // Reattach reset button listener after render
    setupResetButton(widgetId, container);
  } else {
    // Just update the display
    updateScoreDisplay(widgetId, teamId, container);
  }
  
  // Save scores and winners
  saveScoreboardState(widgetId);
}

// Update score display for a single team
function updateScoreDisplay(widgetId, teamId, container) {
  const config = scoreboardConfigs.get(widgetId);
  const scores = scoreboardScores.get(widgetId);
  
  if (!config || !scores) return;
  
  const teamElement = container.querySelector(`[data-team-id="${teamId}"]`);
  if (!teamElement) return;
  
  const score = scores[teamId] || 0;
  const percentage = config.targetScore > 0 ? Math.min((score / config.targetScore) * 100, 100) : 0;
  const team = config.teams.find(t => t.id === teamId);
  
  // Update score number
  const scoreElement = teamElement.querySelector('.scoreboard-score');
  if (scoreElement) {
    scoreElement.textContent = score;
  }
  
  // Update slider
  const fillElement = teamElement.querySelector('.scoreboard-slider-fill');
  if (fillElement && team) {
    fillElement.style.width = `${percentage}%`;
  }
}

// Reset scoreboard
function resetScoreboard(widgetId, container) {
  const scores = scoreboardScores.get(widgetId);
  const winners = scoreboardWinners.get(widgetId);
  
  if (!scores) return;
  
  // Reset all scores
  Object.keys(scores).forEach(teamId => {
    scores[teamId] = 0;
  });
  
  // Clear winners
  winners.clear();
  
  // Re-render
  renderScoreboard(widgetId, container);
  
  // Reattach reset button listener after render
  setupResetButton(widgetId, container);
  
  // Save state
  saveScoreboardState(widgetId);
}

// Save scoreboard state
function saveScoreboardState(widgetId) {
  const scores = scoreboardScores.get(widgetId);
  const winners = scoreboardWinners.get(widgetId);
  
  if (scores) {
    const scoresKey = `dakboard-scoreboard-scores-${widgetId}`;
    localStorage.setItem(scoresKey, JSON.stringify(scores));
  }
  
  if (winners) {
    const winnersKey = `dakboard-scoreboard-winners-${widgetId}`;
    localStorage.setItem(winnersKey, JSON.stringify(Array.from(winners)));
  }
}

// Clip art widget - simple image display
function loadClipArt() {
  const clipArtWidgets = document.querySelectorAll('.blank-widget');
  
  if (clipArtWidgets.length === 0) return;
  
  // Initialize all clip art widgets across all pages
  clipArtWidgets.forEach((widget) => {
    const container = widget.querySelector('.clipart-content');
    if (!container) return;
    
    // Get the page index from the widget's parent page
    const pageElement = widget.closest('.dashboard.page');
    const pageIndex = pageElement ? parseInt(pageElement.getAttribute('data-page-id')) || 0 : 0;
    
    // Get widget instance ID from widget's class list
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('blank-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || generateWidgetId('blank-widget', pageIndex, 0);
    
    // If widget doesn't have instance ID, add it
    if (!instanceIdClass) {
      widget.classList.add(fullWidgetId);
    }
    
    // Get saved clip art and color from localStorage
    // Storage key: fullWidgetId already includes page index, so don't add it again
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    
    // Determine display mode - default to 'blank' or 'image' based on existing content
    let displayMode = 'blank';
    let clipArtEmoji = '🎨'; // Default
    let clipArtColor = '#4a90e2'; // Default
    let clipArtTintColor = '#ffffff'; // Default
    let clipArtImageUrl = ''; // Default
    let clipArtShadowEnabled = true; // Default
    let clipArtTintEnabled = true; // Default
    let clipArtVisible = true; // Default
    
    // Text mode variables
    let textContent = '';
    let textFontFamily = 'Comic Sans MS';
    let textFontSize = 16;
    let textFontWeight = 'normal';
    let textColor = '#ffffff';
    let textAlignment = 'left';
    let textItalic = false;
    let textUnderline = false;
    
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        // Determine display mode - prioritize explicit mode, fallback to image if content exists
        displayMode = styles.blankDisplayMode || (styles.clipArtEmoji || styles.clipArtImageUrl ? 'image' : 'blank');
        
        clipArtEmoji = styles.clipArtEmoji || clipArtEmoji;
        clipArtColor = styles.clipArtColor || clipArtColor;
        clipArtTintColor = styles.clipArtTintColor || clipArtTintColor;
        clipArtImageUrl = styles.clipArtImageUrl || clipArtImageUrl;
        clipArtShadowEnabled = styles.clipArtShadowEnabled !== undefined ? styles.clipArtShadowEnabled : true;
        clipArtTintEnabled = styles.clipArtTintEnabled !== undefined ? styles.clipArtTintEnabled : true;
        clipArtVisible = styles.clipArtVisible !== undefined ? styles.clipArtVisible : true;
        
        // Load text mode settings
        textContent = styles.blankTextContent || '';
        textFontFamily = styles.blankTextFontFamily || 'Comic Sans MS';
        textFontSize = styles.blankTextFontSize || 16;
        textFontWeight = styles.blankTextFontWeight || 'normal';
        textColor = styles.blankTextColor || '#ffffff';
        textAlignment = styles.blankTextAlignment || 'left';
        textItalic = styles.blankTextItalic || false;
        textUnderline = styles.blankTextUnderline || false;
      } catch (e) {
        console.error('Error parsing clip art styles:', e);
      }
    }
    
    // Helper function to generate CSS filter for image tinting (same as in styling.js)
    function generateImageTintFilter(tintColor) {
      if (!tintColor || tintColor === '#ffffff' || tintColor === '#FFFFFF') {
        return 'brightness(0) invert(1)';
      }
      const r = parseInt(tintColor.slice(1, 3), 16);
      const g = parseInt(tintColor.slice(3, 5), 16);
      const b = parseInt(tintColor.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const hue = getHueFromRGB(r, g, b);
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      if (brightness > 200) {
        return `brightness(0) invert(1) sepia(1) saturate(${Math.max(1, saturation * 3)}) hue-rotate(${hue}deg) brightness(${brightness / 255})`;
      } else if (brightness > 128) {
        return `brightness(0) invert(1) sepia(1) saturate(${Math.max(2, saturation * 4)}) hue-rotate(${hue}deg) brightness(${brightness / 255})`;
      } else if (brightness > 64) {
        return `brightness(0) invert(1) sepia(1) saturate(${Math.max(3, saturation * 5)}) hue-rotate(${hue}deg) brightness(${brightness / 200})`;
      } else {
        return `brightness(0) saturate(100%) invert(${brightness / 255}) sepia(1) saturate(${Math.max(4, saturation * 6)}) hue-rotate(${hue}deg)`;
      }
    }
    
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
    
    // Display based on mode
    if (displayMode === 'text') {
      // Map font family to Google Fonts if needed
      const fontFamilyMap = {
        'Comic Sans MS': 'Comic Sans MS, cursive',
        'Bangers': 'Bangers, cursive',
        'Fredoka One': 'Fredoka One, cursive',
        'Nunito': 'Nunito, sans-serif',
        'Quicksand': 'Quicksand, sans-serif',
        'Indie Flower': 'Indie Flower, cursive',
        'Permanent Marker': 'Permanent Marker, cursive',
        'Chewy': 'Chewy, cursive',
        'Lobster': 'Lobster, cursive',
        'Pacifico': 'Pacifico, cursive',
        'Bubblegum Sans': 'Bubblegum Sans, cursive',
        'Poppins': 'Poppins, sans-serif',
        'Righteous': 'Righteous, cursive',
        'Bungee': 'Bungee, cursive',
        'Boogaloo': 'Boogaloo, cursive',
        'Creepster': 'Creepster, cursive',
        'Luckiest Guy': 'Luckiest Guy, cursive',
        'Amatic SC': 'Amatic SC, cursive',
        'Shadows Into Light': 'Shadows Into Light, cursive',
        'Kalam': 'Kalam, cursive',
        'Patrick Hand': 'Patrick Hand, cursive',
        'Schoolbell': 'Schoolbell, cursive',
        'Arial': 'Arial, sans-serif',
        'Impact': 'Impact, sans-serif'
      };
      const mappedFontFamily = fontFamilyMap[textFontFamily] || textFontFamily;
      
      // Text mode - create editable text area
      const textStyle = [
        `font-family: ${mappedFontFamily}`,
        `font-size: ${textFontSize}px`,
        `font-weight: ${textFontWeight}`,
        `color: ${textColor}`,
        `text-align: ${textAlignment}`,
        textItalic ? 'font-style: italic' : '',
        textUnderline ? 'text-decoration: underline' : '',
        'white-space: pre-wrap',
        'word-wrap: break-word',
        'width: 100%',
        'height: 100%',
        'padding: 20px',
        'box-sizing: border-box',
        'background: transparent',
        'border: none',
        'outline: none',
        'resize: none',
        'overflow: auto'
      ].filter(s => s).join('; ');
      
      container.innerHTML = `<textarea class="blank-text-editable" data-widget-id="${fullWidgetId}" style="${textStyle}" placeholder="Enter your text here...">${textContent}</textarea>`;
      
      // Make textarea editable and save on blur/input
      const textarea = container.querySelector('.blank-text-editable');
      if (textarea) {
        // Allow editing in both normal and edit mode
        textarea.addEventListener('blur', () => {
          const updatedContent = textarea.value;
          const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
          const saved = localStorage.getItem(stylesKey);
          const styles = saved ? JSON.parse(saved) : {};
          styles.blankTextContent = updatedContent;
          localStorage.setItem(stylesKey, JSON.stringify(styles));
        });
        
        // Auto-resize textarea to fit content
        textarea.addEventListener('input', () => {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        });
      }
    } else if (displayMode === 'image') {
      // Image mode - display clip art (image or emoji) only if visible
      if (!clipArtVisible) {
        container.innerHTML = '';
      } else if (clipArtImageUrl) {
        const shadowFilter = (clipArtShadowEnabled && clipArtColor) ? `drop-shadow(0 0 12px ${clipArtColor})` : '';
        const tintFilter = clipArtTintEnabled ? generateImageTintFilter(clipArtTintColor) : '';
        const combinedFilter = [shadowFilter, tintFilter].filter(f => f).join(' ');
        container.innerHTML = `<div class="clipart-display" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 0; padding: 20px; box-sizing: border-box;"><img src="${clipArtImageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: ${combinedFilter || 'none'};" alt="Clip art"></div>`;
      } else {
        container.innerHTML = `<div class="clipart-display" style="color: ${clipArtColor}; font-size: 120px; text-align: center; line-height: 1; display: flex; align-items: center; justify-content: center; height: 100%;">${clipArtEmoji}</div>`;
      }
    } else {
      // Blank mode - empty
      container.innerHTML = '';
    }
  });
}

// Stoplight state management
let stoplightStates = new Map(); // Track state per widget instance: { activeLight: 'red'|'amber'|'green'|null }

// Agenda widget state management
let agendaDates = new Map(); // Track current date per widget instance: Date object
let agendaMidnightCheckInterval = null; // Interval for checking midnight

// Load and initialize stoplight widgets
function loadStoplight() {
  const stoplightWidgets = document.querySelectorAll('.stoplight-widget');
  
  if (stoplightWidgets.length === 0) return;
  
  stoplightWidgets.forEach((widget) => {
    const container = widget.querySelector('.stoplight-content');
    if (!container) return;
    
    // Get the page index from the widget's parent page
    const pageElement = widget.closest('.dashboard.page');
    const pageIndex = pageElement ? parseInt(pageElement.getAttribute('data-page-id')) || 0 : 0;
    
    // Get widget instance ID from widget's class list
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('stoplight-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || generateWidgetId('stoplight-widget', pageIndex, 0);
    
    // If widget doesn't have instance ID, add it
    if (!instanceIdClass) {
      widget.classList.add(fullWidgetId);
    }
    
    // Load saved state or initialize to null (all lights off)
    let state = stoplightStates.get(fullWidgetId);
    if (!state) {
      const savedState = localStorage.getItem(`dakboard-stoplight-${fullWidgetId}`);
      if (savedState) {
        try {
          state = JSON.parse(savedState);
        } catch (e) {
          console.error('Error parsing stoplight state:', e);
          state = { activeLight: null };
        }
      } else {
        state = { activeLight: null };
      }
      stoplightStates.set(fullWidgetId, state);
    }
    
    // Load text labels and styling from widget styles (for cloning compatibility)
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    let labelsEnabled = false;
    let redText = '';
    let amberText = '';
    let greenText = '';
    let redTextStyle = {};
    let amberTextStyle = {};
    let greenTextStyle = {};
    
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        labelsEnabled = styles.stoplightLabelsEnabled === true;
        redText = styles.stoplightRedText || '';
        amberText = styles.stoplightAmberText || '';
        greenText = styles.stoplightGreenText || '';
        redTextStyle = {
          fontSize: styles.stoplightRedFontSize,
          color: styles.stoplightRedTextColor,
          fontWeight: styles.stoplightRedFontWeight
        };
        amberTextStyle = {
          fontSize: styles.stoplightAmberFontSize,
          color: styles.stoplightAmberTextColor,
          fontWeight: styles.stoplightAmberFontWeight
        };
        greenTextStyle = {
          fontSize: styles.stoplightGreenFontSize,
          color: styles.stoplightGreenTextColor,
          fontWeight: styles.stoplightGreenFontWeight
        };
      } catch (e) {
        console.error('Error parsing stoplight styles:', e);
      }
    }
    
    // Only show text labels if enabled
    if (!labelsEnabled) {
      redText = '';
      amberText = '';
      greenText = '';
    }
    
    // Update UI
    updateStoplightDisplay(widget, state.activeLight);
    updateStoplightLabels(widget, redText, amberText, greenText, redTextStyle, amberTextStyle, greenTextStyle);
    
    // Attach click handlers (only in normal mode, not edit mode)
    if (!isEditMode) {
      const lights = widget.querySelectorAll('.stoplight-light');
      lights.forEach(light => {
        // Remove existing listeners by cloning
        const newLight = light.cloneNode(true);
        light.parentNode.replaceChild(newLight, light);
        
        newLight.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleStoplight(fullWidgetId, newLight.dataset.color, widget);
        });
      });
    }
  });
}

// Update stoplight display (which light is on)
function updateStoplightDisplay(widget, activeLight) {
  const lights = widget.querySelectorAll('.stoplight-light');
  lights.forEach(light => {
    const color = light.dataset.color;
    if (color === activeLight) {
      light.classList.add('active');
    } else {
      light.classList.remove('active');
    }
  });
}

// Update stoplight text labels
function updateStoplightLabels(widget, redText, amberText, greenText, redTextStyle, amberTextStyle, greenTextStyle) {
  const container = widget.querySelector('.stoplight-container');
  const labelsContainer = widget.querySelector('.stoplight-labels');
  const redLabel = widget.querySelector('.red-label');
  const amberLabel = widget.querySelector('.amber-label');
  const greenLabel = widget.querySelector('.green-label');
  
  // Check if any labels have text
  const hasLabels = (redText && redText.trim()) || (amberText && amberText.trim()) || (greenText && greenText.trim());
  
  // Update container class for centering
  if (container) {
    if (hasLabels) {
      container.classList.add('has-labels');
    } else {
      container.classList.remove('has-labels');
    }
  }
  
  // Show/hide labels container
  if (labelsContainer) {
    if (hasLabels) {
      labelsContainer.style.display = 'flex';
    } else {
      labelsContainer.style.display = 'none';
    }
  }
  
  if (redLabel) {
    redLabel.textContent = redText || '';
    if (redTextStyle.fontSize) redLabel.style.fontSize = redTextStyle.fontSize + 'px';
    if (redTextStyle.color) redLabel.style.color = redTextStyle.color;
    if (redTextStyle.fontWeight) redLabel.style.fontWeight = redTextStyle.fontWeight;
  }
  
  if (amberLabel) {
    amberLabel.textContent = amberText || '';
    if (amberTextStyle.fontSize) amberLabel.style.fontSize = amberTextStyle.fontSize + 'px';
    if (amberTextStyle.color) amberLabel.style.color = amberTextStyle.color;
    if (amberTextStyle.fontWeight) amberLabel.style.fontWeight = amberTextStyle.fontWeight;
  }
  
  if (greenLabel) {
    greenLabel.textContent = greenText || '';
    if (greenTextStyle.fontSize) greenLabel.style.fontSize = greenTextStyle.fontSize + 'px';
    if (greenTextStyle.color) greenLabel.style.color = greenTextStyle.color;
    if (greenTextStyle.fontWeight) greenLabel.style.fontWeight = greenTextStyle.fontWeight;
  }
}

// Toggle stoplight (click handler)
function toggleStoplight(widgetId, clickedColor, widget) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  const state = stoplightStates.get(widgetId);
  if (!state) return;
  
  // If clicking the same light that's already on, turn it off
  if (state.activeLight === clickedColor) {
    state.activeLight = null;
  } else {
    // Otherwise, turn on the clicked light (turns off the previous one automatically)
    state.activeLight = clickedColor;
  }
  
  // Update display
  updateStoplightDisplay(widget, state.activeLight);
  
  // Save state
  saveStoplightState(widgetId);
}

// Save stoplight state to localStorage
function saveStoplightState(widgetId) {
  const state = stoplightStates.get(widgetId);
  if (!state) return;
  
  const stateKey = `dakboard-stoplight-${widgetId}`;
  localStorage.setItem(stateKey, JSON.stringify({ activeLight: state.activeLight }));
}

// Trigger confetti animation
function triggerConfetti() {
  // Remove existing confetti container if any
  const existing = document.querySelector('.confetti-container');
  if (existing) {
    existing.remove();
  }
  
  // Create confetti container
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  // Create confetti particles continuously for 5 seconds
  const duration = 5000; // 5 seconds
  const particleInterval = 50; // Create new particles every 50ms
  const particlesPerBatch = 10;
  
  let elapsed = 0;
  const createBatch = () => {
    for (let i = 0; i < particlesPerBatch; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-20px'; // Start above viewport
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's'; // 2-4 seconds to fall
      confetti.style.animationDelay = '0s'; // Start immediately
      // Add random rotation for more dynamic effect
      const rotation = Math.random() * 360;
      confetti.style.transform = `rotate(${rotation}deg)`;
      container.appendChild(confetti);
    }
    
    elapsed += particleInterval;
    if (elapsed < duration) {
      setTimeout(createBatch, particleInterval);
    }
  };
  
  // Start creating particles immediately
  createBatch();
  
  // Remove container after animation completes
  setTimeout(() => {
    container.remove();
  }, duration + 4000); // Add 4 seconds for particles to finish falling
}

// Roll dice with animation
function rollDice(diceElement, diceFaces) {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  // Add rolling animation class
  diceElement.classList.add('rolling');
  
  // Get 3D cube element
  const cube = diceElement.querySelector('.dice-3d-cube');
  if (!cube) return;
  
  // Generate random number of rolls (6-20) for animation effect
  const numRolls = Math.floor(Math.random() * 15) + 6;
  let currentRoll = 0;
  
  // Animate through random dice faces with 3D rotations
  const rollInterval = setInterval(() => {
    // Pick a random dice face
    const randomFace = diceFaces[Math.floor(Math.random() * diceFaces.length)];
    diceElement.innerHTML = randomFace.html;
    
    // Update cube reference after innerHTML change
    const newCube = diceElement.querySelector('.dice-3d-cube');
    if (newCube) {
      // Add random 3D rotation for realistic effect
      const rotateX = Math.random() * 360;
      const rotateY = Math.random() * 360;
      const rotateZ = Math.random() * 360;
      newCube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    }
    
    currentRoll++;
    
    if (currentRoll >= numRolls) {
      clearInterval(rollInterval);
      
      // Final random number (1-6)
      const finalNumber = Math.floor(Math.random() * 6) + 1;
      const finalFace = diceFaces.find(f => f.number === finalNumber) || diceFaces[0];
      diceElement.innerHTML = finalFace.html;
      
      // Remove rolling animation and restore default 3D rotation
      diceElement.classList.remove('rolling');
      const finalCube = diceElement.querySelector('.dice-3d-cube');
      if (finalCube) {
        // Restore default 3D rotation to show it's 3D (same as initial state)
        finalCube.style.transform = 'rotateX(-15deg) rotateY(15deg)';
      }
      
      // Add a brief highlight effect
      diceElement.classList.add('highlight');
      setTimeout(() => {
        diceElement.classList.remove('highlight');
      }, 500);
    }
  }, 80); // Change face every 80ms for smooth animation
}

// Thermostat state
let currentThermostat = 1;

// Calculate relative luminance of a color (for contrast calculation)
function getLuminance(r, g, b) {
  // Convert RGB to relative luminance using WCAG formula
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Determine if a color is light or dark based on luminance
function isLightColor(r, g, b) {
  const luminance = getLuminance(r, g, b);
  // Threshold of 0.5 - above is light, below is dark
  return luminance > 0.5;
}

// Update widget control and text styles based on widget background color (generic for all widgets)
function updateWidgetDynamicStyles(widget) {
  if (!widget) return;
  
  // Get computed background color from the widget
  const computedStyle = window.getComputedStyle(widget);
  let bgColor = computedStyle.backgroundColor;
  
  // If background is transparent or rgba(0,0,0,0), try to get from background-image or use fallback
  if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
    // Check if there's a background image (we can't extract color from it, so use a neutral approach)
    const bgImage = computedStyle.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      // For images/gradients, assume dark background (use light text)
      bgColor = 'rgb(42, 42, 42)';
    } else {
      // Try to get from parent or use default
      bgColor = computedStyle.backgroundColor || 'rgb(42, 42, 42)';
    }
  }
  
  // Extract RGB values from rgba/rgb string
  let rgbMatch = bgColor.match(/\d+/g);
  if (!rgbMatch || rgbMatch.length < 3) {
    // Fallback to default if parsing fails
    bgColor = 'rgb(42, 42, 42)';
    rgbMatch = [42, 42, 42];
  }
  
  const r = parseInt(rgbMatch[0]);
  const g = parseInt(rgbMatch[1]);
  const b = parseInt(rgbMatch[2]);
  
  // Determine if background is light or dark
  const isLight = isLightColor(r, g, b);
  
  // Set text colors based on background brightness
  const primaryTextColor = isLight ? '#1a1a1a' : '#ffffff'; // Dark text for light bg, white for dark bg
  const secondaryTextColor = isLight ? '#4a4a4a' : '#aaaaaa'; // Darker gray for light bg, lighter gray for dark bg
  
  // Calculate darker shade for borders (reduce brightness by 25-30%)
  const darkenFactor = 0.25;
  const borderR = Math.max(0, Math.floor(r * (1 - darkenFactor)));
  const borderG = Math.max(0, Math.floor(g * (1 - darkenFactor)));
  const borderB = Math.max(0, Math.floor(b * (1 - darkenFactor)));
  
  // Calculate even darker for hover states
  const hoverDarkenFactor = 0.15; // Additional darkening on top of border
  const hoverR = Math.max(0, Math.floor(borderR * (1 - hoverDarkenFactor)));
  const hoverG = Math.max(0, Math.floor(borderG * (1 - hoverDarkenFactor)));
  const hoverB = Math.max(0, Math.floor(borderB * (1 - hoverDarkenFactor)));
  
  // Set CSS custom properties on the widget
  widget.style.setProperty('--widget-bg-overlay', isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)');
  widget.style.setProperty('--widget-border-color', `rgb(${borderR}, ${borderG}, ${borderB})`);
  widget.style.setProperty('--widget-hover-border', `rgb(${hoverR}, ${hoverG}, ${hoverB})`);
  widget.style.setProperty('--widget-hover-bg', isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)');
  widget.style.setProperty('--widget-text-primary', primaryTextColor);
  widget.style.setProperty('--widget-text-secondary', secondaryTextColor);
}

// Update thermostat control styles based on widget background color (kept for backward compatibility)
function updateThermostatControlStyles(widget) {
  if (!widget) return;
  
  // Get computed background color from the widget
  const computedStyle = window.getComputedStyle(widget);
  let bgColor = computedStyle.backgroundColor;
  
  // If background is transparent or rgba(0,0,0,0), try to get from background-image or use fallback
  if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
    // Check if there's a background image (we can't extract color from it, so use a neutral approach)
    const bgImage = computedStyle.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      // For images/gradients, assume dark background (use light text)
      bgColor = 'rgb(42, 42, 42)';
    } else {
      // Try to get from parent or use default
      bgColor = computedStyle.backgroundColor || 'rgb(42, 42, 42)';
    }
  }
  
  // Extract RGB values from rgba/rgb string
  let rgbMatch = bgColor.match(/\d+/g);
  if (!rgbMatch || rgbMatch.length < 3) {
    // Fallback to default if parsing fails
    bgColor = 'rgb(42, 42, 42)';
    rgbMatch = [42, 42, 42];
  }
  
  const r = parseInt(rgbMatch[0]);
  const g = parseInt(rgbMatch[1]);
  const b = parseInt(rgbMatch[2]);
  
  // Determine if background is light or dark
  const isLight = isLightColor(r, g, b);
  
  // Set text colors based on background brightness
  const primaryTextColor = isLight ? '#1a1a1a' : '#ffffff'; // Dark text for light bg, white for dark bg
  const secondaryTextColor = isLight ? '#4a4a4a' : '#aaaaaa'; // Darker gray for light bg, lighter gray for dark bg
  
  // Calculate darker shade for borders (reduce brightness by 25-30%)
  const darkenFactor = 0.25;
  const borderR = Math.max(0, Math.floor(r * (1 - darkenFactor)));
  const borderG = Math.max(0, Math.floor(g * (1 - darkenFactor)));
  const borderB = Math.max(0, Math.floor(b * (1 - darkenFactor)));
  
  // Calculate even darker for hover states
  const hoverDarkenFactor = 0.15; // Additional darkening on top of border
  const hoverR = Math.max(0, Math.floor(borderR * (1 - hoverDarkenFactor)));
  const hoverG = Math.max(0, Math.floor(borderG * (1 - hoverDarkenFactor)));
  const hoverB = Math.max(0, Math.floor(borderB * (1 - hoverDarkenFactor)));
  
  // Call the generic function and also set thermostat-specific variables for backward compatibility
  updateWidgetDynamicStyles(widget);
  
  // Set thermostat-specific CSS variables (aliases to widget variables for backward compatibility)
  widget.style.setProperty('--thermostat-bg-overlay', widget.style.getPropertyValue('--widget-bg-overlay'));
  widget.style.setProperty('--thermostat-border-color', widget.style.getPropertyValue('--widget-border-color'));
  widget.style.setProperty('--thermostat-hover-border', widget.style.getPropertyValue('--widget-hover-border'));
  widget.style.setProperty('--thermostat-hover-bg', widget.style.getPropertyValue('--widget-hover-bg'));
  widget.style.setProperty('--thermostat-text-primary', widget.style.getPropertyValue('--widget-text-primary'));
  widget.style.setProperty('--thermostat-text-secondary', widget.style.getPropertyValue('--widget-text-secondary'));
}

// Load and initialize agenda widgets
function loadAgenda() {
  // Get all agenda widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('agenda-widget', currentPageIndex);
  
  if (instances.length === 0) return;
  
  // Initialize midnight check if not already running
  if (!agendaMidnightCheckInterval) {
    initializeAgendaMidnightCheck();
  }
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    
    let container = widget.querySelector('.agenda-content');
    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.className = 'agenda-content';
      widget.appendChild(container);
    }
    
    const fullWidgetId = instance.fullId; // Use fullId, not id
    
    // Initialize date to today if not set
    if (!agendaDates.has(fullWidgetId)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      agendaDates.set(fullWidgetId, today);
    }
    
    // Set up navigation buttons first (so date is displayed)
    setupAgendaNavigation(fullWidgetId, container);
    
    // Render the agenda (this will reload styles and apply them)
    renderAgenda(fullWidgetId, container);
  });
}

// Render agenda for a specific widget instance
function renderAgenda(widgetId, container) {
  const date = agendaDates.get(widgetId);
  if (!date) return;
  
  // Get events for this date (reuse calendarEvents array)
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayEvents = calendarEvents.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end || event.start);
    
    // For all-day events, check if the day falls within the event's date range (ignoring time)
    if (event.allDay) {
      const parseDateString = (dateStr) => {
        const datePart = dateStr.split('T')[0];
        const parts = datePart.split('-');
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10) - 1,
          day: parseInt(parts[2], 10)
        };
      };
      
      const eventStartParts = parseDateString(event.start);
      const eventEndParts = parseDateString(event.end || event.start);
      
      const eventEndDateObj = new Date(eventEndParts.year, eventEndParts.month, eventEndParts.day);
      eventEndDateObj.setDate(eventEndDateObj.getDate() - 1);
      
      const currentYear = date.getFullYear();
      const currentMonth = date.getMonth();
      const currentDay = date.getDate();
      const currentDateObj = new Date(currentYear, currentMonth, currentDay);
      
      const eventStartDateObj = new Date(eventStartParts.year, eventStartParts.month, eventStartParts.day);
      
      return (currentDateObj >= eventStartDateObj && currentDateObj <= eventEndDateObj);
    } else {
      return (eventStart <= dayEnd && eventEnd >= dayStart);
    }
  });
  
  // Sort events: all-day events first, then by start time
  const sortedEvents = [...dayEvents].sort((a, b) => {
    // All-day events come first
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    // For both all-day or both timed, sort by start time
    return new Date(a.start) - new Date(b.start);
  });
  
  // Build agenda HTML (date header is now in nav, not here)
  let agendaHTML = '';
  
  if (sortedEvents.length === 0) {
    agendaHTML += '<div class="agenda-empty">No events scheduled for this day.</div>';
  } else {
    // Get widget styles for card styling using the widgetId parameter (correct widget ID)
    // Use the widgetId parameter directly instead of trying to find it from class list
    let cardStyles = {
      background: '#353535',
      border: '#404040',
      borderRadius: 12,
      borderWidth: 1,
      shadow: true,
      hoverBorder: '#4a90e2'
    };
    
    if (widgetId) {
      const storageKey = `dakboard-widget-styles-${widgetId}`;
      const savedStyles = localStorage.getItem(storageKey);
      if (savedStyles) {
        try {
          const styles = JSON.parse(savedStyles);
          // Only override defaults if values exist in saved styles
          if (styles.agendaCardBackground) cardStyles.background = styles.agendaCardBackground;
          if (styles.agendaCardBorder) cardStyles.border = styles.agendaCardBorder;
          if (styles.agendaCardBorderRadius !== undefined) cardStyles.borderRadius = styles.agendaCardBorderRadius;
          if (styles.agendaCardBorderWidth !== undefined) cardStyles.borderWidth = styles.agendaCardBorderWidth;
          if (styles.agendaCardShadow !== undefined) cardStyles.shadow = styles.agendaCardShadow;
          if (styles.agendaCardHoverBorder) cardStyles.hoverBorder = styles.agendaCardHoverBorder;
        } catch (e) {
          console.error(`Error parsing widget styles for agenda cards (widgetId: ${widgetId}):`, e);
        }
      }
    }
    
    // Only use currentStyles for live preview when modal is open and editing this specific widget
    // After Apply, modal closes and we always use saved styles from localStorage
    // This ensures each widget instance loads its own styles correctly (same pattern as scoreboard)
    const stylingModal = document.getElementById('styling-modal');
    const isModalOpen = stylingModal && stylingModal.classList.contains('active');
    const isThisWidgetBeingEdited = isModalOpen && typeof currentWidgetId !== 'undefined' && currentWidgetId === widgetId && typeof currentStyles !== 'undefined';
    
    // Use currentStyles for live preview (when editing), otherwise use saved styles
    const cardBg = (isThisWidgetBeingEdited && currentStyles?.agendaCardBackground) 
      ? currentStyles.agendaCardBackground 
      : cardStyles.background;
    const cardBorder = (isThisWidgetBeingEdited && currentStyles?.agendaCardBorder) 
      ? currentStyles.agendaCardBorder 
      : cardStyles.border;
    const cardBorderRadius = (isThisWidgetBeingEdited && currentStyles?.agendaCardBorderRadius !== undefined) 
      ? currentStyles.agendaCardBorderRadius 
      : cardStyles.borderRadius;
    const cardBorderWidth = (isThisWidgetBeingEdited && currentStyles?.agendaCardBorderWidth !== undefined) 
      ? currentStyles.agendaCardBorderWidth 
      : cardStyles.borderWidth;
    const cardShadow = (isThisWidgetBeingEdited && currentStyles?.agendaCardShadow !== undefined) 
      ? currentStyles.agendaCardShadow 
      : cardStyles.shadow;
    const cardHoverBorder = (isThisWidgetBeingEdited && currentStyles?.agendaCardHoverBorder) 
      ? currentStyles.agendaCardHoverBorder 
      : cardStyles.hoverBorder;
    
    const shadowStyle = cardShadow ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none';
    
    // Calculate dynamic text color based on card background
    // Helper function to parse hex color to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    // Parse card background color
    const cardBgRgb = hexToRgb(cardBg);
    let textColor = '#ffffff'; // Default to white text
    let secondaryTextColor = '#aaaaaa'; // Default to gray for secondary text
    
    if (cardBgRgb) {
      // Use existing isLightColor function to determine text color
      const isLight = isLightColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
      textColor = isLight ? '#1a1a1a' : '#ffffff'; // Dark text for light bg, white for dark bg
      secondaryTextColor = isLight ? '#4a4a4a' : '#aaaaaa'; // Darker gray for light bg, lighter gray for dark bg
    }
    
    sortedEvents.forEach((event, index) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // Format time
      let timeStr = '';
      if (event.allDay) {
        timeStr = 'All Day';
      } else {
        const startTime = eventStart.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const endTime = eventEnd.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        timeStr = `${startTime} - ${endTime}`;
      }
      
      const eventStyle = `background: ${cardBg}; border: ${cardBorderWidth}px solid ${cardBorder}; border-radius: ${cardBorderRadius}px; box-shadow: ${shadowStyle}; --agenda-card-hover-border: ${cardHoverBorder};`;
      
      // Create a unique identifier: use index in sortedEvents array (which is specific to this widget and date)
      // This ensures each event card has a unique identifier even if UID is empty
      const uniqueEventId = `${widgetId}-${date.getTime()}-${index}`;
      
      agendaHTML += `
        <div class="agenda-event" data-event-id="${event.uid || ''}" data-event-index="${index}" data-unique-id="${uniqueEventId}" style="${eventStyle}">
          <div class="agenda-event-time" style="color: ${secondaryTextColor};">${timeStr}</div>
          <div class="agenda-event-content">
            <div class="agenda-event-title" style="color: ${textColor};">${event.title || 'Untitled Event'}</div>
            ${event.location ? `<div class="agenda-event-location" style="color: ${secondaryTextColor};">📍 ${event.location}</div>` : ''}
          </div>
        </div>
      `;
    });
  }
  
  container.innerHTML = agendaHTML;
  
  // Store sortedEvents in a way accessible to click handlers
  // Use a Map keyed by widget ID and date to store events for this widget/date combination
  if (!window.agendaEventsCache) {
    window.agendaEventsCache = new Map();
  }
  const cacheKey = `${widgetId}-${date.getTime()}`;
  window.agendaEventsCache.set(cacheKey, sortedEvents);
  
  // Add click handlers to events to show details
  container.querySelectorAll('.agenda-event').forEach(eventEl => {
    eventEl.style.cursor = 'pointer';
    eventEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isEditMode) {
        const eventIndex = parseInt(eventEl.dataset.eventIndex);
        const widgetDate = agendaDates.get(widgetId);
        
        // Get events from cache using widget ID and date
        const cacheKey = `${widgetId}-${widgetDate.getTime()}`;
        const cachedEvents = window.agendaEventsCache ? window.agendaEventsCache.get(cacheKey) : null;
        
        if (cachedEvents && eventIndex !== undefined && eventIndex >= 0 && eventIndex < cachedEvents.length) {
          const event = cachedEvents[eventIndex];
          console.log(`[Event Click] Found event by index ${eventIndex}: ${event.title}, Date: ${new Date(event.start).toISOString()}`);
          showEventDetails(event);
        } else {
          // Fallback: re-filter events for this date and use index
          const dayStart = new Date(widgetDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(widgetDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayEvents = calendarEvents.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end || event.start);
            
            if (event.allDay) {
              const parseDateString = (dateStr) => {
                const datePart = dateStr.split('T')[0];
                const parts = datePart.split('-');
                return {
                  year: parseInt(parts[0], 10),
                  month: parseInt(parts[1], 10) - 1,
                  day: parseInt(parts[2], 10)
                };
              };
              
              const eventStartParts = parseDateString(event.start);
              const eventEndParts = parseDateString(event.end || event.start);
              const eventEndDateObj = new Date(eventEndParts.year, eventEndParts.month, eventEndParts.day);
              eventEndDateObj.setDate(eventEndDateObj.getDate() - 1);
              
              const currentYear = widgetDate.getFullYear();
              const currentMonth = widgetDate.getMonth();
              const currentDay = widgetDate.getDate();
              const currentDateObj = new Date(currentYear, currentMonth, currentDay);
              const eventStartDateObj = new Date(eventStartParts.year, eventStartParts.month, eventStartParts.day);
              
              return (currentDateObj >= eventStartDateObj && currentDateObj <= eventEndDateObj);
            } else {
              return (eventStart <= dayEnd && eventEnd >= dayStart);
            }
          });
          
          const sortedDayEvents = [...dayEvents].sort((a, b) => {
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            return new Date(a.start) - new Date(b.start);
          });
          
          if (eventIndex !== undefined && eventIndex >= 0 && eventIndex < sortedDayEvents.length) {
            const event = sortedDayEvents[eventIndex];
            console.log(`[Event Click] Found event by index (fallback): ${event.title}, Date: ${new Date(event.start).toISOString()}`);
            showEventDetails(event);
          } else {
            console.error(`[Event Click] ERROR - Event not found! Index: ${eventIndex}, Widget Date: ${widgetDate ? widgetDate.toISOString() : 'undefined'}, Cached events: ${cachedEvents ? cachedEvents.length : 'null'}, Sorted events: ${sortedDayEvents.length}`);
          }
        }
      }
    });
  });
}

// Set up navigation buttons for agenda widget
function setupAgendaNavigation(widgetId, container) {
  const widget = container.closest('.agenda-widget');
  if (!widget) return;
  
  const date = agendaDates.get(widgetId);
  if (!date) return;
  
  // Format date for display
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Find or create navigation container (place it below header, before content)
  let navContainer = widget.querySelector('.agenda-nav');
  if (!navContainer) {
    navContainer = document.createElement('div');
    navContainer.className = 'agenda-nav';
    // Insert after widget-header if it exists, otherwise before content
    const widgetHeader = widget.querySelector('.widget-header');
    if (widgetHeader && widgetHeader.nextSibling) {
      widget.insertBefore(navContainer, widgetHeader.nextSibling);
    } else if (widgetHeader) {
      widgetHeader.parentNode.insertBefore(navContainer, widgetHeader.nextSibling);
    } else {
      widget.insertBefore(navContainer, container);
    }
  }
  
  // Clear existing content
  navContainer.innerHTML = '';
  
  // Create previous day button (modern arrow icon)
  const prevBtn = document.createElement('button');
  prevBtn.className = 'agenda-nav-btn agenda-prev-day';
  prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  prevBtn.title = 'Previous Day';
  
  // Create date display
  const dateDisplay = document.createElement('div');
  dateDisplay.className = 'agenda-date-display';
  dateDisplay.textContent = dateStr;
  
  // Create next day button (modern arrow icon)
  const nextBtn = document.createElement('button');
  nextBtn.className = 'agenda-nav-btn agenda-next-day';
  nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  nextBtn.title = 'Next Day';
  
  // Add event listeners
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isEditMode) {
      const currentDate = agendaDates.get(widgetId);
      if (currentDate) {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        agendaDates.set(widgetId, newDate);
        // Update date display
        const updatedDateStr = newDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        dateDisplay.textContent = updatedDateStr;
        renderAgenda(widgetId, container);
      }
    }
  });
  
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isEditMode) {
      const currentDate = agendaDates.get(widgetId);
      if (currentDate) {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        agendaDates.set(widgetId, newDate);
        // Update date display
        const updatedDateStr = newDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        dateDisplay.textContent = updatedDateStr;
        renderAgenda(widgetId, container);
      }
    }
  });
  
  // Append buttons and date display in order
  navContainer.appendChild(prevBtn);
  navContainer.appendChild(dateDisplay);
  navContainer.appendChild(nextBtn);
}

// Load and initialize tasks widgets
async function loadTasks() {
  // Get all tasks widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('tasks-widget', currentPageIndex);
  
  if (instances.length === 0) return;
  
  // Ensure todoLists is populated (reuse from todo widget discovery)
  if (todoLists.length === 0) {
    try {
      const allStates = await fetchAllHAStates();
      if (allStates) {
        todoLists = allStates
          .filter(e => e.entity_id.startsWith('todo.'))
          .map(e => ({
            entityId: e.entity_id,
            name: e.attributes?.friendly_name || 
                  e.attributes?.name || 
                  e.entity_id.replace(/^todo\./, '').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()),
            entity: e
          }));
      }
    } catch (error) {
      console.error('Error discovering todo lists for tasks:', error);
    }
  }
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    
    let container = widget.querySelector('.tasks-content');
    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.className = 'tasks-content';
      widget.appendChild(container);
    }
    
    const fullWidgetId = instance.fullId;
    
    // Render the tasks (this will check for selected list and load items)
    renderTasks(fullWidgetId, container);
  });
}

// Render tasks for a specific widget instance
async function renderTasks(widgetId, container) {
  // Get selected list for this widget instance from styles
  const stylesKey = `dakboard-widget-styles-${widgetId}`;
  const savedStyles = localStorage.getItem(stylesKey);
  let selectedList = null;
  if (savedStyles) {
    try {
      const styles = JSON.parse(savedStyles);
      selectedList = styles.tasksSelectedList || null;
    } catch (e) {
      console.error('Error parsing saved styles:', e);
    }
  }
  
  if (!selectedList || selectedList === 'none' || !todoLists || todoLists.length === 0) {
    // Show empty state - no list selected
    container.innerHTML = '<div class="tasks-empty">No tasks - please select a list in Advanced settings</div>';
    return;
  }
  
  // Find the selected list entity
  const listEntity = todoLists.find(list => list.entityId === selectedList);
  if (!listEntity) {
    container.innerHTML = '<div class="tasks-empty">Selected list not found</div>';
    return;
  }
  
  // Load items for the selected list
  try {
    const response = await fetch('/api/ha-todo-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'list_items',
        entity_id: selectedList
      })
    });
    
    let items = [];
    if (response.ok) {
      const data = await response.json();
      items = data.items || [];
    } else {
      container.innerHTML = '<div class="tasks-empty">Error loading tasks</div>';
      return;
    }
    
    // Separate completed and incomplete items
    const incomplete = items.filter(item => {
      return !item.status || item.status === 'needs_action' || item.status === 'incomplete';
    });
    const completed = items.filter(item => {
      return item.status === 'completed';
    });
    
    // Clear container (but preserve any existing add-task-card)
    const existingAddCard = container.querySelector('.task-card-add-new');
    container.innerHTML = '';
    if (existingAddCard) {
      container.appendChild(existingAddCard);
    }
    
    // Load styles for this widget
    const stylesKey = `dakboard-widget-styles-${widgetId}`;
    const savedStyles = localStorage.getItem(stylesKey);
    let currentStyles = {};
    if (savedStyles) {
      try {
        currentStyles = JSON.parse(savedStyles);
      } catch (e) {
        console.error('Error parsing saved styles:', e);
      }
    }
    
    // Apply card styles
    const cardStyles = {
      background: currentStyles.tasksCardBackground || '#353535',
      border: currentStyles.tasksCardBorder || '#404040',
      borderRadius: currentStyles.tasksCardBorderRadius !== undefined ? currentStyles.tasksCardBorderRadius : 12,
      borderWidth: currentStyles.tasksCardBorderWidth !== undefined ? currentStyles.tasksCardBorderWidth : 1,
      shadow: currentStyles.tasksCardShadow !== false,
      hoverBorder: currentStyles.tasksCardHoverBorder || '#4a90e2'
    };
    
    // Show incomplete tasks first
    if (incomplete.length === 0 && completed.length === 0) {
      container.innerHTML = '<div class="tasks-empty">No tasks</div>';
      // Add the add button even when empty
      createAddTaskButton(container, widgetId, selectedList, cardStyles, true);
      return;
    }
    
    incomplete.forEach(item => {
      const card = createTaskCard(item, selectedList, widgetId, false, cardStyles);
      container.appendChild(card);
    });
    
    // Show completed tasks at bottom (greyed out)
    completed.forEach(item => {
      const card = createTaskCard(item, selectedList, widgetId, true, cardStyles);
      container.appendChild(card);
    });
    
    // Add the "+" button below all cards
    createAddTaskButton(container, widgetId, selectedList, cardStyles, false);
    
    // Exit selection mode if it was active (cards were re-rendered)
    container.classList.remove('selection-mode-active');
    
    // Set CSS variable for hover border color (only if not in selection mode)
    // This allows CSS to handle hover styling without inline style conflicts
    container.querySelectorAll('.task-card:not(.task-card-add-new)').forEach(card => {
      if (cardStyles.hoverBorder) {
        card.style.setProperty('--tasks-card-hover-border', cardStyles.hoverBorder);
      }
    });
    
  } catch (error) {
    console.error('Error rendering tasks:', error);
    container.innerHTML = '<div class="tasks-empty">Error loading tasks</div>';
  }
}

// Long press tracking (per widget instance)
const tasksLongPressTimers = new Map();
const tasksLongPressCards = new Map();
const tasksJustEnteredSelection = new Map(); // Track cards that just entered selection mode

// Create a task card element
function createTaskCard(item, entityId, widgetId, isCompleted, cardStyles) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskUid = item.uid;
  card.dataset.entityId = entityId;
  card.dataset.widgetId = widgetId;
  if (isCompleted) {
    card.classList.add('completed');
  }
  
  // Apply card styles
  card.style.backgroundColor = cardStyles.background;
  card.style.borderColor = cardStyles.border;
  card.style.borderWidth = `${cardStyles.borderWidth}px`;
  card.style.borderRadius = `${cardStyles.borderRadius}px`;
  card.style.borderStyle = 'solid';
  if (cardStyles.shadow) {
    card.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  }
  
  // Apply opacity for completed tasks (0.5 = 50%)
  if (isCompleted) {
    card.style.opacity = '0.5';
  }
  
  // Create wrapper for checkbox + content
  const wrapper = document.createElement('div');
  wrapper.className = 'task-card-wrapper';
  
  // Checkbox (hidden by default, shown in selection mode)
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.addEventListener('change', (e) => {
    e.stopPropagation();
    handleTaskCheckboxChange(card);
  });
  wrapper.appendChild(checkbox);
  
  // Task content
  const taskContent = document.createElement('div');
  taskContent.style.flex = '1';
  
  // Task name (wrap to multiple lines)
  const taskName = document.createElement('div');
  taskName.className = 'task-name';
  taskName.textContent = item.summary || 'Untitled';
  taskName.style.wordWrap = 'break-word';
  taskName.style.whiteSpace = 'normal';
  // Add strikethrough for completed tasks
  if (isCompleted) {
    taskName.style.textDecoration = 'line-through';
  }
  taskContent.appendChild(taskName);
  
  wrapper.appendChild(taskContent);
  card.appendChild(wrapper);
  
  // Long press handlers - use unique key per card
  const cardId = `${widgetId}-${item.uid}`;
  
  const handleLongPressStart = (e) => {
    // Prevent default to avoid text selection
    e.preventDefault();
    
    // Clear any existing timer for this card
    if (tasksLongPressTimers.has(cardId)) {
      clearTimeout(tasksLongPressTimers.get(cardId));
    }
    
    tasksLongPressCards.set(cardId, card);
    
    const timer = setTimeout(() => {
      enterTasksSelectionMode(card, widgetId, entityId);
      tasksLongPressTimers.delete(cardId);
      tasksLongPressCards.delete(cardId);
    }, 500); // 500ms long press
    
    tasksLongPressTimers.set(cardId, timer);
  };
  
  const handleLongPressEnd = (e) => {
    if (tasksLongPressCards.get(cardId) === card && tasksLongPressTimers.has(cardId)) {
      clearTimeout(tasksLongPressTimers.get(cardId));
      tasksLongPressTimers.delete(cardId);
      tasksLongPressCards.delete(cardId);
    }
  };
  
  // Only attach interaction handlers if not in edit mode (similar to stoplight widget)
  if (!isEditMode) {
    card.addEventListener('touchstart', handleLongPressStart, { passive: true });
    card.addEventListener('touchend', handleLongPressEnd);
    card.addEventListener('mousedown', handleLongPressStart);
    card.addEventListener('mouseup', handleLongPressEnd);
    card.addEventListener('mouseleave', handleLongPressEnd);
  }
  
  // Click handler (only in normal mode, not edit mode)
  if (!isEditMode) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.type === 'checkbox') {
        return; // Checkbox handles its own change
      }
      
      const container = card.closest('.tasks-content');
      const isSelectionMode = container && container.classList.contains('selection-mode-active');
      const cardId = `${widgetId}-${item.uid}`;
      
      // If we just entered selection mode from this card, ignore the click
      // (This prevents the click from toggling off the auto-selected card)
      if (tasksJustEnteredSelection.get(cardId) === card) {
        // Clear the flag after a delay
        setTimeout(() => {
          tasksJustEnteredSelection.delete(cardId);
        }, 200);
        return;
      }
      
      // If we just ended a long press and we're NOT in selection mode yet, don't treat as click
      // (This prevents the normal click action from firing right after long press)
      if (!isSelectionMode) {
        if (tasksLongPressCards.get(cardId) === card) {
          // Clear the reference after a delay
          setTimeout(() => {
            tasksLongPressCards.delete(cardId);
          }, 100);
          return;
        }
      }
      
      if (isSelectionMode) {
        // In selection mode, toggle selection
        checkbox.checked = !checkbox.checked;
        handleTaskCheckboxChange(card);
      } else {
        // Normal mode: toggle completion
        toggleTodoItem(entityId, item.uid, !isCompleted);
        setTimeout(() => {
          if (container) {
            renderTasks(widgetId, container);
          }
        }, 300);
      }
    });
  }
  
  return card;
}

// Enter selection mode for tasks
function enterTasksSelectionMode(initialCard, widgetId, entityId) {
  const container = initialCard.closest('.tasks-content');
  if (!container || container.classList.contains('selection-mode-active')) {
    return;
  }
  
  // Add selection mode class
  container.classList.add('selection-mode-active');
  
  // Create or show toolbar
  let toolbar = document.getElementById(`tasks-toolbar-${widgetId}`);
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = `tasks-toolbar-${widgetId}`;
    toolbar.className = 'tasks-selection-toolbar';
    toolbar.innerHTML = `
      <span class="tasks-selection-count" id="tasks-count-${widgetId}">0 selected</span>
      <button class="tasks-btn-delete" onclick="deleteSelectedTasks('${widgetId}')">Delete Selected</button>
      <button class="tasks-btn-cancel" onclick="exitTasksSelectionMode('${widgetId}')">Cancel</button>
    `;
    document.body.appendChild(toolbar);
  }
  toolbar.classList.add('active');
  
  // Auto-select the initial card that was long-pressed
  const checkbox = initialCard.querySelector('.task-checkbox');
  if (checkbox) {
    checkbox.checked = true;
    initialCard.classList.add('selected');
    
    // Mark this card as just entered selection mode to prevent click from toggling it off
    const cardId = `${widgetId}-${initialCard.dataset.taskUid}`;
    tasksJustEnteredSelection.set(cardId, initialCard);
    
    updateTasksSelectionCount(widgetId);
  }
}

// Handle checkbox change for task selection
function handleTaskCheckboxChange(card) {
  const checkbox = card.querySelector('.task-checkbox');
  if (!checkbox) return;
  
  const isSelected = checkbox.checked;
  
  if (isSelected) {
    card.classList.add('selected');
  } else {
    card.classList.remove('selected');
  }
  
  const widgetId = card.dataset.widgetId;
  if (widgetId) {
    updateTasksSelectionCount(widgetId);
  }
}

// Update selection count in toolbar
function updateTasksSelectionCount(widgetId) {
  const container = document.querySelector(`[data-widget-id="${widgetId}"]`)?.closest('.tasks-content');
  if (!container) {
    // Try finding by widget class
    const widget = document.querySelector(`.${widgetId}`);
    if (widget) {
      container = widget.querySelector('.tasks-content');
    }
  }
  
  if (!container) return;
  
  const count = container.querySelectorAll('.task-card.selected').length;
  const countEl = document.getElementById(`tasks-count-${widgetId}`);
  if (countEl) {
    countEl.textContent = `${count} selected`;
  }
}

// Delete selected tasks
async function deleteSelectedTasks(widgetId) {
  // Find container by widget
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const container = widget.querySelector('.tasks-content');
  if (!container) return;
  
  const selectedCards = container.querySelectorAll('.task-card.selected');
  if (selectedCards.length === 0) {
    alert('No tasks selected');
    return;
  }
  
  const confirmed = confirm(`Delete ${selectedCards.length} task${selectedCards.length > 1 ? 's' : ''}?`);
  if (!confirmed) return;
  
  // Collect all task UIDs and entity IDs
  const deletePromises = [];
  selectedCards.forEach(card => {
    const uid = card.dataset.taskUid;
    const entityId = card.dataset.entityId;
    if (uid && entityId) {
      deletePromises.push(deleteTaskItem(entityId, uid, card));
    }
  });
  
  // Delete all tasks
  await Promise.all(deletePromises);
  
  // Exit selection mode
  exitTasksSelectionMode(widgetId);
  
  // Reload tasks
  setTimeout(() => {
    if (container) {
      renderTasks(widgetId, container);
    }
  }, 300);
}

// Delete a single task item
async function deleteTaskItem(entityId, itemUid, cardElement) {
  try {
    const response = await fetch('/api/ha-todo-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete',
        entity_id: entityId,
        uid: itemUid
      })
    });
    
    if (!response.ok) {
      console.error('Failed to delete task:', response.status);
      return;
    }
    
    // Animate card removal
    if (cardElement) {
      cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
      cardElement.style.opacity = '0';
      cardElement.style.transform = 'translateX(-100px)';
    }
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

// Exit selection mode
function exitTasksSelectionMode(widgetId) {
  // Find container by widget
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const container = widget.querySelector('.tasks-content');
  if (container) {
    container.classList.remove('selection-mode-active');
    
    // Uncheck all checkboxes and remove selected class
    const cards = container.querySelectorAll('.task-card');
    cards.forEach(card => {
      card.classList.remove('selected');
      const checkbox = card.querySelector('.task-checkbox');
      if (checkbox) {
        checkbox.checked = false;
      }
    });
  }
  
  // Hide toolbar
  const toolbar = document.getElementById(`tasks-toolbar-${widgetId}`);
  if (toolbar) {
    toolbar.classList.remove('active');
  }
}

// Create add task button at bottom of task list
function createAddTaskButton(container, widgetId, entityId, cardStyles, isEmptyState) {
  // Remove existing button if present
  const existingBtn = container.querySelector('.tasks-add-btn-bottom');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Don't show if in edit mode or if add card is already visible
  if (isEditMode || container.querySelector('.task-card-add-new')) {
    return;
  }
  
  const addBtn = document.createElement('button');
  addBtn.className = 'tasks-add-btn-bottom';
  addBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  addBtn.title = 'Add Task';
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showAddTaskInline(container, widgetId, entityId, cardStyles);
  });
  container.appendChild(addBtn);
}

// Show inline add task card
function showAddTaskInline(container, widgetId, entityId, cardStyles) {
  // Don't allow adding tasks in edit mode
  if (isEditMode) return;
  
  // Remove existing add card if present
  const existingAddCard = container.querySelector('.task-card-add-new');
  if (existingAddCard) {
    existingAddCard.remove();
  }
  
  // Hide the add button
  const addBtnBottom = container.querySelector('.tasks-add-btn-bottom');
  if (addBtnBottom) {
    addBtnBottom.style.display = 'none';
  }
  
  // Create add card
  const addCard = document.createElement('div');
  addCard.className = 'task-card task-card-add-new';
  
  // Apply card styles
  addCard.style.backgroundColor = cardStyles.background;
  addCard.style.borderColor = cardStyles.border;
  addCard.style.borderWidth = `${cardStyles.borderWidth}px`;
  addCard.style.borderRadius = `${cardStyles.borderRadius}px`;
  addCard.style.borderStyle = 'solid';
  if (cardStyles.shadow) {
    addCard.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  }
  
  // Create wrapper for content
  const wrapper = document.createElement('div');
  wrapper.className = 'task-card-wrapper';
  wrapper.style.width = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '12px';
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.style.display = 'flex';
  inputContainer.style.flexDirection = 'column';
  inputContainer.style.gap = '12px';
  inputContainer.style.width = '100%';
  
  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter task name...';
  input.className = 'task-add-input';
  input.style.width = '100%';
  input.style.padding = '12px';
  input.style.borderRadius = '6px';
  input.style.border = '2px solid #4a90e2';
  input.style.background = '#2a2a2a';
  input.style.color = '#e0e0e0';
  input.style.fontSize = '16px';
  input.style.fontWeight = '500';
  input.style.outline = 'none';
  
  // Create button group
  const buttonGroup = document.createElement('div');
  buttonGroup.style.display = 'flex';
  buttonGroup.style.gap = '8px';
  buttonGroup.style.justifyContent = 'flex-end';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'task-add-cancel-btn';
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.border = '1px solid #4a4a4a';
  cancelBtn.style.background = '#3a3a3a';
  cancelBtn.style.color = '#e0e0e0';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.fontSize = '14px';
  cancelBtn.style.fontWeight = '500';
  
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  addBtn.className = 'task-add-submit-btn';
  addBtn.style.padding = '8px 16px';
  addBtn.style.borderRadius = '6px';
  addBtn.style.border = 'none';
  addBtn.style.background = '#4a90e2';
  addBtn.style.color = '#fff';
  addBtn.style.cursor = 'pointer';
  addBtn.style.fontSize = '14px';
  addBtn.style.fontWeight = '600';
  
  buttonGroup.appendChild(cancelBtn);
  buttonGroup.appendChild(addBtn);
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(buttonGroup);
  
  wrapper.appendChild(inputContainer);
  addCard.appendChild(wrapper);
  
  // Insert at the end (before the add button if it exists)
  container.appendChild(addCard);
  
  // Auto-scroll to bottom to show the new card
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
  
  // Focus input
  setTimeout(() => input.focus(), 150);
  
  // Close handler
  const closeAddCard = () => {
    addCard.remove();
    // Show the add button again
    const addBtnBottom = container.querySelector('.tasks-add-btn-bottom');
    if (addBtnBottom) {
      addBtnBottom.style.display = 'flex';
    }
  };
  
  // Cancel button handler
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAddCard();
  });
  
  // Click outside handler (on document for better coverage)
  const handleOutsideClick = (e) => {
    if (!addCard.contains(e.target)) {
      closeAddCard();
      document.removeEventListener('click', handleOutsideClick);
    }
  };
  // Use a timeout to avoid immediate firing from the button click
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
  
  // Add task handler
  const handleAdd = async () => {
    const taskName = input.value.trim();
    if (!taskName) {
      input.focus();
      return;
    }
    
    // Remove outside click listener before adding
    document.removeEventListener('click', handleOutsideClick);
    
    try {
      await fetch('/api/ha-todo-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          entity_id: entityId,
          item: taskName
        })
      });
      
      closeAddCard();
      
      // Reload tasks after a short delay
      setTimeout(async () => {
        await renderTasks(widgetId, container);
        // Auto-scroll to bottom to show the "+" button again
        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        });
      }, 300);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task. Please try again.');
      // Re-add listener if there was an error
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 100);
    }
  };
  
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleAdd();
  });
  
  input.addEventListener('keypress', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      document.removeEventListener('click', handleOutsideClick);
      closeAddCard();
    }
  });
  
  // Prevent clicks inside the card from closing it
  addCard.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Show add task modal (legacy - keeping for now but not used)
function showAddTaskModal(widgetId, entityId, container) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'modal-overlay tasks-add-modal';
  modal.style.display = 'flex';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.zIndex = '10000';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '400px';
  
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.innerHTML = '<h2>Add Task</h2><button class="modal-close tasks-modal-close">&times;</button>';
  
  const modalBody = document.createElement('div');
  modalBody.style.padding = '20px';
  
  const inputGroup = document.createElement('div');
  inputGroup.style.marginBottom = '15px';
  
  const label = document.createElement('label');
  label.textContent = 'Task Name:';
  label.style.display = 'block';
  label.style.marginBottom = '8px';
  label.style.color = '#e0e0e0';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter task name...';
  input.style.width = '100%';
  input.style.padding = '10px';
  input.style.borderRadius = '4px';
  input.style.border = '1px solid #4a4a4a';
  input.style.background = '#2a2a2a';
  input.style.color = '#e0e0e0';
  input.style.fontSize = '14px';
  
  const buttonGroup = document.createElement('div');
  buttonGroup.style.display = 'flex';
  buttonGroup.style.gap = '10px';
  buttonGroup.style.justifyContent = 'flex-end';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'styling-btn-secondary';
  cancelBtn.style.padding = '10px 20px';
  
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  addBtn.className = 'styling-btn-primary';
  addBtn.style.padding = '10px 20px';
  
  inputGroup.appendChild(label);
  inputGroup.appendChild(input);
  
  buttonGroup.appendChild(cancelBtn);
  buttonGroup.appendChild(addBtn);
  
  modalBody.appendChild(inputGroup);
  modalBody.appendChild(buttonGroup);
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  
  // Focus input
  setTimeout(() => input.focus(), 100);
  
  // Close handlers
  const closeModal = () => {
    modal.remove();
  };
  
  modal.querySelector('.tasks-modal-close').addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Add task handler
  const handleAdd = async () => {
    const taskName = input.value.trim();
    if (!taskName) return;
    
    try {
      await fetch('/api/ha-todo-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          entity_id: entityId,
          item: taskName
        })
      });
      
      closeModal();
      
      // Reload tasks after a short delay
      setTimeout(() => {
        renderTasks(widgetId, container);
      }, 300);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task. Please try again.');
    }
  };
  
  addBtn.addEventListener('click', handleAdd);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  });
}

// Initialize midnight check for agenda widgets
function initializeAgendaMidnightCheck() {
  // Check every minute for midnight
  agendaMidnightCheckInterval = setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Check if we just passed midnight (between 00:00 and 00:01)
    if (hours === 0 && minutes === 0) {
      // Reset all agenda widgets to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      agendaDates.forEach((date, widgetId) => {
        agendaDates.set(widgetId, today);
        
        // Find and re-render the widget
        const widget = document.querySelector(`.${widgetId}`);
        if (widget) {
          const container = widget.querySelector('.agenda-content');
          if (container) {
            renderAgenda(widgetId, container);
          }
        }
      });
    }
  }, 60000); // Check every minute
}

// Load thermostat data
async function loadThermostat() {
  // Get all thermostat widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('thermostat-widget', currentPageIndex);
  const selectors = [];
  const displays = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const selector = widget.querySelector('#thermostat-selector');
    const display = widget.querySelector('#thermostat-display');
    if (selector) selectors.push(selector);
    if (display) displays.push(display);
  });
  
  if (selectors.length === 0 || displays.length === 0) return;
  
  // Use the first selector to get the value (they should all be in sync)
  const selector = selectors[0];
  const display = displays[0];
  
  // Get selected thermostat
  currentThermostat = parseInt(selector.value) || 1;
  const thermostatEntity = CONFIG[`HA_THERMOSTAT_${currentThermostat}`];
  
  if (!thermostatEntity) {
    const errorHtml = `
      <div class="thermostat-error">
        <p>Thermostat ${currentThermostat} not configured</p>
        <p style="font-size: 12px; color: #888;">Update CONFIG.HA_THERMOSTAT_${currentThermostat} in app.js</p>
      </div>
    `;
    // Update all displays
    displays.forEach(d => d.innerHTML = errorHtml);
    return;
  }
  
  try {
    const entity = await fetchHAEntity(thermostatEntity);
    if (!entity) {
      const errorHtml = '<div class="thermostat-error">Thermostat not found</div>';
      displays.forEach(d => d.innerHTML = errorHtml);
      return;
    }
    
    const state = entity.state;
    const attrs = entity.attributes || {};
    
    // Get temperature values
    const currentTemp = attrs.current_temperature || attrs.temperature || '--';
    const targetTemp = attrs.temperature || attrs.target_temp_high || attrs.target_temp_low || '--';
    const mode = attrs.hvac_modes && attrs.hvac_modes.length > 0 ? state : 'off';
    const fanMode = attrs.fan_mode || 'auto';
    const fanModes = attrs.fan_modes || ['auto', 'on'];
    
    // Determine if heating or cooling
    const isHeating = mode === 'heat' || (mode === 'auto' && currentTemp < targetTemp);
    const isCooling = mode === 'cool' || (mode === 'auto' && currentTemp > targetTemp);
    
    const displayHtml = `
      <div class="thermostat-main">
        <div class="thermostat-temp-display">
          <div class="thermostat-current-temp">${Math.round(currentTemp)}°</div>
          <div class="thermostat-target-temp">
            <span class="thermostat-target-label">Target:</span>
            <span class="thermostat-target-value" id="thermostat-target-value">${Math.round(targetTemp)}°</span>
          </div>
        </div>
        <div class="thermostat-controls">
          <div class="thermostat-mode">
            <label>Mode:</label>
            <select id="thermostat-mode-select" class="thermostat-control-select" ${isEditMode ? 'disabled' : ''}>
              ${(attrs.hvac_modes || ['off']).map(m => 
                `<option value="${m}" ${m === mode ? 'selected' : ''}>${m.charAt(0).toUpperCase() + m.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="thermostat-fan">
            <label>Fan:</label>
            <select id="thermostat-fan-select" class="thermostat-control-select" ${isEditMode ? 'disabled' : ''}>
              ${fanModes.map(f => 
                `<option value="${f}" ${f === fanMode ? 'selected' : ''}>${f.charAt(0).toUpperCase() + f.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="thermostat-temp-control">
          <button class="thermostat-temp-btn" id="thermostat-temp-down" ${isEditMode ? 'disabled' : ''}>−</button>
          <input type="number" id="thermostat-temp-input" class="thermostat-temp-input" 
                 value="${Math.round(targetTemp)}" min="50" max="90" step="1" ${isEditMode ? 'disabled' : ''}>
          <button class="thermostat-temp-btn" id="thermostat-temp-up" ${isEditMode ? 'disabled' : ''}>+</button>
        </div>
        <div class="thermostat-status">
          <span class="thermostat-status-indicator ${isHeating ? 'heating' : isCooling ? 'cooling' : 'idle'}">
            ${isHeating ? '🔥 Heating' : isCooling ? '❄️ Cooling' : '⚪ Idle'}
          </span>
        </div>
      </div>
    `;
    
    // Update all displays on current page
    displays.forEach(d => d.innerHTML = displayHtml);
    
    // Sync all selectors to the current selection
    selectors.forEach(s => {
      if (s.value !== currentThermostat.toString()) {
        s.value = currentThermostat.toString();
      }
    });
    
    // Apply dynamic styling to thermostat controls based on widget background
    document.querySelectorAll('.thermostat-widget').forEach(widget => {
      updateThermostatControlStyles(widget);
    });
    
    // Add event listeners (only if not in edit mode) - setup for all widgets
    if (!isEditMode) {
      setupThermostatControls(thermostatEntity);
    }
  } catch (error) {
    console.error('Error loading thermostat:', error);
    const errorHtml = `<div class="thermostat-error">Error: ${error.message}</div>`;
    displays.forEach(d => d.innerHTML = errorHtml);
  }
}

// Setup thermostat controls
function setupThermostatControls(entityId) {
  // Use querySelectorAll to get all instances across pages and attach listeners with duplicate prevention
  const tempInputs = document.querySelectorAll('#thermostat-temp-input');
  const tempDowns = document.querySelectorAll('#thermostat-temp-down');
  const tempUps = document.querySelectorAll('#thermostat-temp-up');
  const targetValues = document.querySelectorAll('#thermostat-target-value');
  const modeSelects = document.querySelectorAll('#thermostat-mode-select');
  const fanSelects = document.querySelectorAll('#thermostat-fan-select');
  
  // Temperature input - attach to all instances
  tempInputs.forEach(tempInput => {
    if (!tempInput.dataset.listenerAttached) {
      tempInput.dataset.listenerAttached = 'true';
    tempInput.addEventListener('change', async () => {
      const newTemp = parseFloat(tempInput.value);
      await setThermostatTemperature(entityId, newTemp);
    });
  }
  });
  
  // Temperature down button - attach to all instances
  tempDowns.forEach(tempDown => {
    if (!tempDown.dataset.listenerAttached) {
      tempDown.dataset.listenerAttached = 'true';
    tempDown.addEventListener('click', async () => {
        const widget = tempDown.closest('.thermostat-widget');
        const tempInput = widget?.querySelector('#thermostat-temp-input');
        const targetValue = widget?.querySelector('#thermostat-target-value');
        if (tempInput && targetValue) {
      const current = parseFloat(tempInput.value);
      const newTemp = Math.max(50, current - 1);
      tempInput.value = newTemp;
      targetValue.textContent = `${newTemp}°`;
      await setThermostatTemperature(entityId, newTemp);
        }
    });
  }
  });
  
  // Temperature up button - attach to all instances
  tempUps.forEach(tempUp => {
    if (!tempUp.dataset.listenerAttached) {
      tempUp.dataset.listenerAttached = 'true';
    tempUp.addEventListener('click', async () => {
        const widget = tempUp.closest('.thermostat-widget');
        const tempInput = widget?.querySelector('#thermostat-temp-input');
        const targetValue = widget?.querySelector('#thermostat-target-value');
        if (tempInput && targetValue) {
      const current = parseFloat(tempInput.value);
      const newTemp = Math.min(90, current + 1);
      tempInput.value = newTemp;
      targetValue.textContent = `${newTemp}°`;
      await setThermostatTemperature(entityId, newTemp);
        }
      });
    }
  });
  
  // Mode select - attach to all instances
  modeSelects.forEach(modeSelect => {
    if (!modeSelect.dataset.listenerAttached) {
      modeSelect.dataset.listenerAttached = 'true';
    modeSelect.addEventListener('change', async () => {
      await setThermostatMode(entityId, modeSelect.value);
    });
  }
  });
  
  // Fan select - attach to all instances
  fanSelects.forEach(fanSelect => {
    if (!fanSelect.dataset.listenerAttached) {
      fanSelect.dataset.listenerAttached = 'true';
    fanSelect.addEventListener('change', async () => {
      await setThermostatFanMode(entityId, fanSelect.value);
    });
  }
  });
  
  // Thermostat selector dropdown - attach to ALL selectors across all pages
  // Use querySelectorAll to get all selectors and attach listeners to each
  const allSelectors = document.querySelectorAll('#thermostat-selector');
  allSelectors.forEach(selector => {
    // Check if listener is already attached (avoid duplicates)
    if (!selector.dataset.listenerAttached) {
      selector.dataset.listenerAttached = 'true';
    selector.addEventListener('change', () => {
        // Sync all selectors to the same value
        const selectedValue = selector.value;
        document.querySelectorAll('#thermostat-selector').forEach(s => {
          if (s !== selector && s.value !== selectedValue) {
            s.value = selectedValue;
          }
        });
      loadThermostat();
    });
  }
  });
}

// Set thermostat temperature
async function setThermostatTemperature(entityId, temperature) {
  if (isEditMode) return;
  
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      await fetch(`${window.CONFIG.HA_URL}/api/services/climate/set_temperature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          temperature: temperature
        })
      });
    } else {
      // Use serverless function
      await fetch('/api/ha-climate-set-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          temperature: temperature
        })
      });
    }
    
    showToast(`Temperature set to ${temperature}°F`, 1000);
    setTimeout(() => loadThermostat(), 500);
  } catch (error) {
    console.error('Error setting temperature:', error);
    showToast('Error setting temperature', 2000);
  }
}

// Set thermostat mode
async function setThermostatMode(entityId, mode) {
  if (isEditMode) return;
  
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      await fetch(`${window.CONFIG.HA_URL}/api/services/climate/set_hvac_mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          hvac_mode: mode
        })
      });
    } else {
      await fetch('/api/ha-climate-set-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          hvac_mode: mode
        })
      });
    }
    
    showToast(`Mode set to ${mode}`, 1000);
    setTimeout(() => loadThermostat(), 500);
  } catch (error) {
    console.error('Error setting mode:', error);
    showToast('Error setting mode', 2000);
  }
}

// Set thermostat fan mode
async function setThermostatFanMode(entityId, fanMode) {
  if (isEditMode) return;
  
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      await fetch(`${window.CONFIG.HA_URL}/api/services/climate/set_fan_mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          fan_mode: fanMode
        })
      });
    } else {
      await fetch('/api/ha-climate-set-fan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          fan_mode: fanMode
        })
      });
    }
    
    showToast(`Fan set to ${fanMode}`, 1000);
    setTimeout(() => loadThermostat(), 500);
  } catch (error) {
    console.error('Error setting fan mode:', error);
    showToast('Error setting fan mode', 2000);
  }
}

// Load news feed
// News loading state - prevent multiple simultaneous requests
let newsLoading = false;
let newsLastError = null;
let newsErrorCount = 0;
const MAX_NEWS_ERRORS = 3; // Stop retrying after 3 consecutive errors

async function loadNews() {
  // Get all news widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('news-widget', currentPageIndex);
  const containers = [];
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    const container = widget.querySelector('#news-content');
    if (container) containers.push(container);
  });
  
  if (containers.length === 0) return;
  
  // Prevent multiple simultaneous requests
  if (newsLoading) {
    return;
  }
  
  // If we've had too many errors, show a persistent error message and don't retry
  if (newsErrorCount >= MAX_NEWS_ERRORS) {
    if (newsLastError) {
      const errorHtml = `
        <div class="news-error">
          <p>News feed unavailable</p>
          <p style="font-size: 12px; color: #888; margin-top: 8px;">
            ${newsLastError}
          </p>
          <p style="font-size: 11px; color: #666; margin-top: 8px;">
            The news service is currently unavailable. Please check your API configuration.
          </p>
        </div>
      `;
      containers.forEach(c => c.innerHTML = errorHtml);
    }
    return;
  }
  
  newsLoading = true;
  
  try {
    // Use RSS feed (free, no API key required)
    const response = await fetch('/api/news');
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch news: ${response.statusText}`;
      
      // Try to get more detailed error message
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If JSON parsing fails, use the status text
      }
      
      if (response.status === 400) {
        // Show error message for configuration issues
        const errorHtml = `
          <div class="news-error">
            <p>News feed configuration error</p>
            <p style="font-size: 12px; color: #888; margin-top: 8px;">
              Please check your RSS feed configuration.
              </p>
            </div>
          `;
        containers.forEach(c => c.innerHTML = errorHtml);
        newsErrorCount = MAX_NEWS_ERRORS; // Stop retrying
        newsLastError = 'Configuration error';
          return;
        }
      
      // For 500 errors, show a user-friendly message
      if (response.status === 500) {
        newsErrorCount++;
        newsLastError = errorMessage || 'Server error - news service unavailable';
        const errorHtml = `
          <div class="news-error">
            <p>News feed unavailable</p>
            <p style="font-size: 12px; color: #888; margin-top: 8px;">
              ${newsLastError}
            </p>
            ${newsErrorCount < MAX_NEWS_ERRORS ? 
              '<p style="font-size: 11px; color: #666; margin-top: 8px;">Retrying...</p>' :
              '<p style="font-size: 11px; color: #666; margin-top: 8px;">Service temporarily unavailable</p>'
            }
          </div>
        `;
        containers.forEach(c => c.innerHTML = errorHtml);
        throw new Error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Reset error count on success
    newsErrorCount = 0;
    newsLastError = null;
    
    let contentHtml;
    if (data.articles && data.articles.length > 0) {
      contentHtml = `
        <div class="news-list">
          ${data.articles.slice(0, 5).map((article, index) => `
            <div class="news-item">
              <div class="news-item-title">
                <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                  ${article.title}
                </a>
              </div>
              <div class="news-item-source">${article.source?.name || 'Unknown'} • ${formatNewsDate(article.publishedAt)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contentHtml = '<div class="news-error">No news articles found</div>';
    }
    
    // Update all containers across all pages
    containers.forEach(c => c.innerHTML = contentHtml);
  } catch (error) {
    console.error('Error loading news:', error);
    newsErrorCount++;
    newsLastError = error.message || 'Unknown error';
    
    // Only show error if we haven't exceeded max errors
    if (newsErrorCount < MAX_NEWS_ERRORS) {
      const errorHtml = `
      <div class="news-error">
        <p>Error loading news</p>
        <p style="font-size: 12px; color: #888;">${error.message}</p>
          <p style="font-size: 11px; color: #666; margin-top: 8px;">Retrying...</p>
      </div>
    `;
      containers.forEach(c => c.innerHTML = errorHtml);
    } else {
      // Final error message - no more retries
      const errorHtml = `
        <div class="news-error">
          <p>News feed unavailable</p>
          <p style="font-size: 12px; color: #888; margin-top: 8px;">
            ${newsLastError}
          </p>
          <p style="font-size: 11px; color: #666; margin-top: 8px;">
            The news service is currently unavailable. Please check your API configuration.
          </p>
        </div>
      `;
      containers.forEach(c => c.innerHTML = errorHtml);
    }
  } finally {
    newsLoading = false;
  }
}

// Format news date
function formatNewsDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Whiteboard state
// Whiteboard state management - per widget instance
let whiteboardStates = new Map(); // Track drawing state per widget: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, isDrawing: boolean, lastX: number, lastY: number, autoHideTimer: number }

// Initialize whiteboard
function initializeWhiteboard() {
  // Get all whiteboard widget instances on the current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const instances = getWidgetInstances('whiteboard-widget', currentPageIndex);
  
  // Initialize all whiteboard instances (each with independent state)
  if (instances.length === 0) return;
  
  instances.forEach(instance => {
    const widget = instance.element;
    if (!widget || widget.classList.contains('hidden')) return;
    
    // Get widget instance ID
    const classes = Array.from(widget.classList);
    const instanceIdClass = classes.find(c => c.startsWith('whiteboard-widget-page-') && c.includes('-instance-'));
    const fullWidgetId = instanceIdClass || classes.find(c => c.includes('whiteboard-widget'));
    if (!fullWidgetId) return;
    
    const canvas = widget.querySelector('#whiteboard-canvas');
    if (!canvas) return;
    
    // Get or create state for this widget instance
    let state = whiteboardStates.get(fullWidgetId);
    if (!state) {
      state = {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        autoHideTimer: null
      };
      whiteboardStates.set(fullWidgetId, state);
    } else {
      // Update canvas and context if widget was recreated
      state.canvas = canvas;
      state.ctx = canvas.getContext('2d');
      // Initialize autoHideTimer if not present (for existing states)
      if (state.autoHideTimer === undefined) {
        state.autoHideTimer = null;
      }
    }
    
    // Set canvas size to match container
    const container = canvas.closest('.whiteboard-container');
    const whiteboardWidget = canvas.closest('.whiteboard-widget');
    if (container && whiteboardWidget) {
      const resizeCanvas = () => {
        // Get the actual container dimensions
        const containerRect = container.getBoundingClientRect();
        
        // Calculate available space for canvas (no toolbar in container anymore)
        const availableWidth = containerRect.width - 2; // Account for border
        const availableHeight = Math.max(50, containerRect.height - 2); // Account for border
        
        // Only resize if dimensions actually changed to avoid unnecessary redraws
        if (canvas.width !== availableWidth || canvas.height !== availableHeight) {
          const wasDrawing = canvas.width > 0 && canvas.height > 0;
          const oldImage = wasDrawing ? canvas.toDataURL() : null;
          
          canvas.width = availableWidth;
          canvas.height = availableHeight;
          
          // Restore drawing or set background
          if (oldImage && wasDrawing) {
            const img = new Image();
            img.onload = () => {
              state.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = oldImage;
          } else {
            // Load background color for this widget instance
            const bgColor = localStorage.getItem(`whiteboard-bg-color-${fullWidgetId}`) || localStorage.getItem(`whiteboard-bg-color-page-${currentPageIndex}`) || '#ffffff';
            state.ctx.fillStyle = bgColor;
            state.ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      };
      
      resizeCanvas();
      
      // Observe both container and widget for resize
      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(container);
      resizeObserver.observe(widget);
    }
    
    // Load saved drawing for this widget instance (instance-specific, fallback to page-specific for backward compatibility)
    const savedDrawing = localStorage.getItem(`whiteboard-drawing-${fullWidgetId}`) || localStorage.getItem(`whiteboard-drawing-page-${currentPageIndex}`);
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => {
        state.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = savedDrawing;
    } else {
      // Set default background color if no saved drawing
      const bgColor = localStorage.getItem(`whiteboard-bg-color-${fullWidgetId}`) || localStorage.getItem(`whiteboard-bg-color-page-${currentPageIndex}`) || '#ffffff';
      state.ctx.fillStyle = bgColor;
      state.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Load saved settings (instance-specific, fallback to page-specific)
    const savedInkColor = localStorage.getItem(`whiteboard-ink-color-${fullWidgetId}`) || localStorage.getItem(`whiteboard-ink-color-page-${currentPageIndex}`) || '#000000';
    const savedBrushSize = localStorage.getItem(`whiteboard-brush-size-${fullWidgetId}`) || localStorage.getItem(`whiteboard-brush-size-page-${currentPageIndex}`) || '3';
    let bgColor = localStorage.getItem(`whiteboard-bg-color-${fullWidgetId}`) || localStorage.getItem(`whiteboard-bg-color-page-${currentPageIndex}`) || '#ffffff';
    
    // Check if title should be hidden (from saved styles)
    const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
    const checkTitleShouldBeHidden = () => {
      const savedStylesStr = localStorage.getItem(stylesKey);
      if (savedStylesStr) {
        try {
          const savedStyles = JSON.parse(savedStylesStr);
          return savedStyles.titleVisible === false;
        } catch (e) {
          return false;
        }
      }
      return false;
    };
    
    // Helper function to show header temporarily if hidden (accessible to controls and drawing handlers)
    const showHeaderTemporarily = () => {
      // Only show temporary header if title should be hidden
      if (!checkTitleShouldBeHidden()) return;
      
      const widgetHeader = whiteboardWidget.querySelector('.widget-header');
      if (!widgetHeader) return;
      
      // Check if header is currently hidden
      const computedStyle = window.getComputedStyle(widgetHeader);
      const isHidden = computedStyle.display === 'none';
      
      // Only show if hidden (title visibility is disabled)
      if (isHidden) {
        // Clear any existing timer
        if (state.autoHideTimer) {
          clearTimeout(state.autoHideTimer);
          state.autoHideTimer = null;
        }
        
        // Show header temporarily - position it absolutely above the widget
        widgetHeader.style.display = '';
        widgetHeader.classList.add('whiteboard-header-temporary');
        
        // Widget is already position: absolute (from .widget class), which is sufficient
        // for absolutely positioning the header relative to it. No need to change position.
        
        // Set timer to hide after 5 seconds
        state.autoHideTimer = setTimeout(() => {
          // Double-check title should still be hidden before hiding
          if (checkTitleShouldBeHidden() && widgetHeader.classList.contains('whiteboard-header-temporary')) {
            widgetHeader.style.display = 'none';
            widgetHeader.classList.remove('whiteboard-header-temporary');
          }
          state.autoHideTimer = null;
        }, 5000);
      }
    };
    
    // Helper function to reset auto-hide timer (when controls are used)
    const resetAutoHideTimer = () => {
      // Only manage timer if title should be hidden
      if (!checkTitleShouldBeHidden()) return;
      
      const widgetHeader = whiteboardWidget.querySelector('.widget-header');
      if (!widgetHeader) return;
      
      // Clear any existing timer first
      if (state.autoHideTimer) {
        clearTimeout(state.autoHideTimer);
        state.autoHideTimer = null;
      }
      
      const computedStyle = window.getComputedStyle(widgetHeader);
      const isCurrentlyHidden = computedStyle.display === 'none';
      
      // If header is hidden, show it temporarily
      if (isCurrentlyHidden) {
        widgetHeader.style.display = '';
        widgetHeader.classList.add('whiteboard-header-temporary');
        
        // Widget is already position: absolute (from .widget class), which is sufficient
        // for absolutely positioning the header relative to it. No need to change position.
      } else if (!widgetHeader.classList.contains('whiteboard-header-temporary')) {
        // Header is permanently visible (titleVisible is true), don't set timer
        return;
      }
      // If header already has temporary class, we'll reset the timer below
      
      // Always set timer if header has temporary class (it should eventually hide)
      if (widgetHeader.classList.contains('whiteboard-header-temporary')) {
        state.autoHideTimer = setTimeout(() => {
          // Verify title should still be hidden and header is still temporary before hiding
          if (checkTitleShouldBeHidden() && widgetHeader.classList.contains('whiteboard-header-temporary')) {
            widgetHeader.style.display = 'none';
            widgetHeader.classList.remove('whiteboard-header-temporary');
          }
          state.autoHideTimer = null;
        }, 5000);
      }
    };
    
    // Find controls for this specific widget instance
    const inkColorInput = whiteboardWidget.querySelector('#whiteboard-ink-color');
    const bgColorInput = whiteboardWidget.querySelector('#whiteboard-bg-color');
    const brushSizeInput = whiteboardWidget.querySelector('#whiteboard-brush-size');
    const brushSizeLabel = whiteboardWidget.querySelector('#whiteboard-brush-size-label');
    const clearBtn = whiteboardWidget.querySelector('#whiteboard-clear');
    
    if (inkColorInput) {
      inkColorInput.value = savedInkColor;
      // Remove old listeners and add new one
      const newInkInput = inkColorInput.cloneNode(true);
      inkColorInput.parentNode.replaceChild(newInkInput, inkColorInput);
      newInkInput.addEventListener('change', (e) => {
        localStorage.setItem(`whiteboard-ink-color-${fullWidgetId}`, e.target.value);
        resetAutoHideTimer(); // Reset timer when control is used
      });
      newInkInput.addEventListener('click', () => {
        resetAutoHideTimer(); // Reset timer when control is clicked
      });
    }
    
    if (bgColorInput) {
      bgColorInput.value = bgColor;
      // Remove old listeners and add new one
      const newBgInput = bgColorInput.cloneNode(true);
      bgColorInput.parentNode.replaceChild(newBgInput, bgColorInput);
      
      // Helper function to replace background color in canvas
      const replaceBackgroundColor = (oldBgColor, newBgColor) => {
        const imageData = state.ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const oldBgR = parseInt(oldBgColor.slice(1, 3), 16);
        const oldBgG = parseInt(oldBgColor.slice(3, 5), 16);
        const oldBgB = parseInt(oldBgColor.slice(5, 7), 16);
        const newBgR = parseInt(newBgColor.slice(1, 3), 16);
        const newBgG = parseInt(newBgColor.slice(3, 5), 16);
        const newBgB = parseInt(newBgColor.slice(5, 7), 16);
        
        // Replace background pixels (with tolerance for anti-aliasing and slight variations)
        const tolerance = 20; // Allow slight color differences due to anti-aliasing
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3]; // Alpha channel
          
          // Only process visible pixels (alpha > 0)
          if (a > 0) {
            // Check if pixel matches old background (within tolerance)
            if (Math.abs(r - oldBgR) <= tolerance &&
                Math.abs(g - oldBgG) <= tolerance &&
                Math.abs(b - oldBgB) <= tolerance) {
              // Replace with new background color
              data[i] = newBgR;
              data[i + 1] = newBgG;
              data[i + 2] = newBgB;
              // Keep alpha as is
            }
          }
        }
        
        // Put modified image data back
        state.ctx.putImageData(imageData, 0, 0);
      };
      
      newBgInput.addEventListener('change', (e) => {
        const newBgColor = e.target.value;
        
        // Get the saved background color (the one we should replace)
        const savedBgColor = localStorage.getItem(`whiteboard-bg-color-${fullWidgetId}`) || bgColor;
        
        // Replace background color while preserving drawing
        // Always compare against the saved background color to avoid cascading issues
        if (savedBgColor !== newBgColor) {
          replaceBackgroundColor(savedBgColor, newBgColor);
        }
        
        // Update stored background color
        localStorage.setItem(`whiteboard-bg-color-${fullWidgetId}`, newBgColor);
        
        saveWhiteboardInstance(fullWidgetId);
        resetAutoHideTimer(); // Reset timer when control is used
      });
      newBgInput.addEventListener('click', () => {
        resetAutoHideTimer(); // Reset timer when control is clicked
      });
    }
    
    if (brushSizeInput && brushSizeLabel) {
      brushSizeInput.value = savedBrushSize;
      brushSizeLabel.textContent = `${savedBrushSize}px`;
      // Remove old listeners and add new one
      const newBrushInput = brushSizeInput.cloneNode(true);
      const newBrushLabel = brushSizeLabel.cloneNode(true);
      brushSizeInput.parentNode.replaceChild(newBrushInput, brushSizeInput);
      brushSizeLabel.parentNode.replaceChild(newBrushLabel, brushSizeLabel);
      newBrushInput.addEventListener('input', (e) => {
        const size = e.target.value;
        newBrushLabel.textContent = `${size}px`;
        localStorage.setItem(`whiteboard-brush-size-${fullWidgetId}`, size);
        resetAutoHideTimer(); // Reset timer when control is used
      });
      newBrushInput.addEventListener('mousedown', () => {
        resetAutoHideTimer(); // Reset timer when control is clicked
      });
    }
    
    // Clear button - remove old listener and add new one
    if (clearBtn) {
      const newClearBtn = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
      newClearBtn.addEventListener('click', () => {
        clearWhiteboardInstance(fullWidgetId);
        resetAutoHideTimer(); // Reset timer when control is used
      });
    }
    
    // Setup drawing event listeners for this specific canvas instance (pass showHeaderTemporarily)
    setupWhiteboardDrawingInstance(fullWidgetId, showHeaderTemporarily);
  });
}

// Setup whiteboard drawing for a specific widget instance
function setupWhiteboardDrawingInstance(widgetId, showHeaderTemporarilyCallback) {
  const state = whiteboardStates.get(widgetId);
  if (!state || !state.canvas) return;
  
  const canvas = state.canvas;
  
  // Remove existing listeners
  canvas.removeEventListener('mousedown', state.startDrawingHandler);
  canvas.removeEventListener('mousemove', state.drawHandler);
  canvas.removeEventListener('mouseup', state.stopDrawingHandler);
  canvas.removeEventListener('mouseout', state.stopDrawingHandler);
  canvas.removeEventListener('touchstart', state.startDrawingTouchHandler);
  canvas.removeEventListener('touchmove', state.drawTouchHandler);
  canvas.removeEventListener('touchend', state.stopDrawingHandler);
  
  // Create instance-specific handlers
  state.startDrawingHandler = (e) => {
    if (isEditMode) return;
    state.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    state.lastX = e.clientX - rect.left;
    state.lastY = e.clientY - rect.top;
    
    // Show header temporarily if hidden when drawing starts
    if (showHeaderTemporarilyCallback) {
      showHeaderTemporarilyCallback();
    }
  };
  
  state.startDrawingTouchHandler = (e) => {
    if (isEditMode) return;
    e.preventDefault();
    state.isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    state.lastX = touch.clientX - rect.left;
    state.lastY = touch.clientY - rect.top;
    
    // Show header temporarily if hidden when drawing starts
    if (showHeaderTemporarilyCallback) {
      showHeaderTemporarilyCallback();
    }
  };
  
  state.drawHandler = (e) => {
    if (!state.isDrawing || isEditMode) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const whiteboardWidget = canvas.closest('.whiteboard-widget');
    const inkColorInput = whiteboardWidget?.querySelector('#whiteboard-ink-color');
    const brushSizeInput = whiteboardWidget?.querySelector('#whiteboard-brush-size');
    const inkColor = inkColorInput?.value || localStorage.getItem(`whiteboard-ink-color-${widgetId}`) || '#000000';
    const brushSize = parseInt(brushSizeInput?.value || localStorage.getItem(`whiteboard-brush-size-${widgetId}`) || '3');
    
    state.ctx.strokeStyle = inkColor;
    state.ctx.lineWidth = brushSize;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';
    
    state.ctx.beginPath();
    state.ctx.moveTo(state.lastX, state.lastY);
    state.ctx.lineTo(currentX, currentY);
    state.ctx.stroke();
    
    state.lastX = currentX;
    state.lastY = currentY;
    
    // Save drawing immediately after each stroke segment
    saveWhiteboardInstance(widgetId);
  };
  
  state.drawTouchHandler = (e) => {
    if (!state.isDrawing || isEditMode) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    const whiteboardWidget = canvas.closest('.whiteboard-widget');
    const inkColorInput = whiteboardWidget?.querySelector('#whiteboard-ink-color');
    const brushSizeInput = whiteboardWidget?.querySelector('#whiteboard-brush-size');
    const inkColor = inkColorInput?.value || localStorage.getItem(`whiteboard-ink-color-${widgetId}`) || '#000000';
    const brushSize = parseInt(brushSizeInput?.value || localStorage.getItem(`whiteboard-brush-size-${widgetId}`) || '3');
    
    state.ctx.strokeStyle = inkColor;
    state.ctx.lineWidth = brushSize;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';
    
    state.ctx.beginPath();
    state.ctx.moveTo(state.lastX, state.lastY);
    state.ctx.lineTo(currentX, currentY);
    state.ctx.stroke();
    
    state.lastX = currentX;
    state.lastY = currentY;
    
    // Save drawing immediately after each stroke segment
    saveWhiteboardInstance(widgetId);
  };
  
  state.stopDrawingHandler = () => {
    if (state.isDrawing) {
      state.isDrawing = false;
      saveWhiteboardInstance(widgetId);
    }
  };
  
  // Only enable drawing in normal mode
  if (!isEditMode) {
    canvas.addEventListener('mousedown', state.startDrawingHandler);
    canvas.addEventListener('mousemove', state.drawHandler);
    canvas.addEventListener('mouseup', state.stopDrawingHandler);
    canvas.addEventListener('mouseout', state.stopDrawingHandler);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', state.startDrawingTouchHandler, { passive: false });
    canvas.addEventListener('touchmove', state.drawTouchHandler, { passive: false });
    canvas.addEventListener('touchend', state.stopDrawingHandler);
    
    canvas.style.cursor = 'crosshair';
  } else {
    canvas.style.cursor = 'default';
  }
}

// Clear whiteboard for a specific widget instance
function clearWhiteboardInstance(widgetId) {
  const state = whiteboardStates.get(widgetId);
  if (!state || !state.canvas || !state.ctx) return;
  
  const whiteboardWidget = state.canvas.closest('.whiteboard-widget');
  const bgColorInput = whiteboardWidget?.querySelector('#whiteboard-bg-color');
  const bgColor = bgColorInput?.value || localStorage.getItem(`whiteboard-bg-color-${widgetId}`) || '#ffffff';
  state.ctx.fillStyle = bgColor;
  state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
  
  localStorage.removeItem(`whiteboard-drawing-${widgetId}`);
  saveWhiteboardInstance(widgetId);
}

// Save whiteboard to localStorage for a specific widget instance
function saveWhiteboardInstance(widgetId) {
  const state = whiteboardStates.get(widgetId);
  if (!state || !state.canvas) return;
  
  try {
    const dataURL = state.canvas.toDataURL('image/png');
    localStorage.setItem(`whiteboard-drawing-${widgetId}`, dataURL);
  } catch (error) {
    console.error('Error saving whiteboard:', error);
  }
}

// Fetch HA entity via API (works both locally and in production)
async function fetchHAEntity(entityId) {
  try {
    // Use serverless function
      const response = await fetch(`/api/ha-fetch?entityId=${encodeURIComponent(entityId)}`);
      if (!response.ok) {
        // Don't log 404s/500s for missing entities (expected for some forecast days/hours)
        // Just throw silently - caller will handle
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
  } catch (error) {
    // Silently throw - caller will handle missing entities
    throw error;
  }
}

// Trigger HA webhook via API (works both locally and in production)
async function triggerHAWebhook(webhookId) {
  try {
    // Extract webhook ID if full URL is provided
    // Handle both formats: "webhook_id" or "http://url/api/webhook/webhook_id"
    let actualWebhookId = webhookId;
    if (webhookId.includes('/api/webhook/')) {
      // Extract the webhook ID from the URL
      const parts = webhookId.split('/api/webhook/');
      if (parts.length > 1) {
        actualWebhookId = parts[1].split('?')[0].split('#')[0]; // Remove query params and fragments
      }
    }
    
    // Use serverless function
      const response = await fetch(`/api/ha-webhook?webhookId=${encodeURIComponent(actualWebhookId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
    // Some serverless functions may return 500 even when webhook succeeds
    // Try to parse response even if status is not ok
    if (response.ok) {
      return await response.json();
    } else {
      // Try to get response text to see if there's useful info
      try {
        const errorText = await response.text();
        // If we can parse it as JSON, return it (might contain success info)
        try {
          const errorJson = JSON.parse(errorText);
          // If it has a success field or message, treat it as success
          if (errorJson.success || errorJson.message) {
            return errorJson;
          }
        } catch {
          // If not JSON, for 500 errors assume webhook succeeded (common with serverless functions)
          if (response.status === 500) {
            console.warn(`Webhook ${actualWebhookId} returned status 500, but webhook may have succeeded`);
            return { success: true, warning: `Server returned 500 but webhook likely succeeded` };
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (parseError) {
        // For 500 errors, assume webhook succeeded (common with serverless functions)
        if (response.status === 500) {
          console.warn(`Webhook ${actualWebhookId} returned status 500, but webhook may have succeeded`);
          return { success: true, warning: `Server returned 500 but webhook likely succeeded` };
      }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
  } catch (error) {
    console.error(`Error triggering webhook ${webhookId}:`, error);
    throw error;
  }
}

// Annotation System
let isAnnotationMode = false;
let annotationCanvas = null;
let annotationCtx = null;
let highlightMaskCanvas = null;
let highlightMaskCtx = null;
let highlight2Canvas = null;
let highlight2Ctx = null;
let annotationState = {
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  currentTool: 'pen',
  currentColor: localStorage.getItem('dakboard-annotation-color') || '#000000',
  brushSize: parseInt(localStorage.getItem('dakboard-annotation-brush-size')) || 3,
  opacity: parseInt(localStorage.getItem('dakboard-annotation-opacity')) || 15,
  isVisible: true // Will be page-specific, loaded per page
};

// Stroke-based highlighter storage (for highlighter2 tool)
let highlightStrokes = [];
let currentHighlightStroke = null;

// Initialize annotation canvas
function initializeAnnotationCanvas() {
  annotationCanvas = document.getElementById('annotation-canvas');
  if (!annotationCanvas) return;
  
  annotationCtx = annotationCanvas.getContext('2d');
  if (!annotationCtx) return;
  
  // Create separate canvas for highlight mask (tracks only highlights)
  highlightMaskCanvas = document.createElement('canvas');
  highlightMaskCanvas.width = window.innerWidth;
  highlightMaskCanvas.height = window.innerHeight;
  highlightMaskCtx = highlightMaskCanvas.getContext('2d');
  
  // Create separate canvas for highlighter2 (stroke-based)
  highlight2Canvas = document.createElement('canvas');
  highlight2Canvas.width = window.innerWidth;
  highlight2Canvas.height = window.innerHeight;
  highlight2Ctx = highlight2Canvas.getContext('2d');
  highlight2Canvas.style.position = 'absolute';
  highlight2Canvas.style.top = '0';
  highlight2Canvas.style.left = '0';
  highlight2Canvas.style.pointerEvents = 'none';
  highlight2Canvas.style.zIndex = '9998';
  document.body.appendChild(highlight2Canvas);
  
  // Set canvas size to match viewport
  function resizeCanvas() {
    annotationCanvas.width = window.innerWidth;
    annotationCanvas.height = window.innerHeight;
    if (highlightMaskCanvas) {
      highlightMaskCanvas.width = window.innerWidth;
      highlightMaskCanvas.height = window.innerHeight;
    }
    if (highlight2Canvas) {
      highlight2Canvas.width = window.innerWidth;
      highlight2Canvas.height = window.innerHeight;
    }
    // Reload saved annotations if visible
    if (annotationState.isVisible) {
      loadAnnotationData();
    }
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Load saved annotations
  loadAnnotationData();
  
  // Load annotation visibility for current page
  loadAnnotationVisibility();
}

// Set annotation mode
function setAnnotationMode(enabled) {
  isAnnotationMode = enabled;
  document.body.classList.toggle('annotation-mode', enabled);
  
  if (enabled) {
    if (!annotationCanvas) {
      initializeAnnotationCanvas();
    }
    setupAnnotationDrawing();
    updateAnnotationToolbar();
  } else {
    removeAnnotationDrawing();
  }
  
  // Update toggle button
  const toggleBtn = document.getElementById('annotate-mode-toggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', enabled);
  }
}

// Setup drawing event listeners
function setupAnnotationDrawing() {
  if (!annotationCanvas) return;
  
  annotationCanvas.addEventListener('mousedown', startAnnotationDrawing);
  annotationCanvas.addEventListener('mousemove', drawAnnotation);
  annotationCanvas.addEventListener('mouseup', stopAnnotationDrawing);
  annotationCanvas.addEventListener('mouseout', stopAnnotationDrawing);
  annotationCanvas.addEventListener('touchstart', startAnnotationDrawingTouch, { passive: false });
  annotationCanvas.addEventListener('touchmove', drawAnnotationTouch, { passive: false });
  annotationCanvas.addEventListener('touchend', stopAnnotationDrawing);
}

// Remove drawing event listeners
function removeAnnotationDrawing() {
  if (!annotationCanvas) return;
  
  annotationCanvas.removeEventListener('mousedown', startAnnotationDrawing);
  annotationCanvas.removeEventListener('mousemove', drawAnnotation);
  annotationCanvas.removeEventListener('mouseup', stopAnnotationDrawing);
  annotationCanvas.removeEventListener('mouseout', stopAnnotationDrawing);
  annotationCanvas.removeEventListener('touchstart', startAnnotationDrawingTouch);
  annotationCanvas.removeEventListener('touchmove', drawAnnotationTouch);
  annotationCanvas.removeEventListener('touchend', stopAnnotationDrawing);
}

// Start drawing
function startAnnotationDrawing(e) {
  if (!annotationCanvas || !annotationCtx) return;
  // Prevent drawing if annotations are hidden
  if (!annotationState.isVisible) return;
  annotationState.isDrawing = true;
  
  const rect = annotationCanvas.getBoundingClientRect();
  annotationState.lastX = e.clientX - rect.left;
  annotationState.lastY = e.clientY - rect.top;
  
  // For highlighter2, use stroke-based approach
  if (annotationState.currentTool === 'highlighter2') {
    currentHighlightStroke = {
      points: [{ x: annotationState.lastX, y: annotationState.lastY }],
      color: annotationState.currentColor,
      opacity: annotationState.opacity
    };
    highlightStrokes.push(currentHighlightStroke);
    drawAllHighlightStrokes();
    return;
  }
  
  // Draw a dot at the start point to ensure coverage when drawing slowly
  drawAnnotationDot(annotationState.lastX, annotationState.lastY);
}

// Draw
function drawAnnotation(e) {
  if (!annotationState.isDrawing || !annotationCtx) return;
  
  const rect = annotationCanvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  
  // For highlighter2, use stroke-based approach
  if (annotationState.currentTool === 'highlighter2' && currentHighlightStroke) {
    currentHighlightStroke.points.push({ x: currentX, y: currentY });
    drawAllHighlightStrokes();
    annotationState.lastX = currentX;
    annotationState.lastY = currentY;
    return;
  }
  
  drawAnnotationLine(annotationState.lastX, annotationState.lastY, currentX, currentY);
  
  annotationState.lastX = currentX;
  annotationState.lastY = currentY;
}

// Stop drawing
function stopAnnotationDrawing() {
  if (annotationState.isDrawing) {
    annotationState.isDrawing = false;
    if (annotationState.currentTool === 'highlighter2') {
      currentHighlightStroke = null;
    }
    saveAnnotationData();
  }
}

// Touch handlers
function startAnnotationDrawingTouch(e) {
  e.preventDefault();
  if (!annotationCanvas || !annotationCtx) return;
  annotationState.isDrawing = true;
  
  const touch = e.touches[0];
  const rect = annotationCanvas.getBoundingClientRect();
  annotationState.lastX = touch.clientX - rect.left;
  annotationState.lastY = touch.clientY - rect.top;
  
  // For highlighter2, use stroke-based approach
  if (annotationState.currentTool === 'highlighter2') {
    currentHighlightStroke = {
      points: [{ x: annotationState.lastX, y: annotationState.lastY }],
      color: annotationState.currentColor,
      opacity: annotationState.opacity
    };
    highlightStrokes.push(currentHighlightStroke);
    drawAllHighlightStrokes();
    return;
  }
  
  // Draw a dot at the start point to ensure coverage when drawing slowly
  drawAnnotationDot(annotationState.lastX, annotationState.lastY);
}

function drawAnnotationTouch(e) {
  e.preventDefault();
  if (!annotationState.isDrawing || !annotationCtx) return;
  
  const touch = e.touches[0];
  const rect = annotationCanvas.getBoundingClientRect();
  const currentX = touch.clientX - rect.left;
  const currentY = touch.clientY - rect.top;
  
  // For highlighter2, use stroke-based approach
  if (annotationState.currentTool === 'highlighter2' && currentHighlightStroke) {
    currentHighlightStroke.points.push({ x: currentX, y: currentY });
    drawAllHighlightStrokes();
    annotationState.lastX = currentX;
    annotationState.lastY = currentY;
    return;
  }
  
  drawAnnotationLine(annotationState.lastX, annotationState.lastY, currentX, currentY);
  
  annotationState.lastX = currentX;
  annotationState.lastY = currentY;
}

// Convert hex color to rgba string
function hexToRgba(hex, alpha) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Check if an area is already highlighted (to prevent accumulation)
function isAreaAlreadyHighlighted(ctx, x, y, radius, highlightColor) {
  if (!ctx) return false;
  
  try {
    // Sample center pixel and surrounding pixels
    const sampleSize = Math.max(5, Math.floor(radius));
    const startX = Math.max(0, Math.floor(x - sampleSize));
    const startY = Math.max(0, Math.floor(y - sampleSize));
    const width = Math.min(sampleSize * 2, ctx.canvas.width - startX);
    const height = Math.min(sampleSize * 2, ctx.canvas.height - startY);
    
    if (width <= 0 || height <= 0) return false;
    
    const imageData = ctx.getImageData(startX, startY, width, height);
    const data = imageData.data;
    
    // Parse highlight color
    const hex = highlightColor.replace('#', '');
    const highlightR = parseInt(hex.substring(0, 2), 16);
    const highlightG = parseInt(hex.substring(2, 4), 16);
    const highlightB = parseInt(hex.substring(4, 6), 16);
    
    // Calculate what the highlight color looks like at selected opacity on black background
    // When you draw color at alpha on black: result = color * alpha
    const alpha = annotationState.opacity / 100;
    const expectedR = Math.round(highlightR * alpha);
    const expectedG = Math.round(highlightG * alpha);
    const expectedB = Math.round(highlightB * alpha);
    
    // Check if any sampled pixels match the expected highlighted color
    let highlightedPixels = 0;
    const totalPixels = (data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];
      const pixelA = data[i + 3];
      
      // Check if pixel matches the expected highlight color (with tolerance)
      // Account for the fact that highlights might be on different backgrounds
      const colorDistance = Math.sqrt(
        Math.pow(pixelR - expectedR, 2) + 
        Math.pow(pixelG - expectedG, 2) + 
        Math.pow(pixelB - expectedB, 2)
      );
      
      // Also check if pixel is close to the highlight color (indicating it's highlighted)
      const highlightDistance = Math.sqrt(
        Math.pow(pixelR - highlightR, 2) + 
        Math.pow(pixelG - highlightG, 2) + 
        Math.pow(pixelB - highlightB, 2)
      );
      
      // If pixel matches expected highlight OR is close to highlight color with some opacity
      if ((colorDistance < 30) || (highlightDistance < 50 && pixelA > 30)) {
        highlightedPixels++;
      }
    }
    
    // If more than 20% of sampled pixels are highlighted, consider area already highlighted
    return (highlightedPixels / totalPixels) > 0.2;
  } catch (e) {
    // If we can't check (e.g., outside canvas bounds), allow drawing
    return false;
  }
}

// Draw a dot at a point (for smooth drawing)
function drawAnnotationDot(x, y) {
  if (!annotationCtx) return;
  
  annotationCtx.lineCap = 'round';
  annotationCtx.lineJoin = 'round';
  annotationCtx.lineWidth = annotationState.brushSize;
  
  switch (annotationState.currentTool) {
    case 'pen':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.fillStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = 1.0;
      break;
    case 'highlighter':
      // Use mask-based approach: only draw where highlight mask is empty
      if (!highlightMaskCtx) {
        // Fallback if mask not initialized
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.fillStyle = annotationState.currentColor;
        annotationCtx.globalAlpha = annotationState.opacity / 100;
        break;
      }
      
      // Create temp canvas for the new highlight shape
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = annotationCanvas.width;
      tempCanvas.height = annotationCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw highlight shape to temp at full opacity
      tempCtx.globalCompositeOperation = 'source-over';
      tempCtx.fillStyle = annotationState.currentColor;
      tempCtx.globalAlpha = 1.0;
      tempCtx.beginPath();
      tempCtx.arc(x, y, annotationState.brushSize / 2, 0, Math.PI * 2);
      tempCtx.fill();
      
      // Use destination-out to erase from temp where highlight mask already has content
      // This ensures we only draw new highlights, not overlapping ones
      tempCtx.globalCompositeOperation = 'destination-out';
      tempCtx.drawImage(highlightMaskCanvas, 0, 0);
      
      // Update highlight mask FIRST with the new highlight (at full opacity for tracking)
      // This ensures subsequent draws see the updated mask immediately
      highlightMaskCtx.globalCompositeOperation = 'source-over';
      highlightMaskCtx.fillStyle = annotationState.currentColor;
      highlightMaskCtx.globalAlpha = 1.0;
      highlightMaskCtx.beginPath();
      highlightMaskCtx.arc(x, y, annotationState.brushSize / 2, 0, Math.PI * 2);
      highlightMaskCtx.fill();
      
      // Draw the masked highlight to main canvas at selected opacity using source-over
      // This ensures consistent opacity without accumulation
      annotationCtx.save();
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.globalAlpha = annotationState.opacity / 100;
      annotationCtx.drawImage(tempCanvas, 0, 0);
      annotationCtx.restore();
      
      return; // Skip the normal fill below
      break;
    case 'airbrush':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.fillStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = annotationState.opacity / 100;
      break;
    case 'paintbrush':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.fillStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = 0.85;
      break;
    case 'eraser':
      // Erase from main canvas
      annotationCtx.globalCompositeOperation = 'destination-out';
      annotationCtx.fillStyle = 'rgba(0,0,0,1)';
      annotationCtx.globalAlpha = 1.0;
      // Also erase from highlighter2 canvas if it exists
      if (highlight2Ctx) {
        highlight2Ctx.globalCompositeOperation = 'destination-out';
        highlight2Ctx.fillStyle = 'rgba(0,0,0,1)';
        highlight2Ctx.globalAlpha = 1.0;
      }
      break;
  }
  
  annotationCtx.beginPath();
  annotationCtx.arc(x, y, annotationState.brushSize / 2, 0, Math.PI * 2);
  annotationCtx.fill();
  
  // Also erase from highlighter2 canvas if erasing
  if (annotationState.currentTool === 'eraser' && highlight2Ctx) {
    highlight2Ctx.globalCompositeOperation = 'destination-out';
    highlight2Ctx.fillStyle = 'rgba(0,0,0,1)';
    highlight2Ctx.globalAlpha = 1.0;
    highlight2Ctx.beginPath();
    highlight2Ctx.arc(x, y, annotationState.brushSize / 2, 0, Math.PI * 2);
    highlight2Ctx.fill();
  }
}

// Draw a line based on current tool
function drawAnnotationLine(x1, y1, x2, y2) {
  if (!annotationCtx) return;
  
  annotationCtx.lineCap = 'round';
  annotationCtx.lineJoin = 'round';
  annotationCtx.lineWidth = annotationState.brushSize;
  
  switch (annotationState.currentTool) {
    case 'pen':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.strokeStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = 1.0;
      break;
    case 'highlighter':
      // Use mask-based approach for lines: only draw where highlight mask is empty
      if (!highlightMaskCtx) {
        // Fallback if mask not initialized
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.strokeStyle = annotationState.currentColor;
        annotationCtx.globalAlpha = annotationState.opacity / 100;
        break;
      }
      
      // Create temp canvas for the new highlight line
      const lineTempCanvas = document.createElement('canvas');
      lineTempCanvas.width = annotationCanvas.width;
      lineTempCanvas.height = annotationCanvas.height;
      const lineTempCtx = lineTempCanvas.getContext('2d');
      
      // Draw highlight line to temp at full opacity
      lineTempCtx.globalCompositeOperation = 'source-over';
      lineTempCtx.strokeStyle = annotationState.currentColor;
      lineTempCtx.globalAlpha = 1.0;
      lineTempCtx.lineCap = 'round';
      lineTempCtx.lineJoin = 'round';
      lineTempCtx.lineWidth = annotationState.brushSize;
      lineTempCtx.beginPath();
      lineTempCtx.moveTo(x1, y1);
      lineTempCtx.lineTo(x2, y2);
      lineTempCtx.stroke();
      
      // Use destination-out to erase from temp where highlight mask already has content
      // This ensures we only draw new highlights, not overlapping ones
      lineTempCtx.globalCompositeOperation = 'destination-out';
      lineTempCtx.drawImage(highlightMaskCanvas, 0, 0);
      
      // Update highlight mask FIRST with the new highlight (at full opacity for tracking)
      // This ensures subsequent draws see the updated mask immediately
      highlightMaskCtx.globalCompositeOperation = 'source-over';
      highlightMaskCtx.strokeStyle = annotationState.currentColor;
      highlightMaskCtx.globalAlpha = 1.0;
      highlightMaskCtx.lineCap = 'round';
      highlightMaskCtx.lineJoin = 'round';
      highlightMaskCtx.lineWidth = annotationState.brushSize;
      highlightMaskCtx.beginPath();
      highlightMaskCtx.moveTo(x1, y1);
      highlightMaskCtx.lineTo(x2, y2);
      highlightMaskCtx.stroke();
      
      // Draw the masked highlight to main canvas at selected opacity using source-over
      // This ensures consistent opacity without accumulation
      annotationCtx.save();
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.globalAlpha = annotationState.opacity / 100;
      annotationCtx.drawImage(lineTempCanvas, 0, 0);
      annotationCtx.restore();
      
      return; // Skip the normal stroke below
      break;
    case 'airbrush':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.strokeStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = annotationState.opacity / 100;
      break;
    case 'paintbrush':
      annotationCtx.globalCompositeOperation = 'source-over';
      annotationCtx.strokeStyle = annotationState.currentColor;
      annotationCtx.globalAlpha = 0.85;
      break;
    case 'eraser':
      // Erase from main canvas
      annotationCtx.globalCompositeOperation = 'destination-out';
      annotationCtx.strokeStyle = 'rgba(0,0,0,1)';
      annotationCtx.globalAlpha = 1.0;
      // Also erase from highlighter2 canvas if it exists
      if (highlight2Ctx) {
        highlight2Ctx.globalCompositeOperation = 'destination-out';
        highlight2Ctx.strokeStyle = 'rgba(0,0,0,1)';
        highlight2Ctx.globalAlpha = 1.0;
      }
      break;
  }
  
  annotationCtx.beginPath();
  annotationCtx.moveTo(x1, y1);
  annotationCtx.lineTo(x2, y2);
  annotationCtx.stroke();
  
  // Also erase from highlighter2 canvas if erasing
  if (annotationState.currentTool === 'eraser' && highlight2Ctx) {
    highlight2Ctx.globalCompositeOperation = 'destination-out';
    highlight2Ctx.strokeStyle = 'rgba(0,0,0,1)';
    highlight2Ctx.globalAlpha = 1.0;
    highlight2Ctx.lineCap = 'round';
    highlight2Ctx.lineJoin = 'round';
    highlight2Ctx.lineWidth = annotationState.brushSize;
    highlight2Ctx.beginPath();
    highlight2Ctx.moveTo(x1, y1);
    highlight2Ctx.lineTo(x2, y2);
    highlight2Ctx.stroke();
  }
}

// Save annotation data
function saveAnnotationData() {
  if (!annotationCanvas) return;
  const dataURL = annotationCanvas.toDataURL('image/png');
  const key = `dakboard-annotation-page-${currentPageIndex}`;
  localStorage.setItem(key, dataURL);
  
  // Also save highlight2Canvas strokes if they exist
  if (highlightStrokes && highlightStrokes.length > 0) {
    const highlight2Key = `dakboard-annotation-highlight2-page-${currentPageIndex}`;
    localStorage.setItem(highlight2Key, JSON.stringify(highlightStrokes));
  }
}

// Load annotation data
function loadAnnotationData() {
  if (!annotationCanvas || !annotationCtx) return;
  
  const key = `dakboard-annotation-page-${currentPageIndex}`;
  const saved = localStorage.getItem(key);
  
  if (saved) {
    const img = new Image();
    img.onload = () => {
      annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
      annotationCtx.drawImage(img, 0, 0);
    };
    img.src = saved;
  } else {
    annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  }
  
  // Also load highlight2Canvas strokes if they exist
  const highlight2Key = `dakboard-annotation-highlight2-page-${currentPageIndex}`;
  const highlight2Saved = localStorage.getItem(highlight2Key);
  if (highlight2Saved) {
    try {
      highlightStrokes = JSON.parse(highlight2Saved);
      drawAllHighlightStrokes();
    } catch (e) {
      console.error('Error loading highlight2 strokes:', e);
      highlightStrokes = [];
    }
  } else {
    highlightStrokes = [];
    if (highlight2Ctx) {
      highlight2Ctx.clearRect(0, 0, highlight2Canvas.width, highlight2Canvas.height);
    }
  }
}

// Clear annotations
function clearAnnotations() {
  // Also clear the highlight mask
  if (highlightMaskCtx) {
    highlightMaskCtx.clearRect(0, 0, highlightMaskCanvas.width, highlightMaskCanvas.height);
  }
  // Clear stroke-based highlights
  highlightStrokes = [];
  currentHighlightStroke = null;
  if (highlight2Ctx) {
    highlight2Ctx.clearRect(0, 0, highlight2Canvas.width, highlight2Canvas.height);
  }
  if (!annotationCanvas || !annotationCtx) return;
  annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  const key = `dakboard-annotation-page-${currentPageIndex}`;
  localStorage.removeItem(key);
  const highlight2Key = `dakboard-annotation-highlight2-page-${currentPageIndex}`;
  localStorage.removeItem(highlight2Key);
}

// Get annotation visibility for current page
function getAnnotationVisibility(pageIndex) {
  const key = `dakboard-annotation-visibility-page-${pageIndex}`;
  const saved = localStorage.getItem(key);
  return saved !== null ? saved === 'true' : true; // Default to visible
}

// Set annotation visibility for current page
function setAnnotationVisibility(pageIndex, isVisible) {
  const key = `dakboard-annotation-visibility-page-${pageIndex}`;
  localStorage.setItem(key, isVisible.toString());
}

// Load annotation visibility for current page
function loadAnnotationVisibility() {
  annotationState.isVisible = getAnnotationVisibility(currentPageIndex);
  updateAnnotationVisibilityUI();
}

// Update annotation visibility UI
function updateAnnotationVisibilityUI() {
  const isVisible = annotationState.isVisible;
  
  // Update canvas visibility
  if (annotationCanvas) {
    annotationCanvas.style.opacity = isVisible ? '1' : '0';
  }
  if (highlight2Canvas) {
    highlight2Canvas.style.opacity = isVisible ? '1' : '0';
  }
  
  // Update eye icon color (green when visible, red when hidden)
  const toggleBtn = document.getElementById('annotation-toggle-visibility');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg');
    if (svg) {
      svg.style.stroke = isVisible ? '#28a745' : '#dc3545'; // Green when visible, red when hidden
    }
  }
  
  // Disable/enable clear button based on visibility
  const clearBtn = document.getElementById('annotation-clear');
  if (clearBtn) {
    clearBtn.disabled = !isVisible;
    clearBtn.style.opacity = isVisible ? '1' : '0.5';
    clearBtn.style.cursor = isVisible ? 'pointer' : 'not-allowed';
  }
}

// Toggle annotation visibility
function toggleAnnotationVisibility() {
  annotationState.isVisible = !annotationState.isVisible;
  setAnnotationVisibility(currentPageIndex, annotationState.isVisible);
  updateAnnotationVisibilityUI();
}

// Draw all highlight strokes (for highlighter2)
function drawAllHighlightStrokes() {
  if (!highlight2Ctx) return;
  
  // Clear only the highlighter2 canvas
  highlight2Ctx.clearRect(0, 0, highlight2Canvas.width, highlight2Canvas.height);
  
  highlight2Ctx.lineCap = 'round';
  highlight2Ctx.lineJoin = 'round';
  highlight2Ctx.lineWidth = annotationState.brushSize;
  highlight2Ctx.globalCompositeOperation = 'source-over';
  
  for (const stroke of highlightStrokes) {
    if (stroke.points.length < 2) continue;
    
    // Convert opacity percentage to hex alpha
    const alphaHex = Math.round((stroke.opacity / 100) * 255).toString(16).padStart(2, '0');
    highlight2Ctx.strokeStyle = `${stroke.color}${alphaHex}`;
    
    highlight2Ctx.beginPath();
    highlight2Ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      highlight2Ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    highlight2Ctx.stroke();
  }
}

// Update toolbar UI
function updateAnnotationToolbar() {
  // Update tool buttons
  document.querySelectorAll('.annotation-tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === annotationState.currentTool);
  });
  
  // Update color picker
  const colorPicker = document.getElementById('annotation-color');
  const colorText = document.getElementById('annotation-color-text');
  if (colorPicker) colorPicker.value = annotationState.currentColor;
  if (colorText) colorText.value = annotationState.currentColor;
  
  // Update brush size
  const brushSize = document.getElementById('annotation-brush-size');
  const brushSizeValue = document.getElementById('annotation-brush-size-value');
  if (brushSize) brushSize.value = annotationState.brushSize;
  if (brushSizeValue) brushSizeValue.textContent = annotationState.brushSize + 'px';
  
  // Update opacity
  const opacitySlider = document.getElementById('annotation-opacity');
  const opacityValue = document.getElementById('annotation-opacity-value');
  if (opacitySlider) opacitySlider.value = annotationState.opacity;
  if (opacityValue) opacityValue.textContent = annotationState.opacity + '%';
}

// Initialize annotation event listeners
function initializeAnnotationListeners() {
  // Annotate toggle button
  const annotateToggle = document.getElementById('annotate-mode-toggle');
  if (annotateToggle) {
    annotateToggle.addEventListener('click', () => {
      setAnnotationMode(!isAnnotationMode);
    });
  }
  
  // Tool buttons
  document.querySelectorAll('.annotation-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      annotationState.currentTool = btn.dataset.tool;
      updateAnnotationToolbar();
    });
  });
  
  // Color picker
  const colorPicker = document.getElementById('annotation-color');
  const colorText = document.getElementById('annotation-color-text');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      annotationState.currentColor = e.target.value;
      if (colorText) colorText.value = e.target.value;
      // Save to localStorage
      localStorage.setItem('dakboard-annotation-color', e.target.value);
    });
  }
  if (colorText) {
    colorText.addEventListener('input', (e) => {
      const value = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(value)) {
        annotationState.currentColor = value;
        if (colorPicker) colorPicker.value = value;
        // Save to localStorage
        localStorage.setItem('dakboard-annotation-color', value);
      }
    });
  }
  
  // Brush size
  const brushSize = document.getElementById('annotation-brush-size');
  const brushSizeValue = document.getElementById('annotation-brush-size-value');
  if (brushSize) {
    brushSize.addEventListener('input', (e) => {
      annotationState.brushSize = parseInt(e.target.value);
      if (brushSizeValue) brushSizeValue.textContent = annotationState.brushSize + 'px';
      // Save to localStorage
      localStorage.setItem('dakboard-annotation-brush-size', annotationState.brushSize.toString());
    });
  }
  
  // Opacity slider
  const opacitySlider = document.getElementById('annotation-opacity');
  const opacityValue = document.getElementById('annotation-opacity-value');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      annotationState.opacity = parseInt(e.target.value);
      if (opacityValue) opacityValue.textContent = annotationState.opacity + '%';
      // Save to localStorage
      localStorage.setItem('dakboard-annotation-opacity', annotationState.opacity.toString());
    });
  }
  
  // Clear button
  const clearBtn = document.getElementById('annotation-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all annotations on this page?')) {
        clearAnnotations();
      }
    });
  }
  
  // Toggle visibility
  const toggleVisibilityBtn = document.getElementById('annotation-toggle-visibility');
  if (toggleVisibilityBtn) {
    toggleVisibilityBtn.addEventListener('click', toggleAnnotationVisibility);
  }
  
  // Close button
  const closeBtn = document.getElementById('annotation-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setAnnotationMode(false);
    });
  }
  
  // ESC key to exit annotation mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isAnnotationMode) {
      setAnnotationMode(false);
    }
  });
}

// Widget Visibility Management
const WIDGET_CONFIG = {
  'calendar-widget': { name: 'Calendar', icon: '📅' },
  'agenda-widget': { name: 'Agenda', icon: '📋' },
  'weather-widget': { name: 'Weather', icon: '🌤️' },
  'todo-widget': { name: 'Todo List', icon: '✅' },
  'garage-widget': { name: 'Garage Doors', icon: '🚗' },
  'alarm-widget': { name: 'Alarm Panel', icon: '🔒' },
  'compressor-widget': { name: 'Air Compressor', icon: '🌬️' },
  'dice-widget': { name: 'Dice', icon: '🎲' },
  'stopwatch-widget': { name: 'Stopwatch', icon: '⏱️' },
  'scoreboard-widget': { name: 'Scoreboard', icon: '🏆' },
  'blank-widget': { name: 'Blank', icon: '⬜' },
  'clock-widget': { name: 'Clock', icon: '🕐' },
  'thermostat-widget': { name: 'Thermostat', icon: '🌡️' },
  'news-widget': { name: 'News', icon: '📰' },
  'whiteboard-widget': { name: 'Whiteboard', icon: '🖊️' },
  'stoplight-widget': { name: 'Stoplight', icon: '🚦' },
  'tasks-widget': { name: 'Tasks', icon: '✅' }
};

// Widget Instance Management Functions
// Widget IDs now follow format: {widgetType}-page-{pageIndex}-instance-{instanceIndex}
// Example: dice-widget-page-0-instance-0, dice-widget-page-0-instance-1

// Parse widget instance ID into components
function parseWidgetId(fullWidgetId) {
  // Handle legacy format (just widgetType) for backward compatibility
  if (!fullWidgetId.includes('-page-') || !fullWidgetId.includes('-instance-')) {
    return {
      widgetType: fullWidgetId,
      pageIndex: currentPageIndex,
      instanceIndex: 0,
      isLegacy: true
    };
  }
  
  const parts = fullWidgetId.split('-page-');
  if (parts.length !== 2) {
    return { widgetType: fullWidgetId, pageIndex: currentPageIndex, instanceIndex: 0, isLegacy: true };
  }
  
  const widgetType = parts[0];
  const rest = parts[1];
  const instanceParts = rest.split('-instance-');
  
  if (instanceParts.length !== 2) {
    return { widgetType: fullWidgetId, pageIndex: currentPageIndex, instanceIndex: 0, isLegacy: true };
  }
  
  return {
    widgetType: widgetType,
    pageIndex: parseInt(instanceParts[0]) || currentPageIndex,
    instanceIndex: parseInt(instanceParts[1]) || 0,
    isLegacy: false
  };
}

// Generate widget instance ID
function generateWidgetId(widgetType, pageIndex, instanceIndex) {
  return `${widgetType}-page-${pageIndex}-instance-${instanceIndex}`;
}

// Get widget type from full widget ID
function getWidgetType(fullWidgetId) {
  const parsed = parseWidgetId(fullWidgetId);
  return parsed.widgetType;
}

// Get all widget instances for a specific widget type on a page
function getWidgetInstances(widgetType, pageIndex) {
  const pageElement = getPageElement(pageIndex);
  if (!pageElement) return [];
  
  // Find all widgets of this type on the page
  const widgets = Array.from(pageElement.querySelectorAll(`.${widgetType}`));
  const instances = [];
  
  widgets.forEach(widget => {
    // Get instance index from widget's class list
    const classes = Array.from(widget.classList);
    // Look for class that matches the instance ID pattern
    const instanceClass = classes.find(c => {
      // Check if it matches the pattern: widgetType-page-X-instance-Y
      const pattern = new RegExp(`^${widgetType}-page-${pageIndex}-instance-\\d+$`);
      return pattern.test(c);
    });
    
    if (instanceClass) {
      const parsed = parseWidgetId(instanceClass);
      instances.push({
        fullId: instanceClass,
        instanceIndex: parsed.instanceIndex,
        element: widget
      });
    } else {
      // Legacy widget or widget without instance ID - treat as instance-0
      // Check if this widget already has an instance-0 ID
      const existingInstance0 = instances.find(i => i.instanceIndex === 0);
      if (!existingInstance0) {
        instances.push({
          fullId: generateWidgetId(widgetType, pageIndex, 0),
          instanceIndex: 0,
          element: widget
        });
        // Update widget's class to include the full ID
        widget.classList.add(generateWidgetId(widgetType, pageIndex, 0));
      }
    }
  });
  
  return instances.sort((a, b) => a.instanceIndex - b.instanceIndex);
}

// Get next available instance index for a widget type on a page
function getNextInstanceIndex(widgetType, pageIndex) {
  const instances = getWidgetInstances(widgetType, pageIndex);
  if (instances.length === 0) return 0;
  
  const maxIndex = Math.max(...instances.map(i => i.instanceIndex));
  return maxIndex + 1;
}

// Get widget's configured title (from localStorage)
function getWidgetTitle(fullWidgetId) {
  const parsed = parseWidgetId(fullWidgetId);
  // Storage key: fullWidgetId already includes page index, so don't add it again
  const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
  const savedStyles = localStorage.getItem(stylesKey);
  
  if (savedStyles) {
    try {
      const styles = JSON.parse(savedStyles);
      if (styles.titleText && styles.titleText.trim()) {
        return styles.titleText.trim();
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Return default name from WIDGET_CONFIG
  const config = WIDGET_CONFIG[parsed.widgetType];
  return config ? config.name : parsed.widgetType;
}

// Load widget visibility state from localStorage (page-specific)
function loadWidgetVisibility() {
  try {
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) {
      console.error(`loadWidgetVisibility: Page element not found for page ${currentPageIndex}`);
      return;
    }
    
    const visibilityKey = `dakboard-widget-visibility-page-${currentPageIndex}`;
    const saved = localStorage.getItem(visibilityKey);
    const visibility = saved ? JSON.parse(saved) : {};
    
    // Process all widget types in WIDGET_CONFIG
    Object.keys(WIDGET_CONFIG).forEach(widgetType => {
      // Get all instances of this widget type on the current page
      const instances = getWidgetInstances(widgetType, currentPageIndex);
      
      // Process each instance
      instances.forEach(instance => {
        const fullWidgetId = instance.fullId;
        const widget = instance.element;
        
        // Check visibility for this specific instance
        const instanceVisibility = visibility[fullWidgetId];
        
        if (widget) {
          if (instanceVisibility === false) {
            widget.classList.add('hidden');
          } else if (instanceVisibility === true) {
            widget.classList.remove('hidden');
          } else {
            // If visibility not set for this instance, check legacy format
            const legacyVisibility = visibility[widgetType];
            if (legacyVisibility === false) {
              widget.classList.add('hidden');
            } else if (legacyVisibility === true) {
              widget.classList.remove('hidden');
            } else {
              // Default: hide if not explicitly shown
              widget.classList.add('hidden');
            }
          }
        }
      });
      
      // Legacy support: if no instances exist but visibility is set for widget type, create instance-0
      if (instances.length === 0 && visibility[widgetType] === true) {
        // Find the widget template (usually on page 0)
        const templateWidget = document.querySelector(`.${widgetType}`);
        if (templateWidget) {
          // Create instance-0
          const fullWidgetId = generateWidgetId(widgetType, currentPageIndex, 0);
          const widget = templateWidget.cloneNode(true);
          widget.className = `widget ${widgetType} ${fullWidgetId}`;
          widget.classList.remove('hidden');
          pageElement.appendChild(widget);
          
          // Initialize widget-specific functionality if needed
          if (typeof initializeDragAndResize === 'function') {
            setTimeout(() => {
              initializeDragAndResize();
            }, 100);
          }
        }
      }
      
      // Also check for instance-specific visibility entries that don't have corresponding DOM elements
      // This handles widgets that were created on pages 2+ but don't exist in DOM yet
      Object.keys(visibility).forEach(fullWidgetId => {
        // Check if this is an instance ID for this widget type and page
        const parsed = parseWidgetId(fullWidgetId);
        if (parsed.widgetType === widgetType && parsed.pageIndex === currentPageIndex && visibility[fullWidgetId] === true) {
          // Check if widget already exists
          const existingWidget = pageElement.querySelector(`.${fullWidgetId}`);
          if (!existingWidget) {
            // Widget should exist but doesn't - create it from template
            const templateWidget = document.querySelector(`.${widgetType}`);
            if (templateWidget) {
              const widget = templateWidget.cloneNode(true);
              widget.className = `widget ${widgetType} ${fullWidgetId}`;
              widget.classList.remove('hidden');
              pageElement.appendChild(widget);
              
              // Initialize widget
              initializeWidgetInstance(fullWidgetId, widget);
              
              // Initialize widget-specific functionality if needed
              if (typeof initializeDragAndResize === 'function') {
                setTimeout(() => {
                  initializeDragAndResize();
                }, 100);
              }
            }
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading widget visibility:', error);
  }
}

// Save widget visibility state to localStorage (page-specific)
function saveWidgetVisibility() {
  try {
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const visibility = {};
    
    // Process all widget types
    Object.keys(WIDGET_CONFIG).forEach(widgetType => {
      // Get all instances of this widget type on the current page
      const instances = getWidgetInstances(widgetType, currentPageIndex);
      
      // Save visibility for each instance
      instances.forEach(instance => {
        const fullWidgetId = instance.fullId;
        const widget = instance.element;
        if (widget) {
          visibility[fullWidgetId] = !widget.classList.contains('hidden');
        }
      });
    });
    
    const visibilityKey = `dakboard-widget-visibility-page-${currentPageIndex}`;
    localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  } catch (error) {
    console.error('Error saving widget visibility:', error);
  }
}

// Toggle widget visibility (page-specific)
function toggleWidgetVisibility(fullWidgetId) {
  const parsed = parseWidgetId(fullWidgetId);
  const widgetType = parsed.widgetType;
  const pageIndex = parsed.pageIndex;
  const instanceIndex = parsed.instanceIndex;
  
  const pageElement = getPageElement(pageIndex);
  if (!pageElement) {
    console.error(`Page element not found for page ${pageIndex}`);
    return;
  }
  
  // Find widget on current page using full ID (including hidden widgets)
  // querySelector finds hidden elements too, so this should work
  let widget = pageElement.querySelector(`.${fullWidgetId}`);
  
  // If not found by full ID, try to find by widget type and instance index
  if (!widget) {
    // Get all widgets of this type on the page
    const allWidgets = Array.from(pageElement.querySelectorAll(`.${widgetType}`));
    
    // Try to find the one with matching instance index
    for (const w of allWidgets) {
      const classes = Array.from(w.classList);
      const instanceClass = classes.find(c => {
        const pattern = new RegExp(`^${widgetType}-page-${pageIndex}-instance-${instanceIndex}$`);
        return pattern.test(c);
      });
      
      if (instanceClass) {
        widget = w;
        break;
      }
    }
    
    // If still not found and instanceIndex is 0, try legacy format
    if (!widget && instanceIndex === 0) {
      widget = pageElement.querySelector(`.${widgetType}`);
      if (widget) {
        // Check if this widget already has an instance ID
        const classes = Array.from(widget.classList);
        const hasInstanceId = classes.some(c => {
          const pattern = new RegExp(`^${widgetType}-page-${pageIndex}-instance-\\d+$`);
          return pattern.test(c);
        });
        
        // Only use it if it doesn't have an instance ID yet
        if (!hasInstanceId) {
          // Update widget to use new ID format, but preserve 'widget' class
          widget.className = `widget ${widgetType} ${fullWidgetId}`;
        } else {
          // This widget already has a different instance ID, don't use it
          widget = null;
        }
      }
    }
  }
  
  let widgetJustCreated = false;
  // If widget doesn't exist on current page, create it
  if (!widget) {
    // Find the widget template (usually on page 0 or in the original HTML)
    // Look for a template on page 0 first
    const page0 = getPageElement(0);
    let templateWidget = page0 ? page0.querySelector(`.${widgetType}`) : null;
    
    // If not found on page 0, search all pages
    if (!templateWidget) {
      templateWidget = document.querySelector(`.${widgetType}`);
    }
    
    if (templateWidget) {
      // Clone the widget to the current page
      widget = templateWidget.cloneNode(true);
      // Set the full ID as a class, but preserve the 'widget' class
      widget.className = `widget ${widgetType} ${fullWidgetId}`;
      // Mark as hidden initially so it will be shown below
      widget.classList.add('hidden');
      widgetJustCreated = true;
      pageElement.appendChild(widget);
      
      // Set initial z-index to bring new widget to front
      const maxZIndex = Math.max(...Array.from(document.querySelectorAll('.widget:not(.hidden)')).map(w => {
        const z = parseInt(window.getComputedStyle(w).zIndex) || 1;
        return isNaN(z) ? 1 : z;
      }), 1);
      widget.style.zIndex = (maxZIndex + 1).toString();
      
      // Initialize widget-specific functionality if needed
      if (typeof initializeDragAndResize === 'function') {
        // Reinitialize drag/resize for the new widget
        setTimeout(() => {
          initializeDragAndResize();
        }, 100);
      }
    } else {
      console.error(`Widget template ${widgetType} not found`);
      return;
    }
  }
  
  if (widget) {
    // Ensure widget has the correct class
    if (!widget.classList.contains(fullWidgetId)) {
      widget.classList.add(fullWidgetId);
    }
    
    // Ensure widget has the widget class
    if (!widget.classList.contains('widget')) {
      widget.classList.add('widget');
    }
    
    // Toggle visibility - if it's hidden, show it; if it's visible, hide it
    // If widget was just created, treat it as hidden so it gets shown
    const isCurrentlyHidden = widget.classList.contains('hidden') || widgetJustCreated;
    
    if (isCurrentlyHidden) {
      widget.classList.remove('hidden');
      
      // Save visibility state IMMEDIATELY to prevent loadWidgetVisibility from hiding it again
      saveWidgetVisibility();
      
      // Bring widget to front when shown (set high z-index)
      const maxZIndex = Math.max(...Array.from(document.querySelectorAll('.widget:not(.hidden)')).map(w => {
        const z = parseInt(window.getComputedStyle(w).zIndex) || 1;
        return isNaN(z) ? 1 : z;
      }), 1);
      widget.style.zIndex = (maxZIndex + 1).toString();
      
      // Initialize widget instance
      initializeWidgetInstance(fullWidgetId, widget);
      
      // Load widget-specific data and styles
      loadWidgetStyles(fullWidgetId);
      
      // Load widget-specific functionality based on type
      if (widgetType === 'dice-widget') {
        loadDice();
      } else if (widgetType === 'stopwatch-widget') {
        loadStopwatch();
      } else if (widgetType === 'scoreboard-widget') {
        loadScoreboard();
      } else if (widgetType === 'clip-art-widget') {
        loadClipArt();
      } else if (widgetType === 'stoplight-widget') {
        loadStoplight();
      } else if (widgetType === 'weather-widget') {
        loadWeather();
      } else if (widgetType === 'todos-widget') {
        loadTodos();
      } else if (widgetType === 'garage-doors-widget') {
        loadGarageDoors();
      } else if (widgetType === 'alarm-widget') {
        loadAlarm();
      } else if (widgetType === 'thermostat-widget') {
        loadThermostat();
      } else if (widgetType === 'compressor-widget') {
        loadCompressor();
      } else if (widgetType === 'news-widget') {
        loadNews();
      } else if (widgetType === 'calendar-widget') {
        loadCalendarEvents();
      } else if (widgetType === 'agenda-widget') {
        loadAgenda();
      } else if (widgetType === 'blank-widget') {
        // Blank widget doesn't need special loading
      }
    } else {
      widget.classList.add('hidden');
      
      // Save visibility state IMMEDIATELY
      saveWidgetVisibility();
    }
    
    // Update panel after a brief delay to ensure DOM is updated
    setTimeout(() => {
      updateWidgetControlPanel();
    }, 10);
  } else {
    console.error(`Widget ${fullWidgetId} not found and could not be created`);
  }
}

// Edit mode state
let isEditMode = false;

// Initialize widget control panel
function initializeWidgetControlPanel() {
  const toggleBtn = document.getElementById('widget-control-toggle');
  const panel = document.getElementById('widget-control-panel');
  const closeBtn = document.getElementById('close-widget-panel');
  
  // Edit mode toggle is now in the bottom controls, initialize it separately
  const editModeToggle = document.getElementById('edit-layout-toggle');
  
  if (!toggleBtn || !panel) {
    console.error('Widget control panel elements not found');
    return;
  }
  
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      updateWidgetControlPanel();
    }
  });
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.remove('open');
    });
  }
  
  // Initialize config export/import
  initializeConfigExportImport();
  
  // Edit mode toggle (now in bottom controls)
  if (editModeToggle) {
    editModeToggle.addEventListener('change', (e) => {
      setEditMode(e.target.checked);
    });
    // Load saved edit mode state for current page
    const editModeKey = `dakboard-edit-mode-page-${currentPageIndex}`;
    const savedEditMode = localStorage.getItem(editModeKey) === 'true';
    editModeToggle.checked = savedEditMode;
    setEditMode(savedEditMode);
  }
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (panel && panel.classList.contains('open') && 
        !panel.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
  
  // Prevent panel clicks from closing it
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  updateWidgetControlPanel();
  // Update page list if function exists (it's defined later in the file)
  if (typeof updatePageList === 'function') {
    updatePageList();
  }
  
  // Setup page management after panel is initialized
  // This ensures the button exists in the DOM
  if (typeof setupPageManagement === 'function') {
    setupPageManagement();
  }
}

// Set edit mode on/off (page-specific)
function setEditMode(enabled) {
  isEditMode = enabled;
  
  // Store edit mode per page
  const editModeKey = `dakboard-edit-mode-page-${currentPageIndex}`;
  localStorage.setItem(editModeKey, enabled ? 'true' : 'false');
  
  // Apply to current page only
  const currentPage = getPageElement(currentPageIndex);
  if (currentPage) {
    if (enabled) {
      currentPage.classList.add('edit-mode');
    } else {
      currentPage.classList.remove('edit-mode');
    }
  }
  
  // Disable scrolling in edit mode (only allow drag and resize)
  if (enabled) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // Prevent touch scrolling on mobile
    const pagesContainer = document.getElementById('pages-container');
    if (pagesContainer) {
      pagesContainer.style.overflow = 'hidden';
      pagesContainer.style.touchAction = 'none';
    }
  } else {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    const pagesContainer = document.getElementById('pages-container');
    if (pagesContainer) {
      pagesContainer.style.overflow = '';
      pagesContainer.style.touchAction = '';
    }
  }
  
  // Update whiteboard drawing state
  // Reinitialize whiteboard drawing for all instances when toggling edit mode
  if (typeof initializeWhiteboard === 'function') {
    initializeWhiteboard();
  }
  
  // Toggle watermark visibility
  const watermark = document.getElementById('edit-mode-watermark');
  if (watermark) {
    if (enabled) {
      watermark.classList.add('show');
    } else {
      watermark.classList.remove('show');
    }
  }
  
  // Update all widgets
  const pageElement = getPageElement(currentPageIndex);
  if (pageElement) {
    pageElement.querySelectorAll('.widget').forEach(widget => {
      if (enabled) {
        widget.classList.add('edit-mode-active');
        widget.style.pointerEvents = 'auto'; // Allow dragging
        // Add z-index controls when entering edit mode
        if (typeof addZIndexControls === 'function') {
          addZIndexControls(widget);
        }
      } else {
        widget.classList.remove('edit-mode-active');
        widget.style.pointerEvents = ''; // Reset to default
        // Remove z-index controls when exiting edit mode
        const zIndexControls = widget.querySelector('.widget-zindex-controls');
        if (zIndexControls) {
          zIndexControls.remove();
        }
        // Remove minimal edit headers if they exist (but preserve original headers)
        const minimalHeaders = widget.querySelectorAll('.widget-edit-header');
        minimalHeaders.forEach(minimalHeader => {
          minimalHeader.remove();
        });
      }
    });
  }
  
  // Reinitialize drag/resize when toggling edit mode
  if (typeof initializeDragAndResize === 'function') {
    if (enabled) {
      // When entering edit mode, initialize immediately and also after a short delay
      // This ensures handles appear even if DOM isn't fully ready
      initializeDragAndResize();
      setTimeout(() => {
        initializeDragAndResize();
      }, 100);
      setTimeout(() => {
        initializeDragAndResize();
      }, 300);
    } else {
      // When exiting edit mode, remove all handles immediately
      const pageElement = getPageElement(currentPageIndex);
      if (pageElement) {
        pageElement.querySelectorAll('.resize-handle, .rotate-handle').forEach(handle => handle.remove());
      }
    }
    
    // Reload stoplight widgets to update click handlers based on edit mode
    if (typeof loadStoplight === 'function') {
      loadStoplight();
    }
  } else {
    console.error('initializeDragAndResize function not found!');
  }
}

// Update widget control panel with current widget states
// Set up global click handler for closing move dropdowns (only once)
let moveDropdownClickHandlerSetup = false;

function updateWidgetControlPanel() {
  const list = document.getElementById('widget-control-list');
  if (!list) return;
  
  // Set up global click handler for closing dropdowns (only once)
  if (!moveDropdownClickHandlerSetup) {
    document.addEventListener('click', (e) => {
      // Close all move dropdowns if click is outside any move button or dropdown
      if (!e.target.closest('.widget-control-move-btn') && !e.target.closest('.widget-control-move-dropdown')) {
        document.querySelectorAll('.widget-control-move-dropdown').forEach(dd => {
          dd.style.display = 'none';
        });
      }
    });
    moveDropdownClickHandlerSetup = true;
  }
  
  list.innerHTML = '';
  
  // Add Dashboard Background at the top
  const bgItem = document.createElement('div');
  bgItem.className = 'widget-control-item dashboard-bg-item';
  const bgStyleBtn = document.createElement('button');
  bgStyleBtn.className = 'widget-control-style-btn';
  bgStyleBtn.innerHTML = '🎨';
  bgStyleBtn.title = 'Configure dashboard background';
  bgStyleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Call the background modal function - it should be available globally from styling.js
    if (typeof window.openBackgroundModal === 'function') {
      window.openBackgroundModal();
    } else if (typeof openBackgroundModal === 'function') {
      openBackgroundModal();
    } else {
      console.error('openBackgroundModal function not found');
    }
  });
  bgItem.innerHTML = `
    <div class="widget-control-item-info">
      <span class="widget-control-item-icon">🖼️</span>
      <span class="widget-control-item-name">Background</span>
    </div>
  `;
  bgItem.appendChild(bgStyleBtn);
  list.appendChild(bgItem);
  
  // Add separator
  const separator = document.createElement('div');
  separator.className = 'widget-control-separator';
  list.appendChild(separator);

  // Get all widget instances for each widget type on current page
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  // Collect all widget instances
  const allInstances = [];
  
  Object.keys(WIDGET_CONFIG).forEach(widgetType => {
    const instances = getWidgetInstances(widgetType, currentPageIndex);
    
    // If no instances exist, create a placeholder for the original (instance-0)
    if (instances.length === 0) {
      allInstances.push({
        widgetType: widgetType,
        fullId: generateWidgetId(widgetType, currentPageIndex, 0),
        instanceIndex: 0,
        element: null,
        isPlaceholder: true
      });
    } else {
      instances.forEach(instance => {
        allInstances.push({
          widgetType: widgetType,
          fullId: instance.fullId,
          instanceIndex: instance.instanceIndex,
          element: instance.element,
          isPlaceholder: false
        });
      });
    }
  });
  
  // Sort instances by widget type name, then by instance index
  allInstances.sort((a, b) => {
    const nameA = WIDGET_CONFIG[a.widgetType].name.toLowerCase();
    const nameB = WIDGET_CONFIG[b.widgetType].name.toLowerCase();
    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    }
    return a.instanceIndex - b.instanceIndex;
  });
  
  // Create control panel items for each instance
  allInstances.forEach(instance => {
    const config = WIDGET_CONFIG[instance.widgetType];
    const widget = instance.element;
    const isHidden = !widget || widget.classList.contains('hidden');
    const isClone = instance.instanceIndex > 0;
    
    // Get widget title (configured title or default name)
    const widgetTitle = getWidgetTitle(instance.fullId);
    
    const item = document.createElement('div');
    item.className = `widget-control-item ${isHidden ? 'hidden' : ''}`;
    item.dataset.widgetId = instance.fullId;
    item.dataset.widgetType = instance.widgetType;
    item.dataset.instanceIndex = instance.instanceIndex;
    
    // Toggle button (eye icon)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = `widget-control-toggle-btn ${isHidden ? 'hidden' : ''}`;
    toggleBtn.innerHTML = isHidden ? '👁️' : '👁️‍🗨️';
    toggleBtn.title = isHidden ? 'Show widget' : 'Hide widget';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWidgetVisibility(instance.fullId);
    });
    
    // Style button (edit icon)
    const styleBtn = document.createElement('button');
    styleBtn.className = 'widget-control-style-btn';
    styleBtn.innerHTML = '🎨';
    styleBtn.title = 'Style widget';
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof openStylingModal === 'function') {
        openStylingModal(instance.fullId);
      }
    });
    
    // Clone button (always visible)
    const cloneBtn = document.createElement('button');
    cloneBtn.className = 'widget-control-clone-btn';
    cloneBtn.innerHTML = '📋';
    cloneBtn.title = 'Clone widget';
    cloneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      cloneWidget(instance.fullId);
    });
    
    // Remove button (only for clones)
    let removeBtn = null;
    if (isClone) {
      removeBtn = document.createElement('button');
      removeBtn.className = 'widget-control-remove-btn';
      removeBtn.innerHTML = '🗑️';
      removeBtn.title = 'Remove widget';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeWidgetInstance(instance.fullId);
      });
    }
    
    // Move button (only if more than 1 page exists)
    let moveBtn = null;
    let moveDropdown = null;
    if (totalPages > 1) {
      moveBtn = document.createElement('button');
      moveBtn.className = 'widget-control-move-btn';
      moveBtn.innerHTML = '➡️';
      moveBtn.title = 'Move to page';
      
      // Create dropdown for page selection
      moveDropdown = document.createElement('div');
      moveDropdown.className = 'widget-control-move-dropdown';
      moveDropdown.style.display = 'none';
      
      for (let i = 0; i < totalPages; i++) {
        if (i !== currentPageIndex) {
          const pageOption = document.createElement('button');
          pageOption.className = 'widget-control-move-option';
          // Get page name/description from localStorage
          const pageNameKey = `dakboard-page-name-${i}`;
          const pageName = localStorage.getItem(pageNameKey) || `Page ${i + 1}`;
          // Display as "Page X: Description Y" format
          pageOption.textContent = `Page ${i + 1}: ${pageName}`;
          pageOption.addEventListener('click', (e) => {
            e.stopPropagation();
            moveWidgetToPage(instance.fullId, i);
            moveDropdown.style.display = 'none';
          });
          moveDropdown.appendChild(pageOption);
        }
      }
      
      moveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = moveDropdown.style.display === 'block';
        // Hide all other dropdowns
        document.querySelectorAll('.widget-control-move-dropdown').forEach(dd => {
          dd.style.display = 'none';
        });
        moveDropdown.style.display = isVisible ? 'none' : 'block';
      });
    }
    
    item.innerHTML = `
      <div class="widget-control-item-info">
        <span class="widget-control-item-icon">${config.icon}</span>
        <span class="widget-control-item-name">${widgetTitle}</span>
      </div>
    `;
    item.appendChild(toggleBtn);
    item.appendChild(styleBtn);
    item.appendChild(cloneBtn);
    if (removeBtn) item.appendChild(removeBtn);
    if (moveBtn) {
      item.appendChild(moveBtn);
      // Append dropdown AFTER innerHTML is set and after moveBtn is appended
      if (moveDropdown) {
        item.appendChild(moveDropdown);
      }
    }
    
    list.appendChild(item);
  });
}

// Clone widget instance (creates a new instance with copied configuration)
function cloneWidget(fullWidgetId) {
  const parsed = parseWidgetId(fullWidgetId);
  const widgetType = parsed.widgetType;
  const pageIndex = parsed.pageIndex;
  
  // Get next available instance index
  const newInstanceIndex = getNextInstanceIndex(widgetType, pageIndex);
  const newFullId = generateWidgetId(widgetType, pageIndex, newInstanceIndex);
  
  // Check instance limit (soft limit of 10)
  if (newInstanceIndex >= 10) {
    if (!confirm(`You already have ${newInstanceIndex} instances of this widget. Create another?`)) {
      return;
    }
  }
  
  const pageElement = getPageElement(pageIndex);
  if (!pageElement) return;
  
  // Find the source widget (the one being cloned) using the fullWidgetId
  // Use getWidgetInstances to reliably find the widget by its fullId - this is the correct way
  let sourceWidget = null;
  const instances = getWidgetInstances(widgetType, pageIndex);
  const matchingInstance = instances.find(inst => inst.fullId === fullWidgetId);
  
  if (matchingInstance && matchingInstance.element) {
    sourceWidget = matchingInstance.element;
  } else {
    // Fallback: Try direct class selector
    sourceWidget = pageElement.querySelector(`.${fullWidgetId}`);
    if (!sourceWidget) {
      // Last resort: Find by widget type and check class list
      const allWidgets = pageElement.querySelectorAll(`.${widgetType}`);
      sourceWidget = Array.from(allWidgets).find(w => w.classList.contains(fullWidgetId));
    }
  }
  
  if (!sourceWidget) {
    console.error(`Could not find source widget with ID: ${fullWidgetId}. Available instances:`, instances.map(i => i.fullId));
    // If original doesn't exist, create it first
    const templateWidget = document.querySelector(`.${widgetType}`);
    if (!templateWidget) {
      console.error(`Widget template ${widgetType} not found`);
      return;
    }
    // Create original first, then clone
    const original = templateWidget.cloneNode(true);
    original.classList.add('hidden');
    const originalId = generateWidgetId(widgetType, pageIndex, 0);
    original.className = `${widgetType} ${originalId} hidden`;
    pageElement.appendChild(original);
    // Now clone the original
    const cloned = original.cloneNode(true);
    cloned.className = `${widgetType} ${newFullId}`;
    
    // Clear drag listener flag - cloned widgets need drag listeners re-attached
    // This prevents the cloned widget from being skipped during drag initialization
    delete cloned.dataset.dragListenerAdded;
    
    // For whiteboard widgets, remove any temporary header state from the clone
    if (widgetType === 'whiteboard-widget') {
      const clonedHeader = cloned.querySelector('.widget-header');
      if (clonedHeader) {
        clonedHeader.classList.remove('whiteboard-header-temporary');
        clonedHeader.style.display = ''; // Reset display to default
        // Ensure no inline position styles that might interfere
        if (cloned.style.position === 'relative') {
          cloned.style.position = '';
        }
      }
    }
    
    // Always make cloned widgets visible by default (eye icon selected)
    cloned.classList.remove('hidden');
    
    // Get source widget position and rotation
    // Use style values for accurate position (not affected by rotation)
    // Default to (50, 50) for newly created originals
    let sourceLeft = parseFloat(original.style.left);
    let sourceTop = parseFloat(original.style.top);
    
    // Default to 50, 50 if not set (for newly created widgets)
    if (isNaN(sourceLeft)) sourceLeft = 50;
    if (isNaN(sourceTop)) sourceTop = 50;
    
    const sourceWidth = parseFloat(original.style.width) || original.offsetWidth || 300;
    const sourceHeight = parseFloat(original.style.height) || original.offsetHeight || 200;
    
    // Get rotation from source widget (from data-rotation attribute or parse from transform)
    let sourceRotation = 0;
    const rotationAttr = original.getAttribute('data-rotation');
    if (rotationAttr) {
      sourceRotation = parseFloat(rotationAttr) || 0;
    } else {
      // Try to parse from transform style
      const transform = original.style.transform || window.getComputedStyle(original).transform;
      if (transform && transform.includes('rotate')) {
        const match = transform.match(/rotate\(([^)]+)\)/);
        if (match) {
          const rotationValue = match[1].replace('deg', '').trim();
          sourceRotation = parseFloat(rotationValue) || 0;
        }
      }
    }
    
    // Offset position to the right and down (offset by widget width/4 and height/4 for better visibility)
    const offsetX = Math.max(80, sourceWidth * 0.3); // At least 80px or 30% of width
    const offsetY = Math.max(80, sourceHeight * 0.3); // At least 80px or 30% of height
    cloned.style.left = (sourceLeft + offsetX) + 'px';
    cloned.style.top = (sourceTop + offsetY) + 'px';
    cloned.style.width = sourceWidth + 'px';
    cloned.style.height = sourceHeight + 'px';
    
    // Apply same rotation as source widget
    if (sourceRotation !== 0) {
      cloned.style.transform = `rotate(${sourceRotation}deg)`;
      cloned.setAttribute('data-rotation', sourceRotation);
    }
    
    pageElement.appendChild(cloned);
    
    // Copy configuration from original (if it exists)
    copyWidgetConfiguration(originalId, newFullId, pageIndex);
    
    // Initialize the cloned widget
    initializeWidgetInstance(newFullId, cloned);
    
    // Explicitly save visibility for the new widget as visible
    // Do this before applying styles to ensure it's saved correctly
    const visibilityKey = `dakboard-widget-visibility-page-${pageIndex}`;
    const savedVisibility = localStorage.getItem(visibilityKey);
    const visibility = savedVisibility ? JSON.parse(savedVisibility) : {};
    visibility[newFullId] = true; // Always visible by default
    localStorage.setItem(visibilityKey, JSON.stringify(visibility));
    
    // Load and apply styles immediately so the cloned widget displays correctly
    // This ensures title visibility and other styling matches the configuration
    if (typeof loadWidgetStyles === 'function' && typeof applyCurrentStylesToWidget === 'function') {
      loadWidgetStyles(newFullId);
      // Apply styles to the cloned widget immediately
      applyCurrentStylesToWidget(cloned);
    }
    
    // Force widget to be visible - ensure it's not hidden by any operations
    cloned.classList.remove('hidden');
    cloned.style.display = ''; // Ensure display is not set to none
    
    // Save visibility state again to ensure it's persisted
    saveWidgetVisibility();
    
    // Save layout (position, size, rotation) for the cloned widget
    if (typeof saveCurrentPageLayout === 'function') {
      saveCurrentPageLayout();
    } else if (typeof saveWidgetLayout === 'function') {
      saveWidgetLayout();
    }
    
    // Update control panel
    updateWidgetControlPanel();
    
    // Initialize drag/resize for the cloned widget with a delay to ensure everything is ready
    setTimeout(() => {
      // Force widget visible again just before initializing drag/resize
      cloned.classList.remove('hidden');
      cloned.style.display = '';
      
      // Try multiple ways to access the function in case of timing issues
      let initFunction = null;
      if (typeof window !== 'undefined' && typeof window.initializeWidgetDragAndResize === 'function') {
        initFunction = window.initializeWidgetDragAndResize;
      } else if (typeof initializeWidgetDragAndResize === 'function') {
        initFunction = initializeWidgetDragAndResize;
      }
      
      if (initFunction) {
        initFunction(cloned);
      } else if (typeof initializeDragAndResize === 'function') {
        // Fallback to full reinitialization
        initializeDragAndResize();
      } else {
        // Last resort: try again after a longer delay
        setTimeout(() => {
          if (typeof initializeDragAndResize === 'function') {
            initializeDragAndResize();
          }
        }, 200);
      }
    }, 150);
    
    return; // Exit early after creating original and cloning it
  }
  
  // Clone the widget element (this path executes when sourceWidget was found)
  const cloned = sourceWidget.cloneNode(true);
  
  // Update the cloned widget's classes: remove old instance ID, add new one
  // Preserve all other classes (widget, widgetType, etc.)
  cloned.classList.remove(fullWidgetId);
  cloned.classList.add(newFullId);
  
  // Ensure widget and widgetType classes are present (they should be from clone, but verify)
  if (!cloned.classList.contains('widget')) {
    cloned.classList.add('widget');
  }
  if (!cloned.classList.contains(widgetType)) {
    cloned.classList.add(widgetType);
  }
  
  // Clear drag listener flag - cloned widgets need drag listeners re-attached
  // This prevents the cloned widget from being skipped during drag initialization
  delete cloned.dataset.dragListenerAdded;
  
  // For whiteboard widgets, remove any temporary header state from the clone
  if (widgetType === 'whiteboard-widget') {
    const clonedHeader = cloned.querySelector('.widget-header');
    if (clonedHeader) {
      clonedHeader.classList.remove('whiteboard-header-temporary');
      clonedHeader.style.display = ''; // Reset display to default
      // Ensure no inline position styles that might interfere
      if (cloned.style.position === 'relative') {
        cloned.style.position = '';
      }
    }
  }
  
  // Always make cloned widgets visible by default (eye icon selected)
  cloned.classList.remove('hidden');
  
  // Get source widget position and rotation
  // Use style values for accurate position (not affected by rotation)
  // If style values aren't set, try to get from saved layout or use bounding rect
  let sourceLeft = parseFloat(sourceWidget.style.left);
  let sourceTop = parseFloat(sourceWidget.style.top);
  
  // If position isn't in inline styles, try to get from saved layout
  if (isNaN(sourceLeft) || isNaN(sourceTop)) {
    const layoutKey = `dakboard-widget-layout-page-${pageIndex}`;
    const savedLayout = localStorage.getItem(layoutKey);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        const sourceLayout = layout[fullWidgetId];
        if (sourceLayout) {
          sourceLeft = sourceLayout.x || 0;
          sourceTop = sourceLayout.y || 0;
        }
      } catch (e) {
        // Error parsing saved layout - will fall back to bounding rect
      }
    }
    
    // If still not found, use bounding rect relative to dashboard
    if (isNaN(sourceLeft) || isNaN(sourceTop)) {
      const widgetRect = sourceWidget.getBoundingClientRect();
      const dashboardRect = pageElement.getBoundingClientRect();
      sourceLeft = widgetRect.left - dashboardRect.left;
      sourceTop = widgetRect.top - dashboardRect.top;
    }
  }
  
  // Default to 0 only if still NaN (0 is a valid position, so don't override it)
  if (isNaN(sourceLeft)) sourceLeft = 0;
  if (isNaN(sourceTop)) sourceTop = 0;
  
  const sourceWidth = parseFloat(sourceWidget.style.width) || sourceWidget.offsetWidth || 300;
  const sourceHeight = parseFloat(sourceWidget.style.height) || sourceWidget.offsetHeight || 200;
  
  // Get rotation from source widget (from data-rotation attribute or parse from transform)
  let sourceRotation = 0;
  const rotationAttr = sourceWidget.getAttribute('data-rotation');
  if (rotationAttr) {
    sourceRotation = parseFloat(rotationAttr) || 0;
  } else {
    // Try to parse from transform style
    const transform = sourceWidget.style.transform || window.getComputedStyle(sourceWidget).transform;
    if (transform && transform.includes('rotate')) {
      const match = transform.match(/rotate\(([^)]+)\)/);
      if (match) {
        const rotationValue = match[1].replace('deg', '').trim();
        sourceRotation = parseFloat(rotationValue) || 0;
      }
    }
  }
  
  // Offset position to the right and down (offset by widget width/height for better visibility)
  const offsetX = Math.max(80, sourceWidth * 0.3); // At least 80px or 30% of width
  const offsetY = Math.max(80, sourceHeight * 0.3); // At least 80px or 30% of height
  const newLeft = sourceLeft + offsetX;
  const newTop = sourceTop + offsetY;
  
  // Append cloned widget to page FIRST (so it exists in DOM)
  pageElement.appendChild(cloned);
  
  // Set position and size immediately after appending
  cloned.style.left = `${newLeft}px`;
  cloned.style.top = `${newTop}px`;
  cloned.style.width = `${sourceWidth}px`;
  cloned.style.height = `${sourceHeight}px`;
  cloned.style.position = 'absolute'; // Ensure absolute positioning
  
  // Apply same rotation as source widget
  if (sourceRotation !== 0) {
    cloned.style.transform = `rotate(${sourceRotation}deg)`;
    cloned.setAttribute('data-rotation', sourceRotation.toString());
  }
  
  // Copy configuration from original
  copyWidgetConfiguration(fullWidgetId, newFullId, pageIndex);
  
  // Save layout IMMEDIATELY after setting position, BEFORE initializeWidgetInstance
  // This ensures the position is in localStorage before loadWidgetLayout is called
  if (typeof saveCurrentPageLayout === 'function') {
    saveCurrentPageLayout();
  }
  
  // Store the intended position so we can restore it after initialization
  // (in case loadWidgetLayout overrides it)
  const intendedPosition = { left: newLeft, top: newTop, width: sourceWidth, height: sourceHeight, rotation: sourceRotation };
  
  // Initialize the cloned widget (this may call loadWidgetLayout, which might override position)
  initializeWidgetInstance(newFullId, cloned);
  
  // CRITICAL: Re-apply position IMMEDIATELY after initialization
  // loadWidgetLayout may have been called and could have overridden our position
  // We must restore it to ensure the clone appears with the correct offset
  cloned.style.left = `${intendedPosition.left}px`;
  cloned.style.top = `${intendedPosition.top}px`;
  cloned.style.width = `${intendedPosition.width}px`;
  cloned.style.height = `${intendedPosition.height}px`;
  cloned.style.position = 'absolute';
  if (intendedPosition.rotation !== 0) {
    cloned.style.transform = `rotate(${intendedPosition.rotation}deg)`;
    cloned.setAttribute('data-rotation', intendedPosition.rotation.toString());
  }
  
  // Explicitly save visibility for the new widget as visible
  // Do this before applying styles to ensure it's saved correctly
  const visibilityKey = `dakboard-widget-visibility-page-${pageIndex}`;
  const savedVisibility = localStorage.getItem(visibilityKey);
  const visibility = savedVisibility ? JSON.parse(savedVisibility) : {};
  visibility[newFullId] = true; // Always visible by default
  localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  
  // Force widget to be visible BEFORE applying styles - ensure it's not hidden
  cloned.classList.remove('hidden');
  cloned.style.display = ''; // Ensure display is not set to none
  
  // Load and apply styles immediately so the cloned widget displays correctly
  // This ensures title visibility and other styling matches the configuration
  // Note: applyCurrentStylesToWidget does NOT modify position, so our position will be preserved
  if (typeof loadWidgetStyles === 'function' && typeof applyCurrentStylesToWidget === 'function') {
    loadWidgetStyles(newFullId);
    // Apply styles to the cloned widget immediately
    applyCurrentStylesToWidget(cloned);
  }
  
  // Position was already restored after initializeWidgetInstance above
  // But re-apply again after styles to be absolutely sure
  cloned.style.left = `${intendedPosition.left}px`;
  cloned.style.top = `${intendedPosition.top}px`;
  cloned.style.position = 'absolute';
  
  // Save visibility state
  saveWidgetVisibility();
  
  // Save layout (position, size, rotation) for the cloned widget
  // This MUST be called after position is set
  if (typeof saveCurrentPageLayout === 'function') {
    saveCurrentPageLayout();
  } else if (typeof saveWidgetLayout === 'function') {
    saveWidgetLayout();
  }
  
  
  // Update control panel
  updateWidgetControlPanel();
  
  // Initialize drag/resize for the cloned widget with a delay to ensure everything is ready
  setTimeout(() => {
    // Force widget visible again just before initializing drag/resize
    cloned.classList.remove('hidden');
    cloned.style.display = '';
    
    // Try multiple ways to access the function in case of timing issues
    let initFunction = null;
    if (typeof window !== 'undefined' && typeof window.initializeWidgetDragAndResize === 'function') {
      initFunction = window.initializeWidgetDragAndResize;
    } else if (typeof initializeWidgetDragAndResize === 'function') {
      initFunction = initializeWidgetDragAndResize;
    }
    
    if (initFunction) {
      initFunction(cloned);
    } else if (typeof initializeDragAndResize === 'function') {
      // Fallback to full reinitialization
      initializeDragAndResize();
    } else {
      // Last resort: try again after a longer delay
      setTimeout(() => {
        if (typeof initializeDragAndResize === 'function') {
          initializeDragAndResize();
        }
      }, 200);
    }
  }, 150);
}

// Remove widget instance (only for clones)
function removeWidgetInstance(fullWidgetId) {
  const parsed = parseWidgetId(fullWidgetId);
  if (parsed.instanceIndex === 0) {
    console.error('Cannot remove original widget instance (instance-0)');
    return;
  }
  
  const widgetType = parsed.widgetType;
  const pageIndex = parsed.pageIndex;
  const instanceIndex = parsed.instanceIndex;
  
  const pageElement = getPageElement(pageIndex);
  if (!pageElement) return;
  
  // Find and remove the widget element
  const widget = pageElement.querySelector(`.${fullWidgetId}`);
  if (widget) {
    widget.remove();
  }
  
  // Remove all localStorage entries for this instance
  // Keys now use format: dakboard-{type}-{fullWidgetId} where fullWidgetId already includes page and instance
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(fullWidgetId)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Remove visibility entry for this widget instance
  const visibilityKey = `dakboard-widget-visibility-page-${pageIndex}`;
  const savedVisibility = localStorage.getItem(visibilityKey);
  if (savedVisibility) {
    try {
      const visibility = JSON.parse(savedVisibility);
      // Remove the visibility entry for this widget instance
      delete visibility[fullWidgetId];
      localStorage.setItem(visibilityKey, JSON.stringify(visibility));
    } catch (e) {
      console.error('Error updating visibility when removing widget:', e);
    }
  }
  
  // Remove layout entry for this widget instance
  const layoutKey = `dakboard-widget-layout-page-${pageIndex}`;
  const savedLayout = localStorage.getItem(layoutKey);
  if (savedLayout) {
    try {
      const layout = JSON.parse(savedLayout);
      // Remove the layout entry for this widget instance
      delete layout[fullWidgetId];
      localStorage.setItem(layoutKey, JSON.stringify(layout));
    } catch (e) {
      console.error('Error updating layout when removing widget:', e);
    }
  }
  
  // Reindex remaining instances (shift down instance indices)
  const instances = getWidgetInstances(widgetType, pageIndex);
  instances.forEach(inst => {
    if (inst.instanceIndex > instanceIndex) {
      const oldId = inst.fullId;
      const newInstanceIndex = inst.instanceIndex - 1;
      const newId = generateWidgetId(widgetType, pageIndex, newInstanceIndex);
      
      // Update widget element class
      if (inst.element) {
        inst.element.className = `${widgetType} ${newId}`;
      }
      
      // Rename localStorage keys
      // Keys now use format: dakboard-{type}-{fullWidgetId} where fullWidgetId already includes page and instance
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(oldId)) {
          // Replace oldId with newId in the key
          const newKey = key.replace(oldId, newId);
          const value = localStorage.getItem(key);
          if (value && newKey !== key) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(key);
          }
        }
      }
      
      // Update visibility entry for reindexed widget
      const visibilityKey = `dakboard-widget-visibility-page-${pageIndex}`;
      const savedVisibility = localStorage.getItem(visibilityKey);
      if (savedVisibility) {
        try {
          const visibility = JSON.parse(savedVisibility);
          // If old visibility entry exists, rename it to new ID
          if (visibility[oldId] !== undefined) {
            visibility[newId] = visibility[oldId];
            delete visibility[oldId];
            localStorage.setItem(visibilityKey, JSON.stringify(visibility));
          }
        } catch (e) {
          console.error('Error updating visibility when reindexing widget:', e);
        }
      }
      
      // Update layout entry for reindexed widget
      const layoutKey = `dakboard-widget-layout-page-${pageIndex}`;
      const savedLayout = localStorage.getItem(layoutKey);
      if (savedLayout) {
        try {
          const layout = JSON.parse(savedLayout);
          // If old layout entry exists, rename it to new ID
          if (layout[oldId] !== undefined) {
            layout[newId] = layout[oldId];
            delete layout[oldId];
            localStorage.setItem(layoutKey, JSON.stringify(layout));
          }
        } catch (e) {
          console.error('Error updating layout when reindexing widget:', e);
        }
      }
    }
  });
  
  // Update control panel
  updateWidgetControlPanel();
  
  // Reinitialize drag/resize
  if (typeof initializeDragAndResize === 'function') {
    setTimeout(() => {
      initializeDragAndResize();
    }, 100);
  }
}

// Move widget to different page
function moveWidgetToPage(fullWidgetId, targetPageIndex) {
  const parsed = parseWidgetId(fullWidgetId);
  const widgetType = parsed.widgetType;
  const sourcePageIndex = parsed.pageIndex;
  const instanceIndex = parsed.instanceIndex;
  const isOriginal = instanceIndex === 0;
  
  if (sourcePageIndex === targetPageIndex) return;
  
  const sourcePageElement = getPageElement(sourcePageIndex);
  const targetPageElement = getPageElement(targetPageIndex);
  if (!sourcePageElement || !targetPageElement) return;
  
  // Find the widget on source page
  const widget = sourcePageElement.querySelector(`.${fullWidgetId}`);
  if (!widget) {
    // Widget might be hidden/not exist, check if we need to create it
    const templateWidget = document.querySelector(`.${widgetType}`);
    if (!templateWidget) {
      console.error(`Widget template ${widgetType} not found`);
      return;
    }
    // Create widget from template
    const newWidget = templateWidget.cloneNode(true);
    newWidget.classList.add('hidden');
    sourcePageElement.appendChild(newWidget);
    // Update its ID
    newWidget.className = `${widgetType} ${fullWidgetId}`;
  }
  
  // Get next available instance index on target page
  const newInstanceIndex = getNextInstanceIndex(widgetType, targetPageIndex);
  const newFullId = generateWidgetId(widgetType, targetPageIndex, newInstanceIndex);
  
  // Copy configuration to new page
  copyWidgetConfiguration(fullWidgetId, newFullId, targetPageIndex, sourcePageIndex);
  
  // Clone widget to target page
  const widgetToMove = sourcePageElement.querySelector(`.${fullWidgetId}`);
  if (widgetToMove) {
      const cloned = widgetToMove.cloneNode(true);
      cloned.className = `widget ${widgetType} ${newFullId}`;
      cloned.classList.remove('hidden');
    targetPageElement.appendChild(cloned);
    
    // Initialize on target page
    initializeWidgetInstance(newFullId, cloned);
    
    // Save visibility state for target page immediately
    const tempPageIndex = currentPageIndex;
    currentPageIndex = targetPageIndex;
    window.currentPageIndex = targetPageIndex;
    saveWidgetVisibility();
    currentPageIndex = tempPageIndex;
    window.currentPageIndex = tempPageIndex;
  } else {
    // Create from template if widget doesn't exist
    const templateWidget = document.querySelector(`.${widgetType}`);
    if (templateWidget) {
      const cloned = templateWidget.cloneNode(true);
      cloned.className = `widget ${widgetType} ${newFullId}`;
      cloned.classList.remove('hidden');
      targetPageElement.appendChild(cloned);
      initializeWidgetInstance(newFullId, cloned);
      
      // Save visibility state for target page immediately
      const tempPageIndex = currentPageIndex;
      currentPageIndex = targetPageIndex;
      window.currentPageIndex = targetPageIndex;
      saveWidgetVisibility();
      currentPageIndex = tempPageIndex;
      window.currentPageIndex = tempPageIndex;
    }
  }
  
  // Handle source page: remove if clone, hide if original
  if (isOriginal) {
    // Hide original widget on source page
    const originalWidget = sourcePageElement.querySelector(`.${fullWidgetId}`);
    if (originalWidget) {
      originalWidget.classList.add('hidden');
    }
    // Update visibility state
    const visibilityKey = `dakboard-widget-visibility-page-${sourcePageIndex}`;
    const saved = localStorage.getItem(visibilityKey);
    const visibility = saved ? JSON.parse(saved) : {};
    visibility[fullWidgetId] = false;
    localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  } else {
    // Remove clone from source page
    removeWidgetInstance(fullWidgetId);
  }
  
  // Update control panel
  updateWidgetControlPanel();
  
  // Reinitialize drag/resize
  if (typeof initializeDragAndResize === 'function') {
    setTimeout(() => {
      initializeDragAndResize();
    }, 100);
  }
}

// Copy widget configuration from source to target
function copyWidgetConfiguration(sourceFullId, targetFullId, targetPageIndex, sourcePageIndex = null) {
  const sourceParsed = parseWidgetId(sourceFullId);
  const sourcePage = sourcePageIndex !== null ? sourcePageIndex : sourceParsed.pageIndex;
  
  // Copy styles
  // Storage key: fullWidgetId already includes page index, so don't add it again
  const sourceStylesKey = `dakboard-widget-styles-${sourceFullId}`;
  const targetStylesKey = `dakboard-widget-styles-${targetFullId}`;
  const sourceStyles = localStorage.getItem(sourceStylesKey);
  if (sourceStyles) {
    localStorage.setItem(targetStylesKey, sourceStyles);
  }
  
  // Copy layout (position, size, rotation)
  const sourceLayoutKey = `dakboard-widget-layout-page-${sourcePage}`;
  const targetLayoutKey = `dakboard-widget-layout-page-${targetPageIndex}`;
  const sourceLayout = localStorage.getItem(sourceLayoutKey);
  if (sourceLayout) {
    try {
      const layout = JSON.parse(sourceLayout);
      const sourceLayoutData = layout[sourceFullId];
      if (sourceLayoutData) {
        const targetLayout = JSON.parse(localStorage.getItem(targetLayoutKey) || '{}');
        targetLayout[targetFullId] = { ...sourceLayoutData };
        localStorage.setItem(targetLayoutKey, JSON.stringify(targetLayout));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Copy widget-specific data (stopwatch state, scoreboard config, etc.)
  const widgetType = sourceParsed.widgetType;
  
  // Stopwatch state
  if (widgetType === 'stopwatch-widget') {
    const sourceStopwatchKey = `dakboard-stopwatch-${sourceFullId}`;
    const targetStopwatchKey = `dakboard-stopwatch-${targetFullId}`;
    const sourceStopwatch = localStorage.getItem(sourceStopwatchKey);
    if (sourceStopwatch) {
      localStorage.setItem(targetStopwatchKey, sourceStopwatch);
    }
  }
  
  // Stoplight state
  if (widgetType === 'stoplight-widget') {
    const sourceStoplightKey = `dakboard-stoplight-${sourceFullId}`;
    const targetStoplightKey = `dakboard-stoplight-${targetFullId}`;
    const sourceStoplight = localStorage.getItem(sourceStoplightKey);
    if (sourceStoplight) {
      localStorage.setItem(targetStoplightKey, sourceStoplight);
    }
  }
  
  // Scoreboard config and scores
  if (widgetType === 'scoreboard-widget') {
    const sourceConfigKey = `dakboard-scoreboard-config-${sourceFullId}`;
    const targetConfigKey = `dakboard-scoreboard-config-${targetFullId}`;
    const sourceConfig = localStorage.getItem(sourceConfigKey);
    if (sourceConfig) {
      localStorage.setItem(targetConfigKey, sourceConfig);
    }
    
    const sourceScoresKey = `dakboard-scoreboard-scores-${sourceFullId}`;
    const targetScoresKey = `dakboard-scoreboard-scores-${targetFullId}`;
    const sourceScores = localStorage.getItem(sourceScoresKey);
    if (sourceScores) {
      localStorage.setItem(targetScoresKey, sourceScores);
    }
  }
  
  // Whiteboard drawing and settings (instance-specific)
  if (widgetType === 'whiteboard-widget') {
    // Copy drawing
    const sourceDrawingKey = `whiteboard-drawing-${sourceFullId}`;
    const targetDrawingKey = `whiteboard-drawing-${targetFullId}`;
    const sourceDrawing = localStorage.getItem(sourceDrawingKey);
    if (sourceDrawing) {
      localStorage.setItem(targetDrawingKey, sourceDrawing);
    }
    
    // Copy settings
    const sourceInkColorKey = `whiteboard-ink-color-${sourceFullId}`;
    const targetInkColorKey = `whiteboard-ink-color-${targetFullId}`;
    const sourceInkColor = localStorage.getItem(sourceInkColorKey);
    if (sourceInkColor) {
      localStorage.setItem(targetInkColorKey, sourceInkColor);
    }
    
    const sourceBgColorKey = `whiteboard-bg-color-${sourceFullId}`;
    const targetBgColorKey = `whiteboard-bg-color-${targetFullId}`;
    const sourceBgColor = localStorage.getItem(sourceBgColorKey);
    if (sourceBgColor) {
      localStorage.setItem(targetBgColorKey, sourceBgColor);
    }
    
    const sourceBrushSizeKey = `whiteboard-brush-size-${sourceFullId}`;
    const targetBrushSizeKey = `whiteboard-brush-size-${targetFullId}`;
    const sourceBrushSize = localStorage.getItem(sourceBrushSizeKey);
    if (sourceBrushSize) {
      localStorage.setItem(targetBrushSizeKey, sourceBrushSize);
    }
  }
}

// Initialize widget instance (load data, attach event listeners, etc.)
function initializeWidgetInstance(fullWidgetId, widgetElement) {
  const parsed = parseWidgetId(fullWidgetId);
  const widgetType = parsed.widgetType;
  
  // Set widget's class to include the full ID, but preserve the 'widget' class
  widgetElement.className = `widget ${widgetType} ${fullWidgetId}`;
  
  // Load widget-specific functionality
  if (widgetType === 'dice-widget' && typeof loadDice === 'function') {
    setTimeout(() => loadDice(), 50);
  } else if (widgetType === 'stopwatch-widget' && typeof loadStopwatch === 'function') {
    setTimeout(() => loadStopwatch(), 50);
  } else if (widgetType === 'scoreboard-widget' && typeof loadScoreboard === 'function') {
    setTimeout(() => loadScoreboard(), 50);
  } else if (widgetType === 'compressor-widget' && typeof loadCompressor === 'function') {
    setTimeout(() => loadCompressor(), 50);
  } else if (widgetType === 'alarm-widget' && typeof loadAlarm === 'function') {
    setTimeout(() => loadAlarm(), 50);
  } else if (widgetType === 'garage-widget' && typeof loadGarageDoors === 'function') {
    setTimeout(() => loadGarageDoors(), 50);
  } else if (widgetType === 'thermostat-widget' && typeof loadThermostat === 'function') {
    setTimeout(() => loadThermostat(), 50);
  } else if (widgetType === 'news-widget' && typeof loadNews === 'function') {
    setTimeout(() => loadNews(), 50);
  } else if (widgetType === 'whiteboard-widget' && typeof initializeWhiteboard === 'function') {
    setTimeout(() => initializeWhiteboard(), 50);
  } else if (widgetType === 'weather-widget' && typeof loadWeather === 'function') {
    setTimeout(() => loadWeather(), 50);
  } else if (widgetType === 'todo-widget' && typeof loadTodos === 'function') {
    setTimeout(() => loadTodos(), 50);
  } else if (widgetType === 'calendar-widget' && typeof loadCalendarEvents === 'function') {
    setTimeout(() => loadCalendarEvents(), 50);
  } else if (widgetType === 'blank-widget' && typeof loadClipArt === 'function') {
    setTimeout(() => loadClipArt(), 50);
  } else if (widgetType === 'stoplight-widget' && typeof loadStoplight === 'function') {
    setTimeout(() => loadStoplight(), 50);
  }
  
  // Load layout (position, size, rotation)
  if (typeof loadWidgetLayout === 'function') {
    loadWidgetLayout();
  }
  
  // Apply styles
  if (typeof loadWidgetStyles === 'function') {
    loadWidgetStyles(fullWidgetId);
  }
}

// Z-index control functions
function bringWidgetForward(widgetId) {
  // Find widget on current page only
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const widget = pageElement.querySelector(`.${widgetId}`);
  if (!widget || widget.classList.contains('hidden')) return;
  
  const currentZ = parseInt(window.getComputedStyle(widget).zIndex) || 1;
  const allWidgets = Array.from(pageElement.querySelectorAll('.widget:not(.hidden)'));
  if (allWidgets.length === 0) return;
  
  const maxZ = Math.max(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  if (currentZ < maxZ) {
    widget.style.zIndex = currentZ + 1;
    saveWidgetLayout(); // Save z-index changes
  }
}

function sendWidgetBackward(widgetId) {
  // Find widget on current page only
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const widget = pageElement.querySelector(`.${widgetId}`);
  if (!widget || widget.classList.contains('hidden')) return;
  
  const currentZ = parseInt(window.getComputedStyle(widget).zIndex) || 1;
  const allWidgets = Array.from(pageElement.querySelectorAll('.widget:not(.hidden)'));
  if (allWidgets.length === 0) return;
  
  const minZ = Math.min(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  if (currentZ > minZ) {
    widget.style.zIndex = currentZ - 1;
    saveWidgetLayout(); // Save z-index changes
  }
}

function bringWidgetToFront(widgetId) {
  // Find widget on current page only
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const widget = pageElement.querySelector(`.${widgetId}`);
  if (!widget || widget.classList.contains('hidden')) return;
  
  const allWidgets = Array.from(pageElement.querySelectorAll('.widget:not(.hidden)'));
  if (allWidgets.length === 0) return;
  
  const maxZ = Math.max(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  widget.style.zIndex = maxZ + 1;
  saveWidgetLayout(); // Save z-index changes
}

function sendWidgetToBack(widgetId) {
  // Find widget on current page only
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  const widget = pageElement.querySelector(`.${widgetId}`);
  if (!widget || widget.classList.contains('hidden')) return;
  
  const allWidgets = Array.from(pageElement.querySelectorAll('.widget:not(.hidden)'));
  if (allWidgets.length === 0) return;
  
  const minZ = Math.min(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  widget.style.zIndex = minZ - 1;
  saveWidgetLayout(); // Save z-index changes
}

// Add z-index controls to widget header
function addZIndexControls(widget) {
  // Remove existing z-index controls
  const existing = widget.querySelector('.widget-zindex-controls');
  if (existing) {
    existing.remove();
  }
  
  // Remove existing minimal edit header if it exists
  const existingMinimalHeader = widget.querySelector('.widget-edit-header');
  if (existingMinimalHeader) {
    existingMinimalHeader.remove();
  }
  
  // Get widget ID from class list (second class is the widget ID)
  const widgetId = widget.classList[1];
  if (!widgetId) return;
  
  // Get all headers - find the real header (not minimal edit header)
  const allHeaders = widget.querySelectorAll('.widget-header');
  let header = null;
  let minimalHeader = null;
  
  // Separate real headers from minimal edit headers
  allHeaders.forEach(h => {
    if (h.classList.contains('widget-edit-header')) {
      minimalHeader = h;
    } else {
      header = h;
    }
  });
  
  // Check if header exists
  if (!header) {
    // No real header exists - create minimal header for z-index controls
    header = document.createElement('div');
    header.className = 'widget-header widget-edit-header';
    // Insert at the beginning of the widget
    widget.insertBefore(header, widget.firstChild);
  } else {
    // Real header exists - check if it's hidden
    const headerStyle = window.getComputedStyle(header);
    const isHeaderHidden = headerStyle.display === 'none';
    
    // If header is hidden, create/use minimal header for z-index controls
    // But keep the original header for when title visibility is turned back on
    if (isHeaderHidden) {
      // Remove any existing minimal header first
      if (minimalHeader) {
        minimalHeader.remove();
      }
      // Create a minimal header for z-index controls
      minimalHeader = document.createElement('div');
      minimalHeader.className = 'widget-header widget-edit-header';
      // Insert at the beginning of the widget (before the hidden real header)
      widget.insertBefore(minimalHeader, widget.firstChild);
      header = minimalHeader;
    } else {
      // Header is visible - use it for z-index controls
      // Remove any existing minimal header since we don't need it
      if (minimalHeader) {
        minimalHeader.remove();
      }
      // Use the real header
    }
  }
  
  // Create z-index controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'widget-zindex-controls';
  
  // Create buttons
  const sendToBackBtn = document.createElement('button');
  sendToBackBtn.className = 'widget-zindex-btn widget-zindex-demote';
  sendToBackBtn.innerHTML = '⬇';
  sendToBackBtn.title = 'Send to Back';
  sendToBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendWidgetToBack(widgetId);
  });
  
  const sendBackwardBtn = document.createElement('button');
  sendBackwardBtn.className = 'widget-zindex-btn widget-zindex-demote';
  sendBackwardBtn.innerHTML = '↓';
  sendBackwardBtn.title = 'Send Backward';
  sendBackwardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendWidgetBackward(widgetId);
  });
  
  const bringForwardBtn = document.createElement('button');
  bringForwardBtn.className = 'widget-zindex-btn widget-zindex-promote';
  bringForwardBtn.innerHTML = '↑';
  bringForwardBtn.title = 'Bring Forward';
  bringForwardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bringWidgetForward(widgetId);
  });
  
  const bringToFrontBtn = document.createElement('button');
  bringToFrontBtn.className = 'widget-zindex-btn widget-zindex-promote';
  bringToFrontBtn.innerHTML = '⬆';
  bringToFrontBtn.title = 'Bring to Front';
  bringToFrontBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bringWidgetToFront(widgetId);
  });
  
  // Add buttons to container
  controlsContainer.appendChild(sendToBackBtn);
  controlsContainer.appendChild(sendBackwardBtn);
  controlsContainer.appendChild(bringForwardBtn);
  controlsContainer.appendChild(bringToFrontBtn);
  
  // Add to header
  header.appendChild(controlsContainer);
}

// Start auto-refresh
function startAutoRefresh() {
  setInterval(() => {
    loadAllData();
  }, CONFIG.REFRESH_INTERVAL);
}

// ==================== PAGE MANAGEMENT ====================

// Initialize pages system
function initializePages() {
  pagesContainer = document.getElementById('pages-container');
  if (!pagesContainer) {
    console.error('Pages container not found!');
    return;
  }
  
  // Move existing dashboard into pages container if it exists
  const existingDashboard = document.querySelector('.dashboard');
  if (existingDashboard && !existingDashboard.closest('#pages-container')) {
    pagesContainer.appendChild(existingDashboard);
    existingDashboard.classList.add('page');
    existingDashboard.setAttribute('data-page-id', '0');
  }
  
  // Load page configuration
  const savedPageIndex = localStorage.getItem('dakboard-current-page');
  if (savedPageIndex !== null) {
    currentPageIndex = parseInt(savedPageIndex) || 0;
  }
  
  const savedTotalPages = localStorage.getItem('dakboard-total-pages');
  if (savedTotalPages !== null) {
    totalPages = parseInt(savedTotalPages) || 1;
  }
  
  // Ensure we have at least one page
  if (totalPages === 0) {
    totalPages = 1;
  }
  
  // Create pages if they don't exist
  for (let i = 0; i < totalPages; i++) {
    if (!getPageElement(i)) {
      createPage(i);
    }
  }
  
  // Setup navigation
  setupPageNavigation();
  
  // Setup swipe gestures
  setupSwipeGestures();
  
  // Setup page management (add/delete) - only once
  // Don't call here, it's called in initializeWidgetControlPanel after panel is ready
  
  // Don't show page here - it will be shown after all initialization is complete
  // This ensures widgets are properly created and visibility/styles are loaded first
  
  // Initial page list update
  updatePageList();
}

// Get page element by index
function getPageElement(pageIndex) {
  return document.querySelector(`.dashboard.page[data-page-id="${pageIndex}"]`);
}

// Create a new page
function createPage(pageIndex) {
  const page = document.createElement('div');
  page.className = 'dashboard page';
  page.setAttribute('data-page-id', pageIndex);
  
  // Load page background
  const pageBg = getPageBackground(pageIndex);
  applyBackgroundToPage(page, pageBg);
  
  pagesContainer.appendChild(page);
  
  // If this is page 0 and it's the first page, copy widgets from existing dashboard
  if (pageIndex === 0) {
    const existingDashboard = document.querySelector('.dashboard:not(.page)');
    if (existingDashboard) {
      // Move all widgets to the new page
      const widgets = existingDashboard.querySelectorAll('.widget');
      widgets.forEach(widget => {
        page.appendChild(widget);
      });
      existingDashboard.remove();
    }
    
    // Move app-purpose-box to page 0 only
    const appPurposeBox = document.querySelector('.app-purpose-box');
    if (appPurposeBox && !appPurposeBox.closest('.dashboard.page')) {
      page.appendChild(appPurposeBox);
    }
  } else {
    // For pages 1+, hide or remove the app-purpose-box if it exists
    const appPurposeBox = document.querySelector('.app-purpose-box');
    if (appPurposeBox) {
      // If it's not already on a page, hide it
      if (!appPurposeBox.closest('.dashboard.page')) {
        appPurposeBox.style.display = 'none';
      } else {
        // If it's on another page, just ensure it's not visible on this page
        appPurposeBox.style.display = 'none';
      }
    }
  }
  
  return page;
}

// Show a specific page
function showPage(pageIndex, direction = null) {
  if (pageIndex < 0 || pageIndex >= totalPages) {
    console.warn(`Invalid page index: ${pageIndex}`);
    return;
  }
  
  const pages = document.querySelectorAll('.dashboard.page');
  const oldPageIndex = currentPageIndex;
  currentPageIndex = pageIndex;
  window.currentPageIndex = pageIndex; // Make available globally for styling.js
  localStorage.setItem('dakboard-current-page', pageIndex.toString());
  
  // Determine if we're looping (wrapping around)
  // NOTE: Smooth animations work correctly even when looping between first and last pages
  // Right loop: Last page → First page (with Page 1 hidden during transition)
  // Left loop: First page → Last page (with second-to-last page hidden during transition)
  const isLooping = (direction === 'right' && oldPageIndex === totalPages - 1 && pageIndex === 0) ||
                    (direction === 'left' && oldPageIndex === 0 && pageIndex === totalPages - 1);
  
  // Flag to skip final position setting for right loop (handled in requestAnimationFrame)
  let skipFinalPositions = false;
  
  // Check if pages are hidden from previous loop - if so, show them before animating
  const pagesHidden = Array.from(pages).some(page => page.style.visibility === 'hidden' && page !== pages[pageIndex]);
  if (pagesHidden && !isLooping && !isInitialLoad) {
    // Show all pages first (with transitions disabled)
    pages.forEach(page => {
      page.style.transition = 'none';
      page.style.visibility = 'visible';
    });
    // Force reflow
    void pages[0].offsetHeight;
    // Re-enable transitions
    requestAnimationFrame(() => {
      pages.forEach(page => {
        page.style.transition = '';
      });
    });
  }
  
  // For looping right (Page 3 → Page 1), animate with Page 1 sliding over Page 3
  if (isLooping && !isInitialLoad && direction === 'right') {
    // Disable transitions initially
    pages.forEach(page => {
      page.style.transition = 'none';
    });
    
    // Position pages: new page (0) off-screen right, hide page 1, keep Page 3 visible
    // All pages should move LEFT during animation
    pages.forEach((page, index) => {
      if (index === pageIndex) {
        // New page (0) starts off-screen to the right - will slide over Page 3
        page.style.transform = `translateX(100vw)`;
        page.style.visibility = 'visible';
        page.style.zIndex = '10'; // Ensure it's on top
      } else if (index === 1) {
        // Page at index 1 (second page): Keep it hidden during right loop to prevent flash
        // This is the page that would be visible between last page and first page
        page.style.transform = `translateX(-100vw)`;
        page.style.visibility = 'hidden';
        page.style.zIndex = '1';
      } else {
        // All other pages: position them to their current positions relative to oldPageIndex
        // They will all animate LEFT to their final positions
        const currentOffset = (index - oldPageIndex) * 100;
        const finalOffset = (index - pageIndex) * 100;
        
        // Start from current position (relative to old page)
        // Final positions are set in requestAnimationFrame below
        page.style.transform = `translateX(${currentOffset}vw)`;
        page.style.visibility = 'visible';
        page.style.zIndex = '1';
      }
    });
    
    // Force reflow
    void pages[0].offsetHeight;
    
    // Re-enable transitions and animate
    requestAnimationFrame(() => {
      pages.forEach(page => {
        page.style.transition = '';
      });
      
      // Set final positions (triggers animation)
      // For looping right, all pages should move LEFT visually during animation
      // But they must end at correct final positions for subsequent navigation
      pages.forEach((page, index) => {
        if (index === pageIndex) {
          // New page (0) animates to center
          page.style.transform = `translateX(0vw)`;
        } else if (index === 1) {
          // Page at index 1 (second page): Keep hidden during animation
          // This is the page that would be visible between last page and first page
          page.style.transform = `translateX(-100vw)`;
          page.style.visibility = 'hidden';
          setTimeout(() => {
            page.style.visibility = 'visible';
          }, 350); // After animation completes
        } else {
          // All other pages: calculate positions
          const currentOffset = (index - oldPageIndex) * 100;
          const finalOffset = (index - pageIndex) * 100;
          
          // During animation, move pages left for visual effect
          // But ensure they end at correct final positions
          if (finalOffset > currentOffset && finalOffset > 100) {
            // This page would move far right (like Page 3 going to 300vw)
            // Animate it left off-screen for visual effect
            page.style.transform = `translateX(-100vw)`;
          } else {
            // This page moves left or is close - use final position directly
            page.style.transform = `translateX(${finalOffset}vw)`;
          }
          page.style.visibility = 'visible';
        }
      });
      
      // After animation completes, hide all pages except current one
      setTimeout(() => {
        // Disable transitions for instant correction
        pages.forEach(page => {
          page.style.transition = 'none';
        });
        
        // Set all pages to their correct final positions and hide all except current
        pages.forEach((page, index) => {
          const finalOffset = (index - pageIndex) * 100;
          page.style.transform = `translateX(${finalOffset}vw)`;
          if (index === pageIndex) {
            page.style.visibility = 'visible'; // Keep current page visible
          } else {
            page.style.visibility = 'hidden'; // Hide all other pages
          }
          page.style.zIndex = '';
        });
        
        // Re-enable transitions for normal navigation
        requestAnimationFrame(() => {
          pages.forEach(page => {
            page.style.transition = '';
          });
        });
      }, 350); // After animation completes
    });
    
    // Skip the normal final position setting below - handled in requestAnimationFrame
    skipFinalPositions = true;
  } else if (isLooping && !isInitialLoad && direction === 'left') {
    // For looping left (Page 1 → Page 3), animate with Page 2 hidden
    // Disable transitions initially
    pages.forEach(page => {
      page.style.transition = 'none';
    });
    
    // Position pages: new page (last) off-screen left, hide page 2, keep Page 1 visible
    pages.forEach((page, index) => {
      if (index === pageIndex) {
        // New page (last) starts off-screen to the left - will slide over Page 1
        page.style.transform = `translateX(-100vw)`;
        page.style.visibility = 'visible';
        page.style.zIndex = '10'; // Ensure it's on top
      } else if (index === totalPages - 2) {
        // Page at index totalPages - 2 (second to last): Keep it hidden during left loop to prevent flash
        // This is the page that would be visible between first page and last page
        const finalOffset = (index - pageIndex) * 100;
        page.style.transform = `translateX(${finalOffset}vw)`;
        page.style.visibility = 'hidden';
        page.style.zIndex = '1';
      } else if (index === oldPageIndex) {
        // Page 1 (old current page): Keep it visible at current position so new page slides over it
        page.style.transform = `translateX(0vw)`;
        page.style.visibility = 'visible';
        page.style.zIndex = '1'; // Behind the new page
      } else {
        // Other pages: position them to their current positions relative to oldPageIndex
        const currentOffset = (index - oldPageIndex) * 100;
        page.style.transform = `translateX(${currentOffset}vw)`;
        page.style.visibility = 'visible';
        page.style.zIndex = '1';
      }
    });
    
    // Force reflow
    void pages[0].offsetHeight;
    
    // Re-enable transitions and animate
    requestAnimationFrame(() => {
      pages.forEach(page => {
        page.style.transition = '';
      });
      
      // Set final positions (triggers animation)
      // For looping left, all pages should move RIGHT visually during animation
      pages.forEach((page, index) => {
        if (index === pageIndex) {
          // New page (last) animates to center
          page.style.transform = `translateX(0vw)`;
        } else if (index === totalPages - 2) {
          // Page at index totalPages - 2 (second to last): Keep hidden during animation
          // This is the page that would be visible between first page and last page
          const finalOffset = (index - pageIndex) * 100;
          page.style.transform = `translateX(${finalOffset}vw)`;
          page.style.visibility = 'hidden';
          setTimeout(() => {
            page.style.visibility = 'visible';
          }, 350); // After animation completes
        } else {
          // All other pages: calculate positions
          const currentOffset = (index - oldPageIndex) * 100;
          const finalOffset = (index - pageIndex) * 100;
          
          // During animation, move pages right for visual effect
          // But ensure they end at correct final positions
          if (finalOffset < currentOffset && finalOffset < -100) {
            // This page would move far left (like Page 0 going to -200vw)
            // Animate it right off-screen for visual effect
            page.style.transform = `translateX(100vw)`;
          } else {
            // This page moves right or is close - use final position directly
            page.style.transform = `translateX(${finalOffset}vw)`;
          }
          page.style.visibility = 'visible';
        }
      });
      
      // After animation completes, hide all pages except current one
      setTimeout(() => {
        // Disable transitions for instant correction
        pages.forEach(page => {
          page.style.transition = 'none';
        });
        
        // Set all pages to their correct final positions and hide all except current
        pages.forEach((page, index) => {
          const finalOffset = (index - pageIndex) * 100;
          page.style.transform = `translateX(${finalOffset}vw)`;
          if (index === pageIndex) {
            page.style.visibility = 'visible'; // Keep current page visible
          } else {
            page.style.visibility = 'hidden'; // Hide all other pages
          }
          page.style.zIndex = '';
        });
        
        // Re-enable transitions for normal navigation
        requestAnimationFrame(() => {
          pages.forEach(page => {
            page.style.transition = '';
          });
        });
      }, 350); // After animation completes
    });
    
    // Skip the normal final position setting below - handled in requestAnimationFrame
    skipFinalPositions = true;
  } else if (isInitialLoad) {
    // Disable transition on initial load
    pages.forEach(page => {
      page.style.transition = 'none';
    });
  } else {
    // Normal navigation: ensure transitions are enabled
    pages.forEach(page => {
      page.style.transition = '';
    });
  }
  
  // Update all pages to final positions (skip for right loop - handled in requestAnimationFrame)
  if (!skipFinalPositions) {
  pages.forEach((page, index) => {
    const offset = (index - pageIndex) * 100;
    page.style.transform = `translateX(${offset}vw)`;
  });
  }
  
  // Re-enable transitions after instant loop switch (for left loop only)
  if (isLooping && !isInitialLoad && direction === 'left') {
    // Re-enable transitions after a brief delay for normal navigation
    setTimeout(() => {
      pages.forEach(page => {
        page.style.transition = '';
      });
    }, 50);
  }
  
  // Mark initial load as complete after first page display
  if (isInitialLoad) {
    isInitialLoad = false;
    // Re-enable transitions after a short delay to allow initial positioning
    setTimeout(() => {
      pages.forEach(page => {
        page.style.transition = '';
      });
    }, 50);
  }
  
  // Update navigation arrows visibility
  updateNavigationArrows();
  
  // Load page-specific layout (includes edit mode, background, widgets)
  loadCurrentPage();
  
  // Show/hide app-purpose-box based on page (only show on Page 0 for Google verification)
  const appPurposeBox = document.querySelector('.app-purpose-box');
  if (appPurposeBox) {
    if (pageIndex === 0) {
      appPurposeBox.style.display = 'block';
    } else {
      appPurposeBox.style.display = 'none';
    }
  }
  
  // Reload background settings in modal if it's open
  if (typeof loadBackgroundSettings === 'function') {
    loadBackgroundSettings();
  }
  
  // Update page list in control panel
  if (typeof updatePageList === 'function') {
    updatePageList();
  }
  
  // Refresh widget control panel to show correct visibility for current page
  if (typeof updateWidgetControlPanel === 'function') {
    updateWidgetControlPanel();
  }
  
  // Reinitialize drag and resize for current page
  if (typeof initializeDragAndResize === 'function') {
    initializeDragAndResize();
  }
  
  // Reinitialize whiteboard for current page
  if (typeof initializeWhiteboard === 'function') {
    initializeWhiteboard();
  }
  
  // Reload widget styles for current page
  if (typeof loadStyles === 'function') {
    loadStyles();
  }
}

// Navigate to next page (circular)
function nextPage() {
  const nextIndex = (currentPageIndex + 1) % totalPages;
  showPage(nextIndex, 'right'); // Always animate left-to-right
}

// Navigate to previous page (circular)
function previousPage() {
  const prevIndex = (currentPageIndex - 1 + totalPages) % totalPages;
  showPage(prevIndex, 'left'); // Always animate right-to-left
}

// Setup page navigation buttons
function setupPageNavigation() {
  const leftArrow = document.getElementById('page-nav-left');
  const rightArrow = document.getElementById('page-nav-right');
  
  if (leftArrow) {
    leftArrow.addEventListener('click', previousPage);
  }
  
  if (rightArrow) {
    rightArrow.addEventListener('click', nextPage);
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !isEditMode) {
      previousPage();
    } else if (e.key === 'ArrowRight' && !isEditMode) {
      nextPage();
    }
  });
  
  updateNavigationArrows();
}

// Update navigation arrows visibility
function updateNavigationArrows() {
  const leftArrow = document.getElementById('page-nav-left');
  const rightArrow = document.getElementById('page-nav-right');
  
  // Show arrows if more than one page, hide if only one
  if (totalPages <= 1) {
    if (leftArrow) leftArrow.classList.add('hidden');
    if (rightArrow) rightArrow.classList.add('hidden');
  } else {
    if (leftArrow) leftArrow.classList.remove('hidden');
    if (rightArrow) rightArrow.classList.remove('hidden');
  }
}

// Setup swipe gestures
function setupSwipeGestures() {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let touchStartedOnWidget = false;
  
  pagesContainer.addEventListener('touchstart', (e) => {
    if (isEditMode) return; // Disable swipe in edit mode
    // Check if touch starts within any widget
    const touchTarget = e.target;
    if (touchTarget.closest('.widget') || touchTarget.closest('.page-nav-arrow')) {
      touchStartedOnWidget = true;
      return; // Don't track swipe if starting on widget or arrow
    }
    touchStartedOnWidget = false;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: false });
  
  // Prevent Chrome's back navigation on left swipe
  pagesContainer.addEventListener('touchmove', (e) => {
    // Only prevent default for horizontal swipes to avoid blocking vertical scrolling
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.screenX - touchStartX);
    const deltaY = Math.abs(touch.screenY - touchStartY);
    
    // If horizontal movement is greater than vertical (likely a swipe, not scroll)
    // and not starting on a widget, prevent default to block browser back gesture
    if (!touchStartedOnWidget && deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  
  pagesContainer.addEventListener('touchend', (e) => {
    if (isEditMode || touchStartedOnWidget) return; // Disable swipe in edit mode or if started on widget
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });
  
  // Mouse drag for desktop
  let mouseDownX = 0;
  let mouseDownY = 0;
  let isMouseDown = false;
  
  pagesContainer.addEventListener('mousedown', (e) => {
    if (isEditMode) return; // Disable swipe in edit mode
    // Check if mouse down starts within any widget
    if (e.target.closest('.widget') || e.target.closest('.page-nav-arrow')) {
      return; // Don't swipe if clicking widget or arrow
    }
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    isMouseDown = true;
  });
  
  pagesContainer.addEventListener('mousemove', (e) => {
    if (!isMouseDown || isEditMode) return;
    // Track mouse movement for potential swipe
  });
  
  pagesContainer.addEventListener('mouseup', (e) => {
    if (!isMouseDown || isEditMode) return;
    const mouseUpX = e.clientX;
    const mouseUpY = e.clientY;
    const deltaX = mouseUpX - mouseDownX;
    const deltaY = mouseUpY - mouseDownY;
    
    // Only trigger swipe if horizontal movement is greater than vertical (swipe, not scroll)
    // Increased threshold from 50px to 75px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 75) {
      if (deltaX > 0) {
        previousPage();
      } else {
        nextPage();
      }
    }
    
    isMouseDown = false;
  });
  
  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Only trigger swipe if horizontal movement is greater than vertical (swipe, not scroll)
    // Increased threshold from 50px to 75px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 75) {
      if (deltaX > 0) {
        previousPage();
      } else {
        nextPage();
      }
    }
  }
}

// Load current page layout
function loadCurrentPage() {
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  // Load widget visibility FIRST - this ensures widgets are created/hidden before layout is applied
  loadWidgetVisibility();
  
  // Load annotations for current page
  if (annotationCanvas && annotationCtx) {
    loadAnnotationData();
    loadAnnotationVisibility();
  }
  
  // Load page-specific edit mode
  const editModeKey = `dakboard-edit-mode-page-${currentPageIndex}`;
  const savedEditMode = localStorage.getItem(editModeKey);
  if (savedEditMode === 'true') {
    isEditMode = true;
    pageElement.classList.add('edit-mode');
  } else {
    isEditMode = false;
    pageElement.classList.remove('edit-mode');
  }
  
  // Update edit mode toggle
  const editToggle = document.getElementById('edit-layout-toggle');
  if (editToggle) {
    editToggle.checked = isEditMode;
  }
  
  // Load page-specific background
  const pageBg = getPageBackground(currentPageIndex);
  if (pageBg) {
    applyBackgroundToPage(pageElement, pageBg);
  } else {
    // Fallback to default
    pageElement.style.background = '#1a1a1a';
  }
  
  // Ensure all widgets on this page have instance IDs
  Object.keys(WIDGET_CONFIG).forEach(widgetType => {
    const widgets = pageElement.querySelectorAll(`.${widgetType}`);
    widgets.forEach((widget, index) => {
      // Check if widget already has an instance ID
      const classes = Array.from(widget.classList);
      const hasInstanceId = classes.some(c => {
        const pattern = new RegExp(`^${widgetType}-page-${currentPageIndex}-instance-\\d+$`);
        return pattern.test(c);
      });
      
      // If no instance ID, assign one
      if (!hasInstanceId) {
        const instanceIndex = index; // Use index as instance number
        const fullWidgetId = generateWidgetId(widgetType, currentPageIndex, instanceIndex);
        widget.classList.add(fullWidgetId);
      }
    });
  });
  
  // Load page-specific widget layout
  const layoutKey = `dakboard-widget-layout-page-${currentPageIndex}`;
  const saved = localStorage.getItem(layoutKey);
  
  if (saved) {
    try {
      const layout = JSON.parse(saved);
      Object.keys(layout).forEach(widgetId => {
        // Try to find widget by full ID first
        let widget = pageElement.querySelector(`.${widgetId}`);
        
        // If not found and it's a legacy widget ID, try to find by widget type
        if (!widget && typeof parseWidgetId === 'function') {
          const parsed = parseWidgetId(widgetId);
          if (parsed.isLegacy) {
            // Legacy widget - try to find by type and migrate to instance-0
            const widgetType = parsed.widgetType;
            widget = pageElement.querySelector(`.${widgetType}`);
            if (widget) {
              // Migrate to instance-0 ID
              const fullWidgetId = generateWidgetId(widgetType, currentPageIndex, 0);
              widget.classList.add(fullWidgetId);
              // Update layout key to use new ID
              layout[fullWidgetId] = layout[widgetId];
              delete layout[widgetId];
              widgetId = fullWidgetId;
            }
          }
        }
        
        if (widget && layout[widgetId] && !widget.classList.contains('hidden')) {
          const { x, y, width, height, zIndex, rotation } = layout[widgetId];
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
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
          if (typeof updateWidgetScale === 'function') {
            updateWidgetScale(widget);
          }
        }
      });
      
      // Save migrated layout if changes were made
      if (Object.keys(layout).some(key => key.includes('page-') && key.includes('instance-'))) {
        localStorage.setItem(layoutKey, JSON.stringify(layout));
      }
    } catch (error) {
      console.error('Error loading page layout:', error);
    }
  }
}

// Save current page layout
function saveCurrentPageLayout() {
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  try {
    const layout = {};
    pageElement.querySelectorAll('.widget').forEach(widget => {
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
          // Legacy widget - generate instance-0 ID
          const widgetType = widget.classList[0] || widget.classList[1];
          if (widgetType && typeof generateWidgetId === 'function') {
            widgetId = generateWidgetId(widgetType, currentPageIndex, 0);
            // Add the full ID to the widget
            widget.classList.add(widgetId);
          } else {
            widgetId = widgetType || 'unknown-widget';
          }
        }
      }
      
      // Get position from style values (more accurate, especially for rotated widgets)
      // Fallback to getBoundingClientRect if style values aren't set
      let x, y;
      const styleLeft = widget.style.left;
      const styleTop = widget.style.top;
      
      if (styleLeft && styleLeft !== 'auto') {
        x = parseFloat(styleLeft) || 0;
      } else {
        const rect = widget.getBoundingClientRect();
        const dashboardRect = pageElement.getBoundingClientRect();
        x = rect.left - dashboardRect.left;
      }
      
      if (styleTop && styleTop !== 'auto') {
        y = parseFloat(styleTop) || 0;
      } else {
        const rect = widget.getBoundingClientRect();
        const dashboardRect = pageElement.getBoundingClientRect();
        y = rect.top - dashboardRect.top;
      }
      
      // Get size from style or computed size
      const styleWidth = widget.style.width;
      const styleHeight = widget.style.height;
      const width = (styleWidth && styleWidth !== 'auto') ? parseFloat(styleWidth) : widget.offsetWidth;
      const height = (styleHeight && styleHeight !== 'auto') ? parseFloat(styleHeight) : widget.offsetHeight;
      
      const zIndex = parseInt(window.getComputedStyle(widget).zIndex) || 1;
      const rotation = widget.getAttribute('data-rotation') ? parseFloat(widget.getAttribute('data-rotation')) : 0;
      layout[widgetId] = {
        x: x,
        y: y,
        width: width,
        height: height,
        zIndex: zIndex,
        rotation: rotation
      };
    });
    
    const layoutKey = `dakboard-widget-layout-page-${currentPageIndex}`;
    localStorage.setItem(layoutKey, JSON.stringify(layout));
  } catch (error) {
    console.error('Error saving page layout:', error);
  }
}

// Get page background
function getPageBackground(pageIndex) {
  const bgKey = `dakboard-page-background-${pageIndex}`;
  const saved = localStorage.getItem(bgKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading page background:', error);
    }
  }
  return null; // Default background
}

// Apply background to page
function applyBackgroundToPage(pageElement, background) {
  if (!background) {
    pageElement.style.background = '#1a1a1a';
    return;
  }
  
  // Apply background based on type (same logic as widget backgrounds)
  if (background.type === 'solid') {
    pageElement.style.background = background.color || '#1a1a1a';
  } else if (background.type === 'gradient') {
    const direction = background.direction || 'to bottom';
    const color1 = background.color1 || '#1a1a1a';
    const color2 = background.color2 || '#2a2a2a';
    pageElement.style.background = `linear-gradient(${direction}, ${color1}, ${color2})`;
  } else if (background.type === 'image') {
    pageElement.style.backgroundImage = `url(${background.url})`;
    pageElement.style.backgroundRepeat = background.repeat || 'no-repeat';
    pageElement.style.backgroundPosition = background.position || 'center';
    pageElement.style.backgroundSize = background.size || 'cover';
  } else if (background.type === 'pattern') {
    // Pattern backgrounds would need special handling
    pageElement.style.background = background.pattern || '#1a1a1a';
  } else if (background.type === 'transparent') {
    pageElement.style.background = 'transparent';
  } else {
    pageElement.style.background = '#1a1a1a';
  }
}

// Save page background
function savePageBackground(pageIndex, background) {
  const bgKey = `dakboard-page-background-${pageIndex}`;
  localStorage.setItem(bgKey, JSON.stringify(background));
  
  // Apply to page element
  const pageElement = getPageElement(pageIndex);
  if (pageElement) {
    applyBackgroundToPage(pageElement, background);
  }
}

// Add a new page
function addPage() {
  const newPageIndex = totalPages;
  totalPages++;
  window.totalPages = totalPages;
  localStorage.setItem('dakboard-total-pages', totalPages.toString());
  
  // Create the new page
  const newPage = createPage(newPageIndex);
  
  // Set default background (ensure no inherited background)
  newPage.style.background = '#1a1a1a';
  localStorage.removeItem(`dakboard-page-background-${newPageIndex}`);
  
  // Set fresh page name (don't inherit from deleted pages)
  localStorage.removeItem(`dakboard-page-name-${newPageIndex}`);
  localStorage.setItem(`dakboard-page-name-${newPageIndex}`, `Page ${newPageIndex + 1}`);
  
  // Mark all widgets as hidden for the new page
  const visibility = {};
  Object.keys(WIDGET_CONFIG).forEach(widgetId => {
    visibility[widgetId] = false; // All widgets hidden by default
  });
  const visibilityKey = `dakboard-widget-visibility-page-${newPageIndex}`;
  localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  
  // Clear any widget layouts for the new page (ensure clean state)
  localStorage.removeItem(`dakboard-widget-layout-page-${newPageIndex}`);
  
  // Clear any widget styles for all widget instances on the new page
  // Remove styles for base widgets (instance-0) and any potential clones
  Object.keys(WIDGET_CONFIG).forEach(widgetType => {
    // Clear base widget styles (instance-0)
    const baseWidgetId = generateWidgetId(widgetType, newPageIndex, 0);
    localStorage.removeItem(`dakboard-widget-styles-${baseWidgetId}`);
    
    // Clear any cloned widget styles (instance-1, instance-2, etc.)
    // We'll check up to 10 instances to be safe
    for (let i = 1; i < 10; i++) {
      const cloneWidgetId = generateWidgetId(widgetType, newPageIndex, i);
      localStorage.removeItem(`dakboard-widget-styles-${cloneWidgetId}`);
    }
  });
  
  // Clear annotations for the new page
  localStorage.removeItem(`dakboard-annotation-page-${newPageIndex}`);
  localStorage.removeItem(`dakboard-annotation-highlight2-page-${newPageIndex}`);
  
  // Set annotation visibility to visible by default for new pages
  localStorage.setItem(`dakboard-annotation-visibility-page-${newPageIndex}`, 'true');
  
  // Clear edit mode for the new page (start with edit mode off)
  localStorage.removeItem(`dakboard-edit-mode-page-${newPageIndex}`);
  
  // Clear any page-specific data (whiteboard, etc.)
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    // Remove any keys that contain the new page index
    if (key.includes(`-page-${newPageIndex}`) || key.endsWith(`page-${newPageIndex}`)) {
      // Only remove if it's not the visibility key we just set, or other keys we want to keep
      if (key !== visibilityKey && 
          key !== `dakboard-annotation-visibility-page-${newPageIndex}` &&
          !key.startsWith(`dakboard-page-name-`) &&
          !key.startsWith(`dakboard-page-background-`) &&
          !key.startsWith(`dakboard-edit-mode-page-`)) {
        // Check if it's widget-specific data (stopwatch, scoreboard, stoplight, whiteboard, etc.)
        // These should be removed for new pages
        localStorage.removeItem(key);
      }
    }
  });
  
  // Update page list UI
  updatePageList();
  
  // Update navigation arrows
  updateNavigationArrows();
  
  // Switch to the new page (this will trigger loadCurrentPage which loads visibility and renders widgets)
  showPage(newPageIndex);
  
  return newPageIndex;
}

// Delete a page
function deletePage(pageIndex) {
  // Can't delete if only one page exists
  if (totalPages <= 1) {
    if (typeof showToast === 'function') {
      showToast('Cannot delete the last page. At least one page must exist.', 2000);
    } else {
      alert('Cannot delete the last page. At least one page must exist.');
    }
    return false;
  }
  
  // Remove page element
  const pageElement = getPageElement(pageIndex);
  if (pageElement) {
    pageElement.remove();
  }
  
  // Delete page data from localStorage
  localStorage.removeItem(`dakboard-widget-layout-page-${pageIndex}`);
  localStorage.removeItem(`dakboard-background-page-${pageIndex}`);
  localStorage.removeItem(`dakboard-edit-mode-page-${pageIndex}`);
  localStorage.removeItem(`dakboard-page-name-${pageIndex}`); // Remove page name
  
  // Renumber pages after the deleted one
  for (let i = pageIndex + 1; i < totalPages; i++) {
    const oldLayoutKey = `dakboard-widget-layout-page-${i}`;
    const oldBgKey = `dakboard-background-page-${i}`;
    const oldEditKey = `dakboard-edit-mode-page-${i}`;
    const oldNameKey = `dakboard-page-name-${i}`;
    
    const newLayoutKey = `dakboard-widget-layout-page-${i - 1}`;
    const newBgKey = `dakboard-background-page-${i - 1}`;
    const newEditKey = `dakboard-edit-mode-page-${i - 1}`;
    const newNameKey = `dakboard-page-name-${i - 1}`;
    
    // Move layout data
    const layoutData = localStorage.getItem(oldLayoutKey);
    if (layoutData) {
      localStorage.setItem(newLayoutKey, layoutData);
      localStorage.removeItem(oldLayoutKey);
    }
    
    // Move background data
    const bgData = localStorage.getItem(oldBgKey);
    if (bgData) {
      localStorage.setItem(newBgKey, bgData);
      localStorage.removeItem(oldBgKey);
    }
    
    // Move edit mode data
    const editData = localStorage.getItem(oldEditKey);
    if (editData) {
      localStorage.setItem(newEditKey, editData);
      localStorage.removeItem(oldEditKey);
    }
    
    // Move page name data
    const nameData = localStorage.getItem(oldNameKey);
    if (nameData) {
      localStorage.setItem(newNameKey, nameData);
      localStorage.removeItem(oldNameKey);
    }
    
    // Update page element data-page-id
    const pageToRenumber = getPageElement(i);
    if (pageToRenumber) {
      pageToRenumber.setAttribute('data-page-id', (i - 1).toString());
    }
  }
  
  // Decrease total pages
  totalPages--;
  window.totalPages = totalPages;
  localStorage.setItem('dakboard-total-pages', totalPages.toString());
  
  // Adjust current page index if needed
  if (currentPageIndex >= totalPages) {
    currentPageIndex = totalPages - 1;
    window.currentPageIndex = currentPageIndex;
    localStorage.setItem('dakboard-current-page', currentPageIndex.toString());
  } else if (currentPageIndex > pageIndex) {
    // If we deleted a page before the current one, adjust index
    currentPageIndex--;
    window.currentPageIndex = currentPageIndex;
    localStorage.setItem('dakboard-current-page', currentPageIndex.toString());
  }
  
  // Update page list UI
  updatePageList();
  
  // Update navigation arrows
  updateNavigationArrows();
  
  // Show the current page (which may have changed)
  showPage(currentPageIndex);
  
  return true;
}

// Update page list in control panel
function updatePageList() {
  const pageList = document.getElementById('page-list');
  if (!pageList) return;
  
  pageList.innerHTML = '';
  
  for (let i = 0; i < totalPages; i++) {
    const pageItem = document.createElement('div');
    pageItem.className = 'page-list-item';
    if (i === currentPageIndex) {
      pageItem.classList.add('active');
    }
    
    const pageLabel = document.createElement('span');
    pageLabel.className = 'page-list-label';
    
    // Load saved page name or use default
    const pageNameKey = `dakboard-page-name-${i}`;
    const savedName = localStorage.getItem(pageNameKey);
    pageLabel.textContent = savedName || `Page ${i + 1}`;
    pageLabel.style.cursor = 'pointer';
    
    // Single click to switch page
    let clickTimeout;
    pageLabel.addEventListener('click', () => {
      // Clear any pending timeout
      clearTimeout(clickTimeout);
      // Set timeout to allow for double-click detection
      clickTimeout = setTimeout(() => {
        if (!pageLabel.classList.contains('editing')) {
          showPage(i);
          updatePageList();
          // Refresh widget control panel to show correct visibility for new page
          if (typeof updateWidgetControlPanel === 'function') {
            updateWidgetControlPanel();
          }
        }
      }, 250); // 250ms delay to detect double-click
    });
    
    // Double click to rename
    pageLabel.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      clearTimeout(clickTimeout); // Cancel single click
      renamePage(i, pageLabel);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'page-delete-btn';
    deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    deleteBtn.title = 'Delete Page';
    deleteBtn.disabled = totalPages <= 1; // Disable if only one page
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (totalPages <= 1) {
        if (typeof showToast === 'function') {
          showToast('Cannot delete the last page.', 2000);
        } else {
          alert('Cannot delete the last page.');
        }
        return;
      }
      
      if (confirm(`Delete Page ${i + 1}? This will permanently remove all widgets and settings on this page.`)) {
        deletePage(i);
      }
    });
    
    pageItem.appendChild(pageLabel);
    pageItem.appendChild(deleteBtn);
    pageList.appendChild(pageItem);
  }
}

// Rename a page
function renamePage(pageIndex, labelElement) {
  const pageNameKey = `dakboard-page-name-${pageIndex}`;
  const currentName = localStorage.getItem(pageNameKey) || `Page ${pageIndex + 1}`;
  
  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'page-name-input';
  input.style.cssText = `
    background: #444;
    border: 1px solid #666;
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    width: 100%;
    outline: none;
  `;
  
  // Replace label with input
  const parent = labelElement.parentNode;
  labelElement.classList.add('editing');
  labelElement.style.display = 'none';
  parent.insertBefore(input, labelElement);
  input.focus();
  input.select();
  
  // Save on Enter or blur
  const saveName = () => {
    const newName = input.value.trim() || `Page ${pageIndex + 1}`;
    localStorage.setItem(pageNameKey, newName);
    labelElement.textContent = newName;
    labelElement.classList.remove('editing');
    labelElement.style.display = '';
    parent.removeChild(input);
    updatePageList(); // Refresh to show new name
  };
  
  const cancelRename = () => {
    labelElement.classList.remove('editing');
    labelElement.style.display = '';
    parent.removeChild(input);
  };
  
  input.addEventListener('blur', saveName);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  });
}

// Export/Import Configuration Functions
function initializeConfigExportImport() {
  const exportBtn = document.getElementById('export-config-btn');
  const importBtn = document.getElementById('import-config-btn');
  const importFileInput = document.getElementById('import-config-file');
  const refreshBtn = document.getElementById('refresh-btn');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportConfiguration);
  }
  
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importConfiguration(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    });
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

// Show export dialog and handle export
function exportConfiguration() {
    // Get total pages and current page
  const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
  const currentPage = parseInt(localStorage.getItem('dakboard-current-page')) || 0;
  
  // Create and show export dialog
  const dialog = document.createElement('div');
  dialog.className = 'export-dialog-overlay';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = `
    background: var(--card-bg, #1e1e1e);
    border: 1px solid var(--border, #333);
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  dialogContent.innerHTML = `
    <h3 style="margin: 0 0 1.5rem 0; color: var(--text, #e0e0e0);">Export Configuration</h3>
    <p style="margin: 0 0 1.5rem 0; color: var(--text-secondary, #bbbbbb);">Choose what to export:</p>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <button id="export-current-page" class="export-option-btn" style="
        padding: 1rem;
        background: var(--primary, #0d6efd);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
      ">Current Page</button>
      <button id="export-all-pages" class="export-option-btn" style="
        padding: 1rem;
        background: var(--primary, #0d6efd);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
      ">All Pages (${totalPages})</button>
      <button id="export-cancel" class="export-option-btn" style="
        padding: 1rem;
        background: var(--input-bg, #2d2d2d);
        color: var(--text, #e0e0e0);
        border: 1px solid var(--border, #333);
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
      ">Cancel</button>
    </div>
  `;
  
  dialog.appendChild(dialogContent);
  document.body.appendChild(dialog);
  
  // Add hover effects
  const buttons = dialogContent.querySelectorAll('.export-option-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (btn.id !== 'export-cancel') {
        btn.style.opacity = '0.9';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.id !== 'export-cancel') {
        btn.style.opacity = '1';
      }
    });
  });
  
  // Handle button clicks
  dialogContent.querySelector('#export-current-page').addEventListener('click', () => {
    document.body.removeChild(dialog);
    performExport([currentPage]);
  });
  
  dialogContent.querySelector('#export-all-pages').addEventListener('click', () => {
    document.body.removeChild(dialog);
    const allPages = Array.from({ length: totalPages }, (_, i) => i);
    performExport(allPages);
  });
  
  dialogContent.querySelector('#export-cancel').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  // Close on overlay click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

// Perform the actual export for selected pages
function performExport(pageIndices) {
  try {
    const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    const currentPage = parseInt(localStorage.getItem('dakboard-current-page')) || 0;
    
    const config = {
      version: '3.4', // Added Tasks widget with Home Assistant integration, multi-select deletion, and inline task creation
      exportDate: new Date().toISOString(),
      metadata: {
        exportedPages: pageIndices.length,
        totalPages: totalPages,
        currentPage: currentPage
      },
      pages: []
    };
    
    // Organize data by selected pages only
    pageIndices.forEach(pageIndex => {
      if (pageIndex < 0 || pageIndex >= totalPages) return;
      const page = {
        pageIndex: pageIndex,
        name: localStorage.getItem(`dakboard-page-name-${pageIndex}`) || `Page ${pageIndex + 1}`,
        background: null,
        editMode: localStorage.getItem(`dakboard-edit-mode-page-${pageIndex}`) === 'true',
        widgets: []
      };
      
      // Get page background
      const bgKey = `dakboard-page-background-${pageIndex}`;
      const bgValue = localStorage.getItem(bgKey);
      if (bgValue) {
        try {
          page.background = JSON.parse(bgValue);
          } catch {
          page.background = bgValue;
        }
      }
      
      // Get widget visibility for this page
      const visibilityKey = `dakboard-widget-visibility-page-${pageIndex}`;
      const visibilityValue = localStorage.getItem(visibilityKey);
      let visibility = {};
      if (visibilityValue) {
        try {
          visibility = JSON.parse(visibilityValue);
        } catch (e) {
          console.warn(`Error parsing visibility for page ${pageIndex}:`, e);
        }
      }
      
      // Get widget layout for this page (stored by full instance ID)
      const layoutKey = `dakboard-widget-layout-page-${pageIndex}`;
      const layoutValue = localStorage.getItem(layoutKey);
      let layout = {};
      if (layoutValue) {
        try {
          layout = JSON.parse(layoutValue);
        } catch (e) {
          console.warn(`Error parsing layout for page ${pageIndex}:`, e);
        }
      }
      
      // Get the actual page element to check real widget states
      const pageElement = getPageElement(pageIndex);
      
      // Organize widgets for this page - get actual instances from the page
      Object.keys(WIDGET_CONFIG).forEach(widgetType => {
        const widgetInfo = WIDGET_CONFIG[widgetType];
        
        // Get all instances of this widget type on this page
        const instances = getWidgetInstances(widgetType, pageIndex);
        
        // If no instances exist, still export the widget type with default visibility
        if (instances.length === 0) {
          // Check visibility for widget type (legacy format)
          const isVisible = visibility.hasOwnProperty(widgetType) ? visibility[widgetType] === true : false;
          
        const widget = {
            widgetId: widgetType,
          name: widgetInfo.name,
          icon: widgetInfo.icon,
            visible: isVisible,
            layout: null, // No layout if widget doesn't exist
            styles: null,
            instances: []
          };
          
          // Get widget styles for this page (by widget type)
          const stylesKey = `dakboard-widget-styles-${widgetType}-page-${pageIndex}`;
        const stylesValue = localStorage.getItem(stylesKey);
        if (stylesValue) {
          try {
            widget.styles = JSON.parse(stylesValue);
          } catch (e) {
              console.warn(`Error parsing styles for ${widgetType} on page ${pageIndex}:`, e);
            }
          }
          
          page.widgets.push(widget);
        } else {
          // Export each instance separately
          instances.forEach(instance => {
            const fullWidgetId = instance.fullId;
            const widgetElement = instance.element;
            
            // Check actual visibility from DOM (most accurate)
            let isVisible = true;
            if (widgetElement) {
              isVisible = !widgetElement.classList.contains('hidden');
            } else {
              // Fallback to visibility storage (check both full ID and widget type)
              isVisible = visibility[fullWidgetId] === true || 
                         (visibility[fullWidgetId] === undefined && visibility[widgetType] === true);
            }
            
            // Get layout for this specific instance (by full instance ID)
            const instanceLayout = layout[fullWidgetId] || null;
            
            // If no layout in storage but widget exists, get current position from DOM
            let finalLayout = instanceLayout;
            if (!finalLayout && widgetElement) {
              const styleLeft = widgetElement.style.left;
              const styleTop = widgetElement.style.top;
              const styleWidth = widgetElement.style.width;
              const styleHeight = widgetElement.style.height;
              
              if (styleLeft && styleTop && styleWidth && styleHeight) {
                const rect = widgetElement.getBoundingClientRect();
                const pageRect = pageElement ? pageElement.getBoundingClientRect() : { left: 0, top: 0 };
                const zIndex = parseInt(window.getComputedStyle(widgetElement).zIndex) || 1;
                const rotation = widgetElement.getAttribute('data-rotation') ? parseFloat(widgetElement.getAttribute('data-rotation')) : 0;
                
                finalLayout = {
                  x: parseFloat(styleLeft) || (rect.left - pageRect.left),
                  y: parseFloat(styleTop) || (rect.top - pageRect.top),
                  width: parseFloat(styleWidth) || widgetElement.offsetWidth,
                  height: parseFloat(styleHeight) || widgetElement.offsetHeight,
                  zIndex: zIndex,
                  rotation: rotation
                };
              }
            }
            
            const widget = {
              widgetId: widgetType,
              instanceId: instance.instanceIndex,
              fullId: fullWidgetId,
              name: widgetInfo.name,
              icon: widgetInfo.icon,
              visible: isVisible,
              layout: finalLayout,
              styles: null
            };
            
            // Get widget styles for this specific instance
            // Styles are stored as: dakboard-widget-styles-${fullWidgetId} (no page suffix)
            // Also check legacy format: dakboard-widget-styles-${widgetType}-page-${pageIndex}
            const instanceStylesKey = `dakboard-widget-styles-${fullWidgetId}`;
            const legacyStylesKey = `dakboard-widget-styles-${widgetType}-page-${pageIndex}`;
            
            let stylesValue = localStorage.getItem(instanceStylesKey);
            if (!stylesValue) {
              stylesValue = localStorage.getItem(legacyStylesKey);
            }
            
            if (stylesValue) {
              try {
                widget.styles = JSON.parse(stylesValue);
              } catch (e) {
                console.warn(`Error parsing styles for ${fullWidgetId} on page ${pageIndex}:`, e);
              }
            }
            
        page.widgets.push(widget);
          });
        }
      });
      
      // Get whiteboard data for this page
      const whiteboardKeys = [
        `whiteboard-drawing-page-${pageIndex}`,
        `whiteboard-bg-color-page-${pageIndex}`,
        `whiteboard-ink-color-page-${pageIndex}`,
        `whiteboard-brush-size-page-${pageIndex}`
      ];
      
      const whiteboardData = {};
      let hasWhiteboardData = false;
      whiteboardKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const propName = key.replace(`whiteboard-`, '').replace(`-page-${pageIndex}`, '');
          whiteboardData[propName] = value;
          hasWhiteboardData = true;
        }
      });
      
      if (hasWhiteboardData) {
        page.whiteboard = whiteboardData;
      }
      
      config.pages.push(page);
    });
    
    // Clean up styles before export - only include gradient properties if backgroundType is gradient
    config.pages.forEach(page => {
      page.widgets.forEach(widget => {
        if (widget.styles) {
          const bgType = widget.styles.backgroundType || 'solid';
          // Remove gradient properties if not using gradient
          if (bgType !== 'gradient') {
            delete widget.styles.gradientColor1;
            delete widget.styles.gradientColor2;
            delete widget.styles.gradientDirection;
          }
          // Remove backgroundColor if using transparent
          if (bgType === 'transparent') {
            delete widget.styles.backgroundColor;
          }
        }
      });
    });
    
    // Export ALL localStorage data for exported pages
    // This ensures we capture EVERY SINGLE configuration element - 100% complete export
    pageIndices.forEach(pageIndex => {
      const page = config.pages.find(p => p.pageIndex === pageIndex);
      if (!page) return;
      
      if (!page.instanceData) page.instanceData = {};
      if (!page.localStorageData) page.localStorageData = {};
      
      // Scan ALL localStorage keys and export anything related to this page
      // This is the comprehensive approach - export everything that could be related
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        // Export ANY key that contains this page index
        if (key.includes(`-page-${pageIndex}`) || key.includes(`page-${pageIndex}-`)) {
          try {
            // Try to parse as JSON
            page.localStorageData[key] = JSON.parse(value);
          } catch (e) {
            // If not JSON, store as string
            page.localStorageData[key] = value;
          }
        }
        // Export widget styles by full instance ID (no page suffix in key, but instance ID contains page)
        else if (key.startsWith('dakboard-widget-styles-')) {
          const keyWithoutPrefix = key.replace('dakboard-widget-styles-', '');
          
          // Check if this fullWidgetId matches any widget instance on this page
          let belongsToThisPage = false;
          Object.keys(WIDGET_CONFIG).forEach(widgetType => {
            const instances = getWidgetInstances(widgetType, pageIndex);
            instances.forEach(instance => {
              if (instance.fullId === keyWithoutPrefix) {
                belongsToThisPage = true;
              }
            });
          });
          
          if (belongsToThisPage) {
            try {
              page.localStorageData[key] = JSON.parse(value);
            } catch (e) {
              page.localStorageData[key] = value;
            }
          }
        }
        // Export instance-specific state data (by full instance ID)
        else if (key.startsWith('dakboard-stopwatch-') || 
                 key.startsWith('dakboard-scoreboard-') || 
                 key.startsWith('dakboard-stoplight-') ||
                 key.startsWith('whiteboard-')) {
          // Check if this key is for a widget instance on this page
          let belongsToThisPage = false;
          
          Object.keys(WIDGET_CONFIG).forEach(widgetType => {
            const instances = getWidgetInstances(widgetType, pageIndex);
            instances.forEach(instance => {
              // Check if key contains the full instance ID
              if (key.includes(instance.fullId)) {
                belongsToThisPage = true;
              }
            });
          });
          
          if (belongsToThisPage) {
            try {
              page.localStorageData[key] = JSON.parse(value);
            } catch (e) {
              page.localStorageData[key] = value;
            }
          }
        }
      }
      
      // Also explicitly get all widget instances and ensure we export their data
      Object.keys(WIDGET_CONFIG).forEach(widgetType => {
        const instances = getWidgetInstances(widgetType, pageIndex);
        instances.forEach(instance => {
          const fullWidgetId = instance.fullId;
          
          // Export styles by full instance ID (without page suffix - this is the actual storage format)
          const stylesKey = `dakboard-widget-styles-${fullWidgetId}`;
          const stylesValue = localStorage.getItem(stylesKey);
          if (stylesValue && !page.localStorageData[stylesKey]) {
            try {
              page.localStorageData[stylesKey] = JSON.parse(stylesValue);
            } catch (e) {
              page.localStorageData[stylesKey] = stylesValue;
            }
          }
          
          // Also check for page-specific style key (legacy format)
          const pageStylesKey = `dakboard-widget-styles-${widgetType}-page-${pageIndex}`;
          const pageStylesValue = localStorage.getItem(pageStylesKey);
          if (pageStylesValue && !page.localStorageData[pageStylesKey]) {
            try {
              page.localStorageData[pageStylesKey] = JSON.parse(pageStylesValue);
            } catch (e) {
              page.localStorageData[pageStylesKey] = pageStylesValue;
            }
          }
          
          // Export all instance-specific state data
          const instanceDataKeys = [
            `dakboard-stopwatch-${fullWidgetId}`,
            `dakboard-scoreboard-config-${fullWidgetId}`,
            `dakboard-scoreboard-scores-${fullWidgetId}`,
            `dakboard-scoreboard-winners-${fullWidgetId}`,
            `dakboard-stoplight-${fullWidgetId}`,
            `whiteboard-drawing-${fullWidgetId}`,
            `whiteboard-bg-color-${fullWidgetId}`,
            `whiteboard-ink-color-${fullWidgetId}`,
            `whiteboard-brush-size-${fullWidgetId}`
          ];
          
          instanceDataKeys.forEach(dataKey => {
            const value = localStorage.getItem(dataKey);
            if (value && !page.localStorageData[dataKey]) {
              try {
                page.localStorageData[dataKey] = JSON.parse(value);
              } catch (e) {
                page.localStorageData[dataKey] = value;
              }
            }
          });
        });
      });
      
      // Explicitly export annotations for this page (main canvas)
      const annotationKey = `dakboard-annotation-page-${pageIndex}`;
      const annotationValue = localStorage.getItem(annotationKey);
      if (annotationValue && !page.localStorageData[annotationKey]) {
        page.localStorageData[annotationKey] = annotationValue; // Annotations are stored as data URLs (strings)
      }
      
      // Export highlight2Canvas strokes for this page
      const highlight2Key = `dakboard-annotation-highlight2-page-${pageIndex}`;
      const highlight2Value = localStorage.getItem(highlight2Key);
      if (highlight2Value && !page.localStorageData[highlight2Key]) {
        page.localStorageData[highlight2Key] = highlight2Value; // Highlight2 strokes are stored as JSON strings
      }
      
      // Export annotation visibility for this page
      const visibilityKey = `dakboard-annotation-visibility-page-${pageIndex}`;
      const visibilityValue = localStorage.getItem(visibilityKey);
      if (visibilityValue !== null && !page.localStorageData[visibilityKey]) {
        page.localStorageData[visibilityKey] = visibilityValue; // Visibility is stored as 'true' or 'false' string
      }
    });
    
    // Create JSON blob and trigger download
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
    
    // Generate page label for filename
    let pageLabel;
    if (pageIndices.length === 1) {
      // For single page export, use page name instead of number
      const pageIndex = pageIndices[0];
      const pageName = localStorage.getItem(`dakboard-page-name-${pageIndex}`) || `Page ${pageIndex + 1}`;
      // Sanitize page name for filename: remove invalid characters, replace spaces with hyphens
      const sanitizedName = pageName
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove invalid filename characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase() // Convert to lowercase
        .substring(0, 50); // Limit length
      pageLabel = sanitizedName || `page-${pageIndex}`;
    } else {
      pageLabel = 'all-pages';
    }
    
    a.download = `dakboard-config-${pageLabel}-${dateStr}_${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting configuration:', error);
    alert('Error exporting configuration. Please check the console for details.');
  }
}

// Import configuration from JSON file
function importConfiguration(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);
      
      // Validate format
      if (!config.pages || !Array.isArray(config.pages)) {
        throw new Error('Invalid configuration format. Expected "pages" array.');
      }
      
      if (config.pages.length === 0) {
        alert('No pages found in the import file.');
        return;
      }
      
      // Get current total pages to determine starting index for imported pages
      const currentTotalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
      let newTotalPages = currentTotalPages;
      let importedCount = 0;
      
      // Create instance ID mapping: oldFullWidgetId -> newFullWidgetId
      const instanceIdMap = new Map();
      
      // Import each page - renumber them to append after existing pages
      config.pages.forEach((page, importIndex) => {
        const oldPageIndex = page.pageIndex;
        const newPageIndex = currentTotalPages + importIndex;
        newTotalPages = Math.max(newTotalPages, newPageIndex + 1);
        
        // Import page name (keep original name)
        if (page.name) {
          localStorage.setItem(`dakboard-page-name-${newPageIndex}`, page.name);
          importedCount++;
        }
        
        // Import page background
        if (page.background) {
          const bgValue = typeof page.background === 'object' 
            ? JSON.stringify(page.background) 
            : page.background;
          localStorage.setItem(`dakboard-page-background-${newPageIndex}`, bgValue);
          importedCount++;
        }
        
        // Import edit mode
        if (page.editMode !== undefined) {
          localStorage.setItem(`dakboard-edit-mode-page-${newPageIndex}`, page.editMode.toString());
          importedCount++;
        }
        
        // Build visibility map and create instance ID mappings
        // Visibility is stored by full instance ID, but we also set widget type for backward compatibility
          const visibility = {};
        const layout = {};
        
        // Process widgets and create instance ID mappings
        page.widgets.forEach(widget => {
          const widgetType = widget.widgetId;
          
          // Handle widgets with instance information (new format)
          if (widget.fullId !== undefined || widget.instanceId !== undefined) {
            // This is an instance-specific widget
            const oldFullId = widget.fullId || generateWidgetId(widgetType, oldPageIndex, widget.instanceId || 0);
            const instanceIndex = widget.instanceId !== undefined ? widget.instanceId : 0;
            
            // Generate new instance ID
            const newFullId = generateWidgetId(widgetType, newPageIndex, instanceIndex);
            instanceIdMap.set(oldFullId, newFullId);
            
            // Set visibility by full instance ID (primary)
            visibility[newFullId] = widget.visible === true;
            
            // Also set widget type visibility if this is the first instance (for backward compatibility)
            if (instanceIndex === 0 && !visibility.hasOwnProperty(widgetType)) {
              visibility[widgetType] = widget.visible === true;
            }
            
            // Import layout by full instance ID
          if (widget.layout) {
              layout[newFullId] = widget.layout;
            }
            
            // Import styles for this instance
            // Styles are stored as: dakboard-widget-styles-${fullWidgetId} (NO page suffix)
            if (widget.styles) {
              localStorage.setItem(
                `dakboard-widget-styles-${newFullId}`,
                JSON.stringify(widget.styles)
              );
          importedCount++;
        }
          } else {
            // Legacy format: widget type only (no instances)
            // Check if there are any instance-specific data for this widget type
            const oldInstances = [];
            
            // Check if there are any instance-specific data for this widget type
            if (page.instanceData) {
              // Check stopwatch instances
              if (page.instanceData.stopwatch) {
                Object.keys(page.instanceData.stopwatch).forEach(oldFullId => {
                  if (oldFullId.startsWith(`${widgetType}-page-${oldPageIndex}-instance-`)) {
                    oldInstances.push(oldFullId);
                  }
                });
              }
              // Check scoreboard instances
              if (page.instanceData.scoreboard && page.instanceData.scoreboard.config) {
                Object.keys(page.instanceData.scoreboard.config).forEach(oldFullId => {
                  if (oldFullId.startsWith(`${widgetType}-page-${oldPageIndex}-instance-`) && !oldInstances.includes(oldFullId)) {
                    oldInstances.push(oldFullId);
                  }
                });
              }
              // Check stoplight instances
              if (page.instanceData.stoplight) {
                Object.keys(page.instanceData.stoplight).forEach(oldFullId => {
                  if (oldFullId.startsWith(`${widgetType}-page-${oldPageIndex}-instance-`) && !oldInstances.includes(oldFullId)) {
                    oldInstances.push(oldFullId);
                  }
                });
              }
              // Check whiteboard instances
              if (page.instanceData.whiteboard) {
                Object.keys(page.instanceData.whiteboard).forEach(oldFullId => {
                  if (oldFullId.startsWith(`${widgetType}-page-${oldPageIndex}-instance-`) && !oldInstances.includes(oldFullId)) {
                    oldInstances.push(oldFullId);
                  }
                });
              }
            }
            
            // If no instances found, assume at least one instance (instance-0)
            if (oldInstances.length === 0) {
              const oldFullId = generateWidgetId(widgetType, oldPageIndex, 0);
              oldInstances.push(oldFullId);
            }
            
            // Create mappings for each instance
            oldInstances.forEach((oldFullId, instanceIdx) => {
              const newFullId = generateWidgetId(widgetType, newPageIndex, instanceIdx);
              instanceIdMap.set(oldFullId, newFullId);
              
              // Set visibility for this instance
              visibility[newFullId] = widget.visible === true;
              
              // Also set widget type visibility if this is the first instance (for backward compatibility)
              if (instanceIdx === 0 && !visibility.hasOwnProperty(widgetType)) {
                visibility[widgetType] = widget.visible === true;
              }
              
              // Import layout if available (check if layout was stored by old full ID)
              if (widget.layout) {
                layout[newFullId] = widget.layout;
              }
            });
            
            // Import styles for widget type (legacy format)
            // Styles are stored as: dakboard-widget-styles-${fullWidgetId} (NO page suffix)
          if (widget.styles) {
              // Store for the first instance (instance-0)
              const newFullId = generateWidgetId(widgetType, newPageIndex, 0);
            localStorage.setItem(
                `dakboard-widget-styles-${newFullId}`,
              JSON.stringify(widget.styles)
            );
            importedCount++;
            }
          }
        });
        
        // Save visibility (by full instance ID)
        localStorage.setItem(`dakboard-widget-visibility-page-${newPageIndex}`, JSON.stringify(visibility));
        importedCount++;
        
        // Import widget layouts (by full instance ID)
        if (Object.keys(layout).length > 0) {
          localStorage.setItem(`dakboard-widget-layout-page-${newPageIndex}`, JSON.stringify(layout));
          importedCount++;
        }
        
        // Import whiteboard data (page-level)
        if (page.whiteboard) {
          Object.keys(page.whiteboard).forEach(key => {
            const whiteboardKey = `whiteboard-${key}-page-${newPageIndex}`;
            localStorage.setItem(whiteboardKey, page.whiteboard[key]);
            importedCount++;
          });
        }
        
        // Import ALL localStorage data (new comprehensive format)
        // This must happen AFTER we've set visibility, layout, and styles above
        // to avoid overwriting them, but we check if keys already exist
        if (page.localStorageData) {
          Object.keys(page.localStorageData).forEach(oldKey => {
            const value = page.localStorageData[oldKey];
            
            // Remap keys that contain old instance IDs to new instance IDs
            let newKey = oldKey;
            
            // Check if this key contains any old full instance IDs that need remapping
            instanceIdMap.forEach((newFullId, oldFullId) => {
              if (oldKey.includes(oldFullId)) {
                newKey = oldKey.replace(oldFullId, newFullId);
              }
            });
            
            // Handle widget styles specially - they should NOT have page suffix
            // Format: dakboard-widget-styles-${fullWidgetId} (no -page- suffix)
            if (newKey.startsWith('dakboard-widget-styles-')) {
              // Remove any -page- suffix from widget styles keys
              newKey = newKey.replace(/-page-\d+$/, '');
              // Also remap instance IDs in the key
              instanceIdMap.forEach((newFullId, oldFullId) => {
                if (newKey.includes(oldFullId)) {
                  newKey = newKey.replace(oldFullId, newFullId);
                }
              });
            } else {
              // For other keys, remap page indices
              if (newKey.includes(`-page-${oldPageIndex}`)) {
                newKey = newKey.replace(`-page-${oldPageIndex}`, `-page-${newPageIndex}`);
              }
            }
            
            // Skip if we've already set this key above (visibility, layout, styles from widget objects)
            // This prevents overwriting what we just imported, but we still want to import styles from localStorageData
            // because they might have additional data not in widget.styles
            const alreadySet = 
              newKey === `dakboard-widget-visibility-page-${newPageIndex}` ||
              newKey === `dakboard-widget-layout-page-${newPageIndex}`;
            
            // For styles, we want to merge/overwrite from localStorageData since it might have more complete data
            if (!alreadySet) {
              // Store the value
              if (typeof value === 'object') {
                localStorage.setItem(newKey, JSON.stringify(value));
              } else {
                localStorage.setItem(newKey, value);
              }
              importedCount++;
            }
          });
        }
        
        // Import legacy instance-specific data format (for backward compatibility)
        if (page.instanceData) {
          // Import stopwatch states
          if (page.instanceData.stopwatch) {
            Object.keys(page.instanceData.stopwatch).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const stopwatchKey = `dakboard-stopwatch-${newFullId}`;
                localStorage.setItem(stopwatchKey, JSON.stringify(page.instanceData.stopwatch[oldFullId]));
                importedCount++;
              }
            });
          }
          
          // Import scoreboard config
          if (page.instanceData.scoreboard && page.instanceData.scoreboard.config) {
            Object.keys(page.instanceData.scoreboard.config).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const configKey = `dakboard-scoreboard-config-${newFullId}`;
                localStorage.setItem(configKey, JSON.stringify(page.instanceData.scoreboard.config[oldFullId]));
                importedCount++;
              }
            });
          }
          
          // Import scoreboard scores
          if (page.instanceData.scoreboard && page.instanceData.scoreboard.scores) {
            Object.keys(page.instanceData.scoreboard.scores).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const scoresKey = `dakboard-scoreboard-scores-${newFullId}`;
                localStorage.setItem(scoresKey, JSON.stringify(page.instanceData.scoreboard.scores[oldFullId]));
                importedCount++;
              }
            });
          }
          
          // Import scoreboard winners
          if (page.instanceData.scoreboard && page.instanceData.scoreboard.winners) {
            Object.keys(page.instanceData.scoreboard.winners).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const winnersKey = `dakboard-scoreboard-winners-${newFullId}`;
                localStorage.setItem(winnersKey, JSON.stringify(page.instanceData.scoreboard.winners[oldFullId]));
                importedCount++;
              }
            });
          }
          
          // Import stoplight state
          if (page.instanceData.stoplight) {
            Object.keys(page.instanceData.stoplight).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const stoplightKey = `dakboard-stoplight-${newFullId}`;
                localStorage.setItem(stoplightKey, page.instanceData.stoplight[oldFullId]);
                importedCount++;
              }
            });
          }
          
          // Import instance-specific whiteboard data
          if (page.instanceData.whiteboard) {
            Object.keys(page.instanceData.whiteboard).forEach(oldFullId => {
              const newFullId = instanceIdMap.get(oldFullId);
              if (newFullId) {
                const whiteboardData = page.instanceData.whiteboard[oldFullId];
                Object.keys(whiteboardData).forEach(key => {
                  const whiteboardKey = `whiteboard-${key}-${newFullId}`;
                  localStorage.setItem(whiteboardKey, whiteboardData[key]);
                  importedCount++;
                });
              }
            });
          }
        }
      });
      
      // Update total pages
      localStorage.setItem('dakboard-total-pages', newTotalPages.toString());
      
      // Keep current page (don't change it)
      // Reload the page to apply the new configuration
      alert(`Successfully imported ${config.pages.length} page(s)! The page will reload to apply changes.`);
      window.location.reload();
      
    } catch (error) {
      console.error('Error importing configuration:', error);
      alert('Error importing configuration. Please ensure the file is a valid JSON configuration file.\n\nError: ' + error.message);
    }
  };
  
  reader.onerror = () => {
    alert('Error reading file. Please try again.');
  };
  
  reader.readAsText(file);
}

// Setup page management event listeners
function setupPageManagement() {
  const addPageBtn = document.getElementById('add-page-btn');
  if (addPageBtn) {
    // Remove any existing listeners by cloning and replacing
    const newBtn = addPageBtn.cloneNode(true);
    addPageBtn.parentNode.replaceChild(newBtn, addPageBtn);
    
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addPage();
    });
  } else {
    console.error('add-page-btn not found!');
  }
}

