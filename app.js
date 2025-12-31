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
  
  // Thermostat Configuration
  HA_THERMOSTAT_1: 'climate.trane_z_wave_programmable_thermostat', // Basement
  HA_THERMOSTAT_2: 'climate.trane_z_wave_programmable_thermostat_2', // Living Room
  HA_THERMOSTAT_3: 'climate.trane_z_wave_programmable_thermostat_3', // Master Bedroom
  
  // Google Photos Configuration
  GOOGLE_PHOTOS_ALBUM_ID: null, // Optional: Specific album ID to display photos from. If null or empty, randomizes from all photos.
  
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
  
  loadAllData();
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
  const grids = document.querySelectorAll('#calendar-grid');
  const weekRanges = document.querySelectorAll('#week-range');
  if (grids.length === 0) return;
  
  // Update all calendar widgets across all pages
  grids.forEach((grid, index) => {
    const weekRange = weekRanges[index];
  
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
      loadGooglePhotos(), // Load Google Photos (using Picker API if enabled)
      loadThermostat(), // Load thermostat
      loadNews(), // Load news feed
      initializeWhiteboard(), // Initialize whiteboard
      loadCalendarEvents() // Reload calendar events on refresh
    ]);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load weather data from HA
async function loadWeather() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_WEATHER_ENTITY);
    if (!entity) return;
    
    const state = entity.state;
    const attrs = entity.attributes;
    
    // Find all weather widgets across all pages
    const icons = document.querySelectorAll('#weather-icon');
    const temps = document.querySelectorAll('#weather-temp');
    const conditions = document.querySelectorAll('#weather-conditions');
    const feelsLikes = document.querySelectorAll('#weather-feels-like');
    const humidities = document.querySelectorAll('#weather-humidity');
    const winds = document.querySelectorAll('#weather-wind');
    const weatherTimes = document.querySelectorAll('#weather-time');
    
    // Update current conditions
    const icon = getWeatherIcon(attrs.condition || state);
    icons.forEach(el => el.textContent = icon);
    
    // Primary temp is now "Feels Like" (apparent temperature)
    const feelsLike = attrs.apparent_temperature || attrs.temperature || attrs.temp || '--';
    temps.forEach(el => el.textContent = `${Math.round(feelsLike)}°F`);
    
    // Update condition text
    const condition = attrs.condition || state || '--';
    conditions.forEach(el => el.textContent = condition);
    
    // Hide date/time (removed since we have clock widget)
    weatherTimes.forEach(el => el.style.display = 'none');
    
    // Update details - "Actual Temperature" shows the current temp
    const actualTemp = attrs.temperature || attrs.temp || '--';
    const actualTempText = actualTemp !== '--' ? `${Math.round(actualTemp)}°F` : '--°F';
    feelsLikes.forEach(el => el.textContent = actualTempText);
    humidities.forEach(el => el.textContent = attrs.humidity ? `${Math.round(attrs.humidity)}%` : '--%');
    winds.forEach(el => el.textContent = attrs.wind_speed ? `${Math.round(attrs.wind_speed)} mph` : '-- mph');
    
    // Load forecast
    loadWeatherForecast(attrs);
  } catch (error) {
    console.error('Error loading weather:', error);
    const conditions = document.querySelectorAll('#weather-conditions');
    conditions.forEach(el => el.textContent = 'Error loading weather');
  }
}

// Load weather forecast from Pirate Weather entities
async function loadWeatherForecast(attrs) {
  const forecastLists = document.querySelectorAll('#weather-forecast-list');
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
      console.log('Pirate Weather entities found:', pirateEntities);
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
    // Find all todo widgets across all pages
    const todoListElements = document.querySelectorAll('#todo-list');
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
  const tabsContainers = document.querySelectorAll('#todo-tabs');
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
  
  const containers = document.querySelectorAll('#garage-doors');
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
  } catch (error) {
    console.error('Error toggling garage door:', error);
    // Still show success message since the webhook likely worked
  } finally {
    doorElement.classList.remove('loading');
  }
}

// Load alarm status from HA
async function loadAlarm() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_ALARM_ENTITY);
    if (!entity) {
      const statusTexts = document.querySelectorAll('#alarm-status-text');
      statusTexts.forEach(el => el.textContent = 'Not Available');
      return;
    }
    
    const state = entity.state;
    const statusDivs = document.querySelectorAll('#alarm-status');
    const icons = document.querySelectorAll('#alarm-icon');
    const texts = document.querySelectorAll('#alarm-status-text');
    
    if (statusDivs.length === 0) return;
    
    // Update all alarm widgets across all pages
    statusDivs.forEach((statusDiv, index) => {
      const icon = icons[index];
      const text = texts[index];
      if (!icon || !text) return;
      
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
    const statusTexts = document.querySelectorAll('#alarm-status-text');
    statusTexts.forEach(el => el.textContent = 'Error');
  }
}

// Set alarm (only works when disarmed)
async function setAlarm() {
  // Don't allow interaction in edit mode
  if (isEditMode) return;
  
  // Check current state - only allow if disarmed (check first instance)
  const statusDivs = document.querySelectorAll('#alarm-status');
  if (statusDivs.length > 0 && statusDivs[0].classList.contains('armed')) {
    return;
  }
  
  // Add loading state to all alarm icons
  const icons = document.querySelectorAll('#alarm-icon');
  icons.forEach(icon => icon.classList.add('loading'));
  
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
  } catch (error) {
    console.error('Error setting alarm:', error);
    // Still reload alarm since the webhook likely worked (serverless function may return 500 even on success)
    // This matches the garage widget behavior
    setTimeout(() => {
      loadAlarm();
    }, 1000);
    // Don't show error toast since webhook likely succeeded despite the error
  } finally {
    // Remove loading state from all alarm icons
    const allIcons = document.querySelectorAll('#alarm-icon');
    allIcons.forEach(icon => icon.classList.remove('loading'));
  }
}

// Google Photos state
let googlePhotosCache = {
  photos: [],
  currentIndex: 0,
  lastUpdate: 0,
  updateInterval: null
};

// Google Picker API state (NEW - replaces deprecated Library API)
let googlePickerState = {
  accessToken: null,
  selectedPhotos: [],
  pickerSessionId: null,
  isInitialized: false
};

// Check if Google Photos is authenticated
function isGooglePhotosAuthenticated() {
  const accessToken = localStorage.getItem('google_photos_access_token');
  const refreshToken = localStorage.getItem('google_photos_refresh_token');
  return !!(accessToken || refreshToken);
}

// Get valid access token (refresh if needed)
async function getGooglePhotosAccessToken() {
  const accessToken = localStorage.getItem('google_photos_access_token');
  const refreshToken = localStorage.getItem('google_photos_refresh_token');
  const tokenExpiry = parseInt(localStorage.getItem('google_photos_token_expiry') || '0');
  
  // If token is still valid, return it
  if (accessToken && Date.now() < tokenExpiry - 60000) { // Refresh 1 minute before expiry
    return accessToken;
  }
  
  // If we have a refresh token, use it to get a new access token
  if (refreshToken) {
    try {
      const response = await fetch('/api/google-photos-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (response.ok) {
        const tokens = await response.json();
        localStorage.setItem('google_photos_access_token', tokens.access_token);
        localStorage.setItem('google_photos_token_expiry', tokens.expiry.toString());
        return tokens.access_token;
      } else {
        // Refresh token expired or invalid, need to re-authenticate
        localStorage.removeItem('google_photos_access_token');
        localStorage.removeItem('google_photos_refresh_token');
        localStorage.removeItem('google_photos_token_expiry');
        return null;
      }
    } catch (error) {
      console.error('Error refreshing Google Photos token:', error);
      return null;
    }
  }
  
  return null;
}

// Initiate Google Photos OAuth flow
function connectGooglePhotos() {
  window.open('/api/google-photos-auth', 'google-photos-auth', 'width=600,height=700');
  
  // Listen for auth success message
  const messageHandler = (event) => {
    if (event.data.type === 'GOOGLE_PHOTOS_AUTH_SUCCESS') {
      // Reload photos after successful auth
      loadGooglePhotos();
      window.removeEventListener('message', messageHandler);
    }
  };
  window.addEventListener('message', messageHandler);
}

// Make function globally accessible for onclick handlers
window.connectGooglePhotos = connectGooglePhotos;

// Fetch photos from Google Photos API
async function fetchGooglePhotos() {
  try {
    const accessToken = await getGooglePhotosAccessToken();
    
    if (!accessToken) {
      // Not authenticated, show connect button
      showGooglePhotosAuthPrompt();
      return;
    }
    
    // Build API URL
    let apiUrl = `/api/google-photos?access_token=${encodeURIComponent(accessToken)}&page_size=100`;
    if (CONFIG.GOOGLE_PHOTOS_ALBUM_ID) {
      apiUrl += `&album_id=${encodeURIComponent(CONFIG.GOOGLE_PHOTOS_ALBUM_ID)}`;
    }
    
    const response = await fetch(apiUrl);
    
    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await getGooglePhotosAccessToken();
      if (!newToken) {
        showGooglePhotosAuthPrompt();
        return;
      }
      // Retry with new token
      apiUrl = `/api/google-photos?access_token=${encodeURIComponent(newToken)}&page_size=100`;
      if (CONFIG.GOOGLE_PHOTOS_ALBUM_ID) {
        apiUrl += `&album_id=${encodeURIComponent(CONFIG.GOOGLE_PHOTOS_ALBUM_ID)}`;
      }
      const retryResponse = await fetch(apiUrl);
      if (!retryResponse.ok) {
        throw new Error('Failed to fetch photos after token refresh');
      }
      const data = await retryResponse.json();
      googlePhotosCache.photos = data.photos || [];
    } else if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `Failed to fetch photos: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('Google Photos API error details:', errorData);
        
        // If it's a scope error (403), clear tokens and prompt for re-auth
        if (response.status === 403 && (errorMessage.includes('insufficient authentication scopes') || 
            errorMessage.includes('PERMISSION_DENIED'))) {
          console.warn('Scope error detected - clearing tokens and prompting for re-authentication');
          clearGooglePhotosTokens();
          showGooglePhotosAuthPrompt();
          return;
        }
      } catch (e) {
        const errorText = await response.text();
        console.error('Google Photos API error text:', errorText);
      }
      throw new Error(errorMessage);
    } else {
      const data = await response.json();
      googlePhotosCache.photos = data.photos || [];
    }
    
    // If album is empty, fetch from all photos
    if (googlePhotosCache.photos.length === 0 && CONFIG.GOOGLE_PHOTOS_ALBUM_ID) {
      const allPhotosUrl = `/api/google-photos?access_token=${encodeURIComponent(accessToken)}&page_size=100`;
      const allPhotosResponse = await fetch(allPhotosUrl);
      if (allPhotosResponse.ok) {
        const allPhotosData = await allPhotosResponse.json();
        googlePhotosCache.photos = allPhotosData.photos || [];
      }
    }
    
    googlePhotosCache.lastUpdate = Date.now();
    
    // Display a random photo
    if (googlePhotosCache.photos.length > 0) {
      displayRandomGooglePhoto();
    } else {
      // Show message if no photos found
      const containers = document.querySelectorAll('#photos-content');
      const noPhotosHtml = `
        <div class="photos-placeholder">
          <div class="photos-icon">📷</div>
          <h3>No Photos Found</h3>
          <p>Your Google Photos library appears to be empty, or photos are not accessible.</p>
          <p style="font-size: 12px; color: #888; margin-top: 8px;">
            Check the browser console (F12) for more details.
          </p>
        </div>
      `;
      containers.forEach(container => container.innerHTML = noPhotosHtml);
    }
  } catch (error) {
    console.error('Error fetching Google Photos:', error);
    const containers = document.querySelectorAll('#photos-content');
    if (containers.length > 0) {
      let errorMessage = error.message;
      let showReconnect = true;
      
      // Check if it's a scope error
      if (errorMessage.includes('insufficient authentication scopes') || 
          errorMessage.includes('PERMISSION_DENIED')) {
        errorMessage = 'Authentication scope error. Please reconnect to grant proper permissions.';
        showReconnect = true;
      }
      
      const errorHtml = `
        <div class="photos-placeholder">
          <div class="photos-icon">📷</div>
          <h3>Error Loading Photos</h3>
          <p>${errorMessage}</p>
          ${showReconnect ? `
            <button onclick="clearGooglePhotosTokens(); connectGooglePhotos();" class="photos-connect-btn">
              Reconnect Google Photos
            </button>
          ` : ''}
        </div>
      `;
      containers.forEach(container => container.innerHTML = errorHtml);
    }
  }
}

// Display a random photo from cache
function displayRandomGooglePhoto() {
  const containers = document.querySelectorAll('#photos-content');
  if (containers.length === 0) return;
  
  if (googlePhotosCache.photos.length === 0) {
    const noPhotosHtml = `
      <div class="photos-placeholder">
        <div class="photos-icon">📷</div>
        <h3>No Photos Found</h3>
        <p>No photos available in your Google Photos library.</p>
        <p style="font-size: 12px; color: #888; margin-top: 8px;">
          Make sure you have photos in your Google Photos account.
        </p>
      </div>
    `;
    containers.forEach(container => container.innerHTML = noPhotosHtml);
    return;
  }
  
  // Select random photo
  const randomIndex = Math.floor(Math.random() * googlePhotosCache.photos.length);
  const photo = googlePhotosCache.photos[randomIndex];
  
  // Use medium size if available, fallback to baseUrl
  const imageUrl = photo.medium || photo.baseUrl;
  
  if (!imageUrl) {
    console.error('Photo has no URL:', photo);
    const errorHtml = `
      <div class="photos-placeholder">
        <div class="photos-icon">📷</div>
        <h3>Photo Error</h3>
        <p>Photo found but URL is missing.</p>
      </div>
    `;
    containers.forEach(container => container.innerHTML = errorHtml);
    return;
  }
  
  const photoHtml = `
    <div class="photos-display">
      <img src="${imageUrl}" alt="Google Photo" class="photos-image" 
           onerror="console.error('Image load error:', this.src); this.src='${photo.baseUrl || imageUrl}'" />
    </div>
  `;
  containers.forEach(container => container.innerHTML = photoHtml);
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

// Load thermostat data
async function loadThermostat() {
  // Find all thermostat widgets across all pages
  const selectors = document.querySelectorAll('#thermostat-selector');
  const displays = document.querySelectorAll('#thermostat-display');
  
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
    
    // Update all displays across all pages
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
  // Find all news widgets across all pages
  const containers = document.querySelectorAll('#news-content');
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
let whiteboardCanvas = null;
let whiteboardCtx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Initialize whiteboard
function initializeWhiteboard() {
  // Find whiteboard canvas on current page
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') 
    ? window.currentPageIndex 
    : 0;
  const currentPage = document.querySelector(`.dashboard.page[data-page-id="${currentPageIndex}"]`);
  const canvas = currentPage ? currentPage.querySelector('#whiteboard-canvas') : document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  whiteboardCanvas = canvas;
  whiteboardCtx = canvas.getContext('2d');
  
  // Set canvas size to match container
  const container = canvas.closest('.whiteboard-container');
  const widget = canvas.closest('.whiteboard-widget');
  if (container && widget) {
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
            whiteboardCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = oldImage;
        } else {
          const pageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
          const bgColor = localStorage.getItem(`whiteboard-bg-color-page-${pageIndex}`) || '#ffffff';
          whiteboardCtx.fillStyle = bgColor;
          whiteboardCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
    
    resizeCanvas();
    
    // Observe both container and widget for resize
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    resizeObserver.observe(widget);
  }
  
  // Set default background color (page-specific)
  const bgColor = localStorage.getItem(`whiteboard-bg-color-page-${currentPageIndex}`) || '#ffffff';
  whiteboardCtx.fillStyle = bgColor;
  whiteboardCtx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Load saved drawing (page-specific) - must be done after canvas is sized
  const savedDrawing = localStorage.getItem(`whiteboard-drawing-page-${currentPageIndex}`);
  if (savedDrawing) {
    const img = new Image();
    img.onload = () => {
      whiteboardCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = savedDrawing;
  }
  
  // Load saved settings (page-specific)
  const savedInkColor = localStorage.getItem(`whiteboard-ink-color-page-${currentPageIndex}`) || '#000000';
  const savedBrushSize = localStorage.getItem(`whiteboard-brush-size-page-${currentPageIndex}`) || '3';
  
  // Find controls on current page (whiteboard controls are in the widget header)
  const whiteboardWidget = canvas.closest('.whiteboard-widget');
  const inkColorInput = whiteboardWidget ? whiteboardWidget.querySelector('#whiteboard-ink-color') : document.getElementById('whiteboard-ink-color');
  const bgColorInput = whiteboardWidget ? whiteboardWidget.querySelector('#whiteboard-bg-color') : document.getElementById('whiteboard-bg-color');
  const brushSizeInput = whiteboardWidget ? whiteboardWidget.querySelector('#whiteboard-brush-size') : document.getElementById('whiteboard-brush-size');
  const brushSizeLabel = whiteboardWidget ? whiteboardWidget.querySelector('#whiteboard-brush-size-label') : document.getElementById('whiteboard-brush-size-label');
  const clearBtn = whiteboardWidget ? whiteboardWidget.querySelector('#whiteboard-clear') : document.getElementById('whiteboard-clear');
  
  if (inkColorInput) inkColorInput.value = savedInkColor;
  if (bgColorInput) bgColorInput.value = bgColor;
  if (brushSizeInput) {
    brushSizeInput.value = savedBrushSize;
    if (brushSizeLabel) brushSizeLabel.textContent = `${savedBrushSize}px`;
  }
  
  // Event listeners
  if (clearBtn) {
    clearBtn.addEventListener('click', clearWhiteboard);
  }
  
  if (inkColorInput) {
    inkColorInput.addEventListener('change', (e) => {
      localStorage.setItem(`whiteboard-ink-color-page-${currentPageIndex}`, e.target.value);
    });
  }
  
  if (bgColorInput) {
    bgColorInput.addEventListener('change', (e) => {
      const newBgColor = e.target.value;
      localStorage.setItem(`whiteboard-bg-color-page-${currentPageIndex}`, newBgColor);
      // Redraw canvas with new background
      const currentImage = canvas.toDataURL();
      whiteboardCtx.fillStyle = newBgColor;
      whiteboardCtx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.onload = () => {
        whiteboardCtx.drawImage(img, 0, 0);
      };
      img.src = currentImage;
      saveWhiteboard();
    });
  }
  
  if (brushSizeInput && brushSizeLabel) {
    brushSizeInput.addEventListener('input', (e) => {
      const size = e.target.value;
      brushSizeLabel.textContent = `${size}px`;
      localStorage.setItem(`whiteboard-brush-size-page-${currentPageIndex}`, size);
    });
  }
  
  // Drawing event listeners (only in normal mode)
  setupWhiteboardDrawing();
}

// Setup whiteboard drawing
function setupWhiteboardDrawing() {
  if (!whiteboardCanvas) return;
  
  // Remove existing listeners
  whiteboardCanvas.removeEventListener('mousedown', startDrawing);
  whiteboardCanvas.removeEventListener('mousemove', draw);
  whiteboardCanvas.removeEventListener('mouseup', stopDrawing);
  whiteboardCanvas.removeEventListener('mouseout', stopDrawing);
  whiteboardCanvas.removeEventListener('touchstart', startDrawingTouch);
  whiteboardCanvas.removeEventListener('touchmove', drawTouch);
  whiteboardCanvas.removeEventListener('touchend', stopDrawing);
  
  // Only enable drawing in normal mode
  if (!isEditMode) {
    whiteboardCanvas.addEventListener('mousedown', startDrawing);
    whiteboardCanvas.addEventListener('mousemove', draw);
    whiteboardCanvas.addEventListener('mouseup', stopDrawing);
    whiteboardCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    whiteboardCanvas.addEventListener('touchstart', startDrawingTouch, { passive: false });
    whiteboardCanvas.addEventListener('touchmove', drawTouch, { passive: false });
    whiteboardCanvas.addEventListener('touchend', stopDrawing);
    
    whiteboardCanvas.style.cursor = 'crosshair';
  } else {
    whiteboardCanvas.style.cursor = 'default';
  }
}

// Start drawing
function startDrawing(e) {
  if (isEditMode) return;
  isDrawing = true;
  const rect = whiteboardCanvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
}

// Start drawing (touch)
function startDrawingTouch(e) {
  if (isEditMode) return;
  e.preventDefault();
  isDrawing = true;
  const touch = e.touches[0];
  const rect = whiteboardCanvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
}

// Draw
function draw(e) {
  if (!isDrawing || isEditMode) return;
  
  const rect = whiteboardCanvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  const inkColorInput = whiteboardCanvas.closest('.whiteboard-widget')?.querySelector('#whiteboard-ink-color') || document.getElementById('whiteboard-ink-color');
  const brushSizeInput = whiteboardCanvas.closest('.whiteboard-widget')?.querySelector('#whiteboard-brush-size') || document.getElementById('whiteboard-brush-size');
  const inkColor = inkColorInput?.value || localStorage.getItem(`whiteboard-ink-color-page-${currentPageIndex}`) || '#000000';
  const brushSize = parseInt(brushSizeInput?.value || localStorage.getItem(`whiteboard-brush-size-page-${currentPageIndex}`) || '3');
  
  whiteboardCtx.strokeStyle = inkColor;
  whiteboardCtx.lineWidth = brushSize;
  whiteboardCtx.lineCap = 'round';
  whiteboardCtx.lineJoin = 'round';
  
  whiteboardCtx.beginPath();
  whiteboardCtx.moveTo(lastX, lastY);
  whiteboardCtx.lineTo(currentX, currentY);
  whiteboardCtx.stroke();
  
  lastX = currentX;
  lastY = currentY;
  
  // Save drawing immediately after each stroke segment
  saveWhiteboard();
  
  saveWhiteboard();
}

// Draw (touch)
function drawTouch(e) {
  if (!isDrawing || isEditMode) return;
  e.preventDefault();
  
  const touch = e.touches[0];
  const rect = whiteboardCanvas.getBoundingClientRect();
  const currentX = touch.clientX - rect.left;
  const currentY = touch.clientY - rect.top;
  
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  const inkColorInput = whiteboardCanvas.closest('.whiteboard-widget')?.querySelector('#whiteboard-ink-color') || document.getElementById('whiteboard-ink-color');
  const brushSizeInput = whiteboardCanvas.closest('.whiteboard-widget')?.querySelector('#whiteboard-brush-size') || document.getElementById('whiteboard-brush-size');
  const inkColor = inkColorInput?.value || localStorage.getItem(`whiteboard-ink-color-page-${currentPageIndex}`) || '#000000';
  const brushSize = parseInt(brushSizeInput?.value || localStorage.getItem(`whiteboard-brush-size-page-${currentPageIndex}`) || '3');
  
  whiteboardCtx.strokeStyle = inkColor;
  whiteboardCtx.lineWidth = brushSize;
  whiteboardCtx.lineCap = 'round';
  whiteboardCtx.lineJoin = 'round';
  
  whiteboardCtx.beginPath();
  whiteboardCtx.moveTo(lastX, lastY);
  whiteboardCtx.lineTo(currentX, currentY);
  whiteboardCtx.stroke();
  
  lastX = currentX;
  lastY = currentY;
  
  // Save drawing immediately after each stroke segment
  saveWhiteboard();
  
  saveWhiteboard();
}

// Stop drawing
function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    saveWhiteboard();
  }
}

// Clear whiteboard
function clearWhiteboard() {
  if (!whiteboardCanvas || !whiteboardCtx) return;
  
  const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
  const bgColorInput = whiteboardCanvas.closest('.whiteboard-widget')?.querySelector('#whiteboard-bg-color') || document.getElementById('whiteboard-bg-color');
  const bgColor = bgColorInput?.value || localStorage.getItem(`whiteboard-bg-color-page-${currentPageIndex}`) || '#ffffff';
  whiteboardCtx.fillStyle = bgColor;
  whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
  
  localStorage.removeItem(`whiteboard-drawing-page-${currentPageIndex}`);
  saveWhiteboard();
}

// Save whiteboard to localStorage (page-specific)
function saveWhiteboard() {
  if (!whiteboardCanvas) return;
  
  try {
    const currentPageIndex = (typeof window !== 'undefined' && typeof window.currentPageIndex !== 'undefined') ? window.currentPageIndex : 0;
    const dataURL = whiteboardCanvas.toDataURL('image/png');
    localStorage.setItem(`whiteboard-drawing-page-${currentPageIndex}`, dataURL);
  } catch (error) {
    console.error('Error saving whiteboard:', error);
  }
}

// Show authentication prompt
function showGooglePhotosAuthPrompt() {
  const containers = document.querySelectorAll('#photos-content');
  if (containers.length === 0) return;
  
  const authHtml = `
    <div class="photos-placeholder">
      <div class="photos-icon">📷</div>
      <h3>Connect Google Photos</h3>
      <p>Click the button below to connect your Google Photos account.</p>
      <button onclick="connectGooglePhotos()" class="photos-connect-btn">Connect Google Photos</button>
    </div>
  `;
  containers.forEach(container => container.innerHTML = authHtml);
}

// Clear Google Photos tokens (for re-authentication)
function clearGooglePhotosTokens() {
  localStorage.removeItem('google_photos_access_token');
  localStorage.removeItem('google_photos_refresh_token');
  localStorage.removeItem('google_photos_token_expiry');
}

// Make function globally accessible
window.clearGooglePhotosTokens = clearGooglePhotosTokens;

// Load Google Photos
async function loadGooglePhotos() {
  const containers = document.querySelectorAll('#photos-content');
  if (containers.length === 0) return;
  
  // NEW: Use Google Picker API if enabled (replaces deprecated Library API)
  if (CONFIG.USE_GOOGLE_PICKER_API) {
    await loadGooglePhotosWithPicker();
    return;
  }
  
  // OLD: Legacy Google Photos Library API (deprecated)
  // Check if authenticated
  if (!isGooglePhotosAuthenticated()) {
    showGooglePhotosAuthPrompt();
    return;
  }
  
  // Fetch photos
  await fetchGooglePhotos();
  
  // Set up auto-refresh every 1 minute
  if (googlePhotosCache.updateInterval) {
    clearInterval(googlePhotosCache.updateInterval);
  }
  
  googlePhotosCache.updateInterval = setInterval(() => {
    // Refresh photo cache every 5 minutes, but display new random photo every minute
    if (Date.now() - googlePhotosCache.lastUpdate > 5 * 60 * 1000) {
      fetchGooglePhotos();
    } else {
      // Just display a new random photo from cache
      displayRandomGooglePhoto();
    }
  }, 60 * 1000); // Every 1 minute
}

// ============================================================================
// GOOGLE PICKER API IMPLEMENTATION (NEW - replaces deprecated Library API)
// ============================================================================
// This implementation uses the Google Photos Picker API which allows users
// to explicitly select photos to share, providing better privacy controls.
// Currently disabled until app verification is complete.
// ============================================================================

// Initialize Google Picker API
async function initializeGooglePicker() {
  if (!CONFIG.USE_GOOGLE_PICKER_API) {
    throw new Error('Google Picker API is disabled');
  }
  
  // Get Client ID - try config first, then fetch from API (environment variable)
  let clientId = CONFIG.GOOGLE_PICKER_CLIENT_ID || CONFIG.GOOGLE_PHOTOS_CLIENT_ID;
  
  // If not in config, fetch from API endpoint (reads from environment variable)
  if (!clientId) {
    try {
      const response = await fetch('/api/google-picker-client-id');
      if (response.ok) {
        const data = await response.json();
        clientId = data.clientId;
        // Cache it for future use
        CONFIG.GOOGLE_PHOTOS_CLIENT_ID = clientId;
      } else {
        const errorMsg = 'Google Picker API Client ID not configured. Please set GOOGLE_PHOTOS_CLIENT_ID environment variable in Vercel.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Failed to fetch Google Client ID from server. Please check your environment variables.';
      console.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }
  
  if (!clientId) {
    const errorMsg = 'Google Picker API Client ID not configured. Set GOOGLE_PICKER_CLIENT_ID in config.js or GOOGLE_PHOTOS_CLIENT_ID environment variable.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    // Load Google Identity Services and Picker API scripts
    await loadGooglePickerScript();
    
    // Check if both GIS and gapi are loaded
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Identity Services not loaded');
    }
    
    if (!window.gapi) {
      throw new Error('Google API client not loaded');
    }
    
    googlePickerState.isInitialized = true;
  } catch (error) {
    console.error('Error initializing Google Picker API:', error);
    console.error('Error type:', typeof error);
    console.error('Error keys:', error ? Object.keys(error) : 'null');
    console.error('Error stringified:', JSON.stringify(error, null, 2));
    console.error('Current origin:', window.location.origin);
    console.error('Client ID being used:', CONFIG.GOOGLE_PICKER_CLIENT_ID || CONFIG.GOOGLE_PHOTOS_CLIENT_ID || 'Not found');
    googlePickerState.isInitialized = false;
    
    // Check if it's an origin registration error
    const errorMessage = error?.message || error?.details || String(error);
    const errorError = error?.error || error?.errorCode;
    
    if (errorError === 'idpiframe_initialization_failed' || 
        errorMessage?.includes('not been registered') ||
        errorMessage?.includes('origin') ||
        errorError === 'origin_mismatch') {
      const originError = new Error(`Google Picker API initialization failed. Current origin: ${window.location.origin}. Please check: 1) Origin '${window.location.origin}' is registered in Authorized JavaScript origins (exact match, no trailing slash), 2) Google Picker API is ENABLED in APIs & Services > Library, 3) The scope 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly' is added to OAuth consent screen, 4) Client ID matches. Error details: ${errorMessage || JSON.stringify(error)}`);
      originError.originalError = error;
      throw originError;
    }
    
    // Re-throw with more context
    const enhancedError = new Error(`Google Picker API initialization failed: ${errorMessage || String(error)}. Check browser console for full error details.`);
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

// Load Google Identity Services (GIS) script - replaces deprecated gapi.auth2
function loadGooglePickerScript() {
  return new Promise((resolve, reject) => {
    // Check if Google Identity Services is already loaded
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      // Already loaded
      resolve();
      return;
    }
    
    // Ensure document is ready before loading script
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => loadGooglePickerScript().then(resolve).catch(reject));
      return;
    }
    
    // Load Google Identity Services library (new, replaces deprecated gapi.auth2)
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Check if Google Identity Services loaded successfully
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(new Error('Failed to load Google Identity Services'));
        return;
      }
      
      // Also load the Picker API
      const pickerScript = document.createElement('script');
      pickerScript.src = 'https://apis.google.com/js/api.js';
      pickerScript.onload = () => {
        if (!window.gapi || !window.gapi.load) {
          reject(new Error('Failed to load Google API client'));
          return;
        }
        
        // Load picker API
        window.gapi.load('picker', {
          callback: resolve,
          onerror: reject
        });
      };
      pickerScript.onerror = () => {
        reject(new Error('Failed to load Google Picker API script'));
      };
      document.head.appendChild(pickerScript);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.head.appendChild(script);
  });
}

// Authenticate user and get access token for Picker API using Google Identity Services (GIS)
async function authenticateGooglePicker() {
  // Clear any old tokens to force fresh authentication with correct scope
  localStorage.removeItem('google_picker_access_token');
  googlePickerState.accessToken = null;
  
  // Ensure initialization
  if (!googlePickerState.isInitialized) {
    await initializeGooglePicker();
  }
  
  // Check if Google Identity Services is available
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error('Google Identity Services not loaded. Please check your Client ID configuration.');
  }
  
  try {
    // Get Client ID - try config first, then fetch from API (environment variable)
    let clientId = CONFIG.GOOGLE_PICKER_CLIENT_ID || CONFIG.GOOGLE_PHOTOS_CLIENT_ID;
    
    // If not in config, fetch from API endpoint (reads from environment variable)
    if (!clientId) {
      try {
        const response = await fetch('/api/google-picker-client-id');
        if (response.ok) {
          const data = await response.json();
          clientId = data.clientId;
          // Cache it for future use
          CONFIG.GOOGLE_PHOTOS_CLIENT_ID = clientId;
        } else {
          throw new Error('Client ID not configured. Please set GOOGLE_PHOTOS_CLIENT_ID environment variable.');
        }
      } catch (error) {
        throw new Error('Failed to fetch Client ID from server');
      }
    }
    
    if (!clientId) {
      throw new Error('Client ID not configured');
    }
    
    // Use Google Picker API scope (matches what's configured in Google Cloud Console)
    // This scope: https://www.googleapis.com/auth/photospicker.mediaitems.readonly
    const requestedScope = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
    console.log('Requesting Google Picker scope:', requestedScope);
    console.log('Current origin:', window.location.origin);
    console.log('Client ID:', clientId);
    
    // Use new Google Identity Services OAuth2 token client
    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: requestedScope,
        callback: (response) => {
          if (response.error) {
            console.error('OAuth2 token error:', response);
            reject(new Error(`Authentication failed: ${response.error}. Please check your OAuth configuration.`));
            return;
          }
          
          const accessToken = response.access_token;
          const scope = response.scope; // Check what scope was actually granted
          
          console.log('Token received. Granted scopes:', scope);
          console.log('Expected scope:', requestedScope);
          
          // Verify the scope was granted
          if (scope && !scope.includes('photospicker')) {
            console.warn('Warning: Token may not have the photospicker scope. Granted scopes:', scope);
          }
          
          googlePickerState.accessToken = accessToken;
          
          // Store token in localStorage for persistence
          localStorage.setItem('google_picker_access_token', accessToken);
          localStorage.setItem('google_picker_authenticated', 'true');
          
          console.log('Authentication successful');
          resolve(accessToken);
        },
        error_callback: (error) => {
          console.error('OAuth2 error callback:', error);
          reject(new Error(`Authentication error: ${JSON.stringify(error)}`));
        }
      });
      
      // Request access token - force consent to ensure scope is granted
      // Using 'consent' instead of '' to ensure the scope is actually granted
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  } catch (error) {
    console.error('Error authenticating Google Picker:', error);
    console.error('Error details:', {
      type: error?.type,
      error: error?.error,
      message: error?.message,
      details: error?.details,
      originalError: error?.originalError
    });
    console.error('Current origin:', window.location.origin);
    
    // Check for specific error types
    if (error && (error.type === 'tokenFailed' && error.error === 'server_error') ||
        (error.error === 'idpiframe_initialization_failed') ||
        (error.message && error.message.includes('not been registered'))) {
      // This usually means origin not registered or app not verified
      const originError = new Error(`Authentication failed. Current origin: ${window.location.origin}. Please check: 1) Origin is registered exactly (including protocol, no trailing slash) in Authorized JavaScript origins, 2) The scope 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly' is ADDED to OAuth consent screen scopes (even in Production mode - go to OAuth consent screen > Scopes > Add or Remove Scopes > search for 'photospicker'), 3) Client ID matches the one in Google Cloud Console. Note: You can stay in Production mode, but the scope must be explicitly added.`);
      originError.originalError = error;
      originError.isTokenFailed = true;
      throw originError;
    }
    
    // Don't clear authentication flag if it was previously set
    throw error;
  }
}

// Create a Picker API session (via serverless function to avoid CORS)
async function createPickerSession() {
  // Always re-authenticate to ensure we have a fresh token with the correct scope
  // Don't reuse stored tokens as they might be from old authentication without the right scope
  if (!googlePickerState.accessToken) {
    await authenticateGooglePicker();
  }
  
  // Verify we have a token
  if (!googlePickerState.accessToken) {
    throw new Error('Failed to obtain access token. Please try authenticating again.');
  }
  
  console.log('Using access token (first 20 chars):', googlePickerState.accessToken.substring(0, 20) + '...');
  
  try {
    console.log('Creating picker session with token:', googlePickerState.accessToken ? 'Token present' : 'No token');
    
    // Use serverless function to avoid CORS issues
    const url = '/api/google-picker-session';
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create',
        accessToken: googlePickerState.accessToken
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorData;
      let responseText;
      try {
        responseText = await response.text();
        console.log('Response text:', responseText);
        errorData = JSON.parse(responseText);
      } catch (e) {
        // If response isn't JSON, use status text
        console.error('Failed to parse response:', e);
        errorData = { error: response.statusText || `HTTP ${response.status}`, raw: responseText };
      }
      
      let errorMessage = errorData.error || `Failed to create picker session: ${response.status}`;
      
      // Check if it's a 404 (function not deployed)
      if (response.status === 404) {
        errorMessage = `Serverless function not found (404). GET works but POST returns 404. This may be a Vercel routing issue. Response: ${responseText || 'No response text'}`;
      }
      // Check if it's an unverified app error
      else if (response.status === 403 || response.status === 401) {
        errorMessage = `App verification required (${response.status}). Authentication succeeded, but API access requires app verification.`;
        // Still mark authentication as successful
        localStorage.setItem('google_picker_authenticated', 'true');
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Picker session response:', data);
    
    // The response should contain sessionId and pickerUri
    if (!data.sessionId) {
      console.error('No sessionId in response:', data);
      throw new Error('Session ID not found in API response');
    }
    
    googlePickerState.pickerSessionId = data.sessionId;
    console.log('Session ID:', data.sessionId);
    console.log('Picker URI:', data.pickerUri);
    
    return data.pickerUri;
  } catch (error) {
    console.error('Error creating picker session:', error);
    throw error;
  }
}

// Poll picker session to check if user has completed selection (via serverless function to avoid CORS)
async function pollPickerSession(sessionId) {
  const maxAttempts = 60; // Poll for up to 5 minutes (5 second intervals)
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Use serverless function to avoid CORS issues
        const response = await fetch('/api/google-picker-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'poll',
            accessToken: googlePickerState.accessToken,
            sessionId: sessionId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to poll session: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.state === 'COMPLETED') {
          clearInterval(pollInterval);
          resolve(data);
        } else if (data.state === 'CANCELLED' || data.state === 'EXPIRED') {
          clearInterval(pollInterval);
          reject(new Error(`Session ${data.state.toLowerCase()}`));
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          reject(new Error('Session polling timeout'));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 5000); // Poll every 5 seconds
  });
}

// Get selected media items from completed session (via serverless function to avoid CORS)
async function getSelectedMediaItems(sessionId) {
  try {
    // Use serverless function to avoid CORS issues
    const response = await fetch('/api/google-picker-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'getSelected',
        accessToken: googlePickerState.accessToken,
        sessionId: sessionId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get selected media items: ${response.status}`);
    }
    
    const data = await response.json();
    return data.selectedMediaItems || [];
  } catch (error) {
    console.error('Error getting selected media items:', error);
    throw error;
  }
}

// Open Google Picker and handle photo selection
async function openGooglePicker() {
  const containers = document.querySelectorAll('#photos-content');
  
  try {
    // Always clear old tokens to force fresh authentication with correct scope
    // This ensures we get a token with the photospicker scope
    localStorage.removeItem('google_picker_access_token');
    localStorage.removeItem('google_picker_authenticated');
    googlePickerState.accessToken = null;
    
    // Always authenticate to ensure we have a fresh token with the correct scope
    // Show loading message
    containers.forEach(container => {
      container.innerHTML = `
        <div class="photos-placeholder">
          <div class="photos-icon">📷</div>
          <h3>Authenticating...</h3>
          <p>Please complete authentication in the popup window.</p>
        </div>
      `;
    });
    
    await authenticateGooglePicker();
    
    // Show success message after authentication, then proceed to open picker
    containers.forEach(container => {
      container.innerHTML = `
        <div class="photos-placeholder">
          <div class="photos-icon">✅</div>
          <h3>Authentication Successful!</h3>
          <p>Opening Google Photos Picker...</p>
        </div>
      `;
    });
    
    // Store authentication success
    localStorage.setItem('google_picker_authenticated', 'true');
    
    // For automatic random photos, use the Library API directly instead of picker
    // The picker is optional and can be used to select specific photos/albums
    // But for the main use case (random photos), we'll use the Library API
    
    // Check if we have stored photo selections from picker
    const storedPickerPhotos = localStorage.getItem('google_picker_selected_photos');
    if (storedPickerPhotos) {
      try {
        const selectedPhotos = JSON.parse(storedPickerPhotos);
        if (selectedPhotos.length > 0) {
          // Use previously selected photos
          googlePhotosCache.photos = selectedPhotos;
          googlePhotosCache.lastUpdate = Date.now();
          displayRandomGooglePhoto();
          
          // Set up automatic rotation
          if (googlePhotosCache.updateInterval) {
            clearInterval(googlePhotosCache.updateInterval);
          }
          const rotationMinutes = CONFIG.GOOGLE_PHOTOS_ROTATION_MINUTES || 5;
          googlePhotosCache.updateInterval = setInterval(() => {
            displayRandomGooglePhoto();
          }, rotationMinutes * 60 * 1000);
          
          containers.forEach(container => {
            container.innerHTML = `
              <div class="photos-placeholder">
                <div class="photos-icon">✅</div>
                <h3>Photos Loaded!</h3>
                <p>Displaying random photos from your selection.</p>
                <p style="font-size: 12px; color: #888; margin-top: 8px;">
                  Photos will rotate every ${rotationMinutes} minutes.
                </p>
              </div>
            `;
          });
          
          // Show photo after a brief delay
          setTimeout(() => {
            displayRandomGooglePhoto();
          }, 500);
          
          return;
        }
      } catch (e) {
        console.error('Error parsing stored picker photos:', e);
      }
    }
    
    // If no stored photos, fetch from Library API automatically using picker token
    // The picker token has both photospicker and photoslibrary scopes
    if (!googlePickerState.accessToken) {
      throw new Error('Access token not available');
    }
    
    // Use the picker access token to fetch photos from Library API
    let apiUrl = `/api/google-photos?access_token=${encodeURIComponent(googlePickerState.accessToken)}&page_size=100`;
    if (CONFIG.GOOGLE_PHOTOS_ALBUM_ID) {
      apiUrl += `&album_id=${encodeURIComponent(CONFIG.GOOGLE_PHOTOS_ALBUM_ID)}`;
    }
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      googlePhotosCache.photos = data.photos || [];
      googlePhotosCache.lastUpdate = Date.now();
      
      // Store photos for future use
      localStorage.setItem('google_picker_selected_photos', JSON.stringify(googlePhotosCache.photos));
      
      // Display random photo
      if (googlePhotosCache.photos.length > 0) {
        displayRandomGooglePhoto();
      }
    } else {
      throw new Error(`Failed to fetch photos: ${response.status}`);
    }
    
    // Set up automatic rotation
    if (googlePhotosCache.updateInterval) {
      clearInterval(googlePhotosCache.updateInterval);
    }
    const rotationMinutes = CONFIG.GOOGLE_PHOTOS_ROTATION_MINUTES || 5;
    googlePhotosCache.updateInterval = setInterval(() => {
      displayRandomGooglePhoto();
    }, rotationMinutes * 60 * 1000);
  } catch (error) {
    console.error('Error opening Google Picker:', error);
    
    // Check if it's a configuration error
    const isConfigError = error.message && (
      error.message.includes('not configured') ||
      error.message.includes('Client ID') ||
      error.message.includes('not initialized')
    );
    
    // Check if it's an origin registration error
    const isOriginError = error.message && (
      error.message.includes('not been registered') ||
      error.message.includes('Authorized JavaScript origins') ||
      (error.originalError && error.originalError.error === 'idpiframe_initialization_failed')
    );
    
    // Check if it's a token failed error (server_error)
    const isTokenFailed = error.isTokenFailed || 
                         (error.originalError && error.originalError.type === 'tokenFailed') ||
                         (error.error === 'server_error' && error.type === 'tokenFailed');
    
    // Check if it's an authentication error (403/401) - likely due to unverified app
    const isAuthError = error.message && (
      error.message.includes('403') || 
      error.message.includes('401') ||
      error.message.includes('verification') ||
      error.message.includes('unverified')
    );
    
    // If authentication succeeded but API calls fail, show appropriate message
    if (localStorage.getItem('google_picker_authenticated') === 'true' || isAuthError) {
      containers.forEach(container => {
        container.innerHTML = `
          <div class="photos-placeholder">
            <div class="photos-icon">✅</div>
            <h3>Authentication Successful</h3>
            <p>You have successfully authenticated with Google Photos.</p>
            <p style="font-size: 12px; color: #888; margin-top: 8px;">
              Photos cannot be loaded until app verification is complete. This is expected behavior for unverified apps.
            </p>
          </div>
        `;
      });
    } else if (isOriginError || isTokenFailed) {
      // Show origin registration or token failed error message
      containers.forEach(container => {
        container.innerHTML = `
          <div class="photos-placeholder">
            <div class="photos-icon">⚠️</div>
            <h3>Authentication Configuration Issue</h3>
            <p>There's an issue with your Google OAuth configuration.</p>
            <p style="font-size: 12px; color: #888; margin-top: 8px;">
              <strong>Possible causes and fixes:</strong><br>
              1. <strong>Origin not registered:</strong> Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #66b3ff;">Google Cloud Console → APIs & Services → Credentials</a>, click your OAuth 2.0 Client ID, and add <code style="background: #333; padding: 2px 6px; border-radius: 3px;">https://dakboard-smith.vercel.app</code> to "Authorized JavaScript origins"<br>
              2. <strong>App not verified:</strong> Your app may need to be verified by Google (this is expected for unverified apps)<br>
              3. <strong>Wait for propagation:</strong> If you just added the origin, wait 5-10 minutes for changes to take effect<br>
              4. <strong>Check OAuth consent screen:</strong> Make sure your OAuth consent screen is properly configured
            </p>
            <button onclick="openGooglePicker()" class="photos-connect-btn" style="margin-top: 12px;">Try Again</button>
          </div>
        `;
      });
    } else if (isConfigError) {
      // Show configuration error message
      containers.forEach(container => {
        container.innerHTML = `
          <div class="photos-placeholder">
            <div class="photos-icon">📷</div>
            <h3>Configuration Required</h3>
            <p>${error.message || 'Google Picker API is not properly configured.'}</p>
            <p style="font-size: 12px; color: #888; margin-top: 8px;">
              Please set GOOGLE_PHOTOS_CLIENT_ID in your config.js file.
            </p>
            <button onclick="openGooglePicker()" class="photos-connect-btn" style="margin-top: 12px;">Try Again</button>
          </div>
        `;
      });
    } else {
      // Show generic error
      containers.forEach(container => {
        container.innerHTML = `
          <div class="photos-placeholder">
            <div class="photos-icon">📷</div>
            <h3>Error</h3>
            <p>${error.message || 'An error occurred'}</p>
            <button onclick="openGooglePicker()" class="photos-connect-btn">Try Again</button>
          </div>
        `;
      });
    }
    
    throw error;
  }
}

// Load Google Photos using Picker API
async function loadGooglePhotosWithPicker() {
  const containers = document.querySelectorAll('#photos-content');
  if (containers.length === 0) return;
  
  // Restore access token from localStorage if available
  const storedToken = localStorage.getItem('google_picker_access_token');
  if (storedToken && !googlePickerState.accessToken) {
    googlePickerState.accessToken = storedToken;
  }
  
  // Check if Client ID is configured
  const clientId = CONFIG.GOOGLE_PICKER_CLIENT_ID || CONFIG.GOOGLE_PHOTOS_CLIENT_ID;
  if (!clientId) {
    // Show connect button with instructions
    const promptHtml = `
      <div class="photos-placeholder">
        <div class="photos-icon">📷</div>
        <h3>Connect Google Photos</h3>
        <p>Click the button below to connect your Google Photos account.</p>
        <button onclick="openGooglePicker()" class="photos-connect-btn">Connect Google Photos</button>
        <p style="font-size: 11px; color: #888; margin-top: 12px;">
          Note: Make sure GOOGLE_PHOTOS_CLIENT_ID is configured in your config.js file.
        </p>
      </div>
    `;
    containers.forEach(container => container.innerHTML = promptHtml);
    return;
  }
  
  try {
    // Initialize if needed
    if (!googlePickerState.isInitialized) {
      await initializeGooglePicker();
    }
    
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('google_picker_authenticated') === 'true' ||
                           googlePickerState.accessToken ||
                           localStorage.getItem('google_picker_access_token');
    
    if (isAuthenticated) {
      // Show authenticated state (photos won't load until app is verified)
      const authHtml = `
        <div class="photos-placeholder">
          <div class="photos-icon">✅</div>
          <h3>Authentication Successful!</h3>
          <p>You have successfully authenticated with Google Photos.</p>
          <p style="font-size: 12px; color: #888; margin-top: 8px;">
            Photos cannot be loaded until app verification is complete. This is expected behavior for unverified apps.
          </p>
          <button onclick="openGooglePicker()" class="photos-connect-btn" style="margin-top: 12px;">Try Selecting Photos</button>
        </div>
      `;
      containers.forEach(container => container.innerHTML = authHtml);
      return;
    }
    
    // Check if we have previously selected photos
    const storedPhotos = localStorage.getItem('google_picker_selected_photos');
    if (storedPhotos) {
      try {
        googlePhotosCache.photos = JSON.parse(storedPhotos);
        if (googlePhotosCache.photos.length > 0) {
          displayRandomGooglePhoto();
          
          // Set up auto-refresh to show different random photo
          if (googlePhotosCache.updateInterval) {
            clearInterval(googlePhotosCache.updateInterval);
          }
          googlePhotosCache.updateInterval = setInterval(() => {
            displayRandomGooglePhoto();
          }, 60 * 1000); // Every 1 minute
          return;
        }
      } catch (e) {
        console.error('Error parsing stored photos:', e);
      }
    }
    
    // No photos selected yet, show prompt to open picker
    const promptHtml = `
      <div class="photos-placeholder">
        <div class="photos-icon">📷</div>
        <h3>Connect Google Photos</h3>
        <p>Click the button below to connect your Google Photos account.</p>
        <button onclick="openGooglePicker()" class="photos-connect-btn">Connect Google Photos</button>
      </div>
    `;
    containers.forEach(container => container.innerHTML = promptHtml);
    
  } catch (error) {
    console.error('Error loading Google Photos with Picker:', error);
    // Show connect button even on error
    const errorHtml = `
      <div class="photos-placeholder">
        <div class="photos-icon">📷</div>
        <h3>Connect Google Photos</h3>
        <p>Click the button below to connect your Google Photos account.</p>
        <button onclick="openGooglePicker()" class="photos-connect-btn">Connect Google Photos</button>
        ${error.message ? `<p style="font-size: 11px; color: #888; margin-top: 8px;">Error: ${error.message}</p>` : ''}
      </div>
    `;
    containers.forEach(container => container.innerHTML = errorHtml);
  }
}

// Make openGooglePicker globally accessible
window.openGooglePicker = openGooglePicker;

// ============================================================================
// END GOOGLE PICKER API IMPLEMENTATION
// ============================================================================

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

// Widget Visibility Management
const WIDGET_CONFIG = {
  'calendar-widget': { name: 'Calendar', icon: '📅' },
  'weather-widget': { name: 'Weather', icon: '🌤️' },
  'todo-widget': { name: 'Todo List', icon: '✅' },
  'garage-widget': { name: 'Garage Doors', icon: '🚗' },
  'alarm-widget': { name: 'Alarm Panel', icon: '🔒' },
  'blank-widget': { name: 'Blank', icon: '⬜' },
  'clock-widget': { name: 'Clock', icon: '🕐' },
  'photos-widget': { name: 'Google Photos', icon: '📷' },
  'thermostat-widget': { name: 'Thermostat', icon: '🌡️' },
  'news-widget': { name: 'News', icon: '📰' },
  'whiteboard-widget': { name: 'Whiteboard', icon: '🖊️' }
};

// Load widget visibility state from localStorage (page-specific)
function loadWidgetVisibility() {
  try {
    const pageElement = getPageElement(currentPageIndex);
    if (!pageElement) return;
    
    const visibilityKey = `dakboard-widget-visibility-page-${currentPageIndex}`;
    const saved = localStorage.getItem(visibilityKey);
    const visibility = saved ? JSON.parse(saved) : {};
    
    // Process all widgets in WIDGET_CONFIG
    Object.keys(WIDGET_CONFIG).forEach(widgetId => {
      // Find widget on current page only
      let widget = pageElement.querySelector(`.${widgetId}`);
      
      // Only create widget if visibility is explicitly true
      // Don't create if false or undefined (not configured for this page)
      if (!widget && visibility[widgetId] === true) {
        // Find the widget template (usually on page 0)
        const templateWidget = document.querySelector(`.${widgetId}`);
        if (templateWidget) {
          // Clone the widget to the current page
          widget = templateWidget.cloneNode(true);
          widget.classList.remove('hidden'); // Ensure it's visible
          pageElement.appendChild(widget);
          
          // Initialize widget-specific functionality if needed
          if (typeof initializeDragAndResize === 'function') {
            setTimeout(() => {
              initializeDragAndResize();
            }, 100);
          }
        }
      }
      
      // Set visibility for existing widgets
      if (widget) {
        if (visibility[widgetId] === false) {
          widget.classList.add('hidden');
        } else if (visibility[widgetId] === true) {
          widget.classList.remove('hidden');
        } else {
          // If visibility not set for this page, hide the widget (it shouldn't be here)
          widget.classList.add('hidden');
        }
      }
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
    Object.keys(WIDGET_CONFIG).forEach(widgetId => {
      // Find widget on current page only
      const widget = pageElement.querySelector(`.${widgetId}`);
      if (widget) {
        visibility[widgetId] = !widget.classList.contains('hidden');
      } else {
        // Widget doesn't exist on this page, mark as hidden
        visibility[widgetId] = false;
      }
    });
    
    const visibilityKey = `dakboard-widget-visibility-page-${currentPageIndex}`;
    localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  } catch (error) {
    console.error('Error saving widget visibility:', error);
  }
}

// Toggle widget visibility (page-specific)
function toggleWidgetVisibility(widgetId) {
  const pageElement = getPageElement(currentPageIndex);
  if (!pageElement) return;
  
  // Find widget on current page
  let widget = pageElement.querySelector(`.${widgetId}`);
  
  // If widget doesn't exist on current page, create it
  if (!widget) {
    // Find the widget template (usually on page 0 or in the original HTML)
    const templateWidget = document.querySelector(`.${widgetId}`);
    if (templateWidget) {
      // Clone the widget to the current page
      widget = templateWidget.cloneNode(true);
      // Don't set visibility here - let the toggle handle it
      pageElement.appendChild(widget);
      
      // Initialize widget-specific functionality if needed
      if (typeof initializeDragAndResize === 'function') {
        // Reinitialize drag/resize for the new widget
        setTimeout(() => {
          initializeDragAndResize();
        }, 100);
      }
    } else {
      console.error(`Widget template ${widgetId} not found`);
      return;
    }
  }
  
  if (widget) {
    // Toggle visibility - if it's hidden, show it; if it's visible, hide it
    const isCurrentlyHidden = widget.classList.contains('hidden');
    if (isCurrentlyHidden) {
      widget.classList.remove('hidden');
    } else {
      widget.classList.add('hidden');
    }
    saveWidgetVisibility();
    // Update panel after a brief delay to ensure DOM is updated
    setTimeout(() => {
      updateWidgetControlPanel();
    }, 10);
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
    // Load saved edit mode state
    const savedEditMode = localStorage.getItem('dakboard-edit-mode') === 'true';
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
  
  // Update whiteboard drawing state
  if (typeof setupWhiteboardDrawing === 'function') {
    setupWhiteboardDrawing();
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
  document.querySelectorAll('.widget').forEach(widget => {
    if (enabled) {
      widget.classList.add('edit-mode-active');
      widget.style.pointerEvents = 'auto'; // Allow dragging
    } else {
      widget.classList.remove('edit-mode-active');
      widget.style.pointerEvents = ''; // Reset to default
    }
  });
  
  // Reinitialize drag/resize when entering edit mode
  // Remove resize handles when exiting edit mode
  if (enabled) {
    initializeDragAndResize();
  } else {
    // Remove all resize handles when exiting edit mode
    document.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
  }
}

// Update widget control panel with current widget states
function updateWidgetControlPanel() {
  const list = document.getElementById('widget-control-list');
  if (!list) return;
  
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

  // Sort widgets alphabetically by name
  const sortedWidgets = Object.keys(WIDGET_CONFIG).sort((a, b) => {
    const nameA = WIDGET_CONFIG[a].name.toLowerCase();
    const nameB = WIDGET_CONFIG[b].name.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  sortedWidgets.forEach(widgetId => {
    const config = WIDGET_CONFIG[widgetId];
    // Find widget on current page only
    const pageElement = getPageElement(currentPageIndex);
    const widget = pageElement ? pageElement.querySelector(`.${widgetId}`) : null;
    // Widget is hidden if it doesn't exist on current page OR if it has the 'hidden' class
    const isHidden = !widget || widget.classList.contains('hidden');
    
    const item = document.createElement('div');
    item.className = `widget-control-item ${isHidden ? 'hidden' : ''}`;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = `widget-control-toggle-btn ${isHidden ? 'hidden' : ''}`;
    toggleBtn.innerHTML = isHidden ? '👁️' : '👁️‍🗨️';
    toggleBtn.title = isHidden ? 'Show widget' : 'Hide widget';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWidgetVisibility(widgetId);
    });
    
    const styleBtn = document.createElement('button');
    styleBtn.className = 'widget-control-style-btn';
    styleBtn.innerHTML = '🎨';
    styleBtn.title = 'Style widget';
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof openStylingModal === 'function') {
        openStylingModal(widgetId);
      }
    });
    
    // Z-index controls (promotion = green, demotion = red)
    const bringForwardBtn = document.createElement('button');
    bringForwardBtn.className = 'widget-control-zindex-btn widget-control-zindex-promote';
    bringForwardBtn.innerHTML = '↑';
    bringForwardBtn.title = 'Bring Forward';
    bringForwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bringWidgetForward(widgetId);
    });

    const sendBackwardBtn = document.createElement('button');
    sendBackwardBtn.className = 'widget-control-zindex-btn widget-control-zindex-demote';
    sendBackwardBtn.innerHTML = '↓';
    sendBackwardBtn.title = 'Send Backward';
    sendBackwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendWidgetBackward(widgetId);
    });

    const bringToFrontBtn = document.createElement('button');
    bringToFrontBtn.className = 'widget-control-zindex-btn widget-control-zindex-promote';
    bringToFrontBtn.innerHTML = '⬆';
    bringToFrontBtn.title = 'Bring to Front';
    bringToFrontBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bringWidgetToFront(widgetId);
    });

    const sendToBackBtn = document.createElement('button');
    sendToBackBtn.className = 'widget-control-zindex-btn widget-control-zindex-demote';
    sendToBackBtn.innerHTML = '⬇';
    sendToBackBtn.title = 'Send to Back';
    sendToBackBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendWidgetToBack(widgetId);
    });
    
    item.innerHTML = `
      <div class="widget-control-item-info">
        <span class="widget-control-item-icon">${config.icon}</span>
        <span class="widget-control-item-name">${config.name}</span>
      </div>
    `;
    item.appendChild(toggleBtn);
    item.appendChild(styleBtn);
    
    // Add z-index controls in a group
    const zIndexGroup = document.createElement('div');
    zIndexGroup.className = 'widget-control-zindex-group';
    zIndexGroup.appendChild(sendToBackBtn);
    zIndexGroup.appendChild(sendBackwardBtn);
    zIndexGroup.appendChild(bringForwardBtn);
    zIndexGroup.appendChild(bringToFrontBtn);
    item.appendChild(zIndexGroup);
    
    list.appendChild(item);
  });
}

// Z-index control functions
function bringWidgetForward(widgetId) {
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const currentZ = parseInt(window.getComputedStyle(widget).zIndex) || 1;
  const allWidgets = Array.from(document.querySelectorAll('.widget'));
  const maxZ = Math.max(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  if (currentZ < maxZ) {
    widget.style.zIndex = currentZ + 1;
    saveWidgetLayout(); // Save z-index changes
  }
}

function sendWidgetBackward(widgetId) {
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const currentZ = parseInt(window.getComputedStyle(widget).zIndex) || 1;
  const allWidgets = Array.from(document.querySelectorAll('.widget'));
  const minZ = Math.min(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  if (currentZ > minZ) {
    widget.style.zIndex = currentZ - 1;
    saveWidgetLayout(); // Save z-index changes
  }
}

function bringWidgetToFront(widgetId) {
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const allWidgets = Array.from(document.querySelectorAll('.widget'));
  const maxZ = Math.max(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  widget.style.zIndex = maxZ + 1;
  saveWidgetLayout(); // Save z-index changes
}

function sendWidgetToBack(widgetId) {
  const widget = document.querySelector(`.${widgetId}`);
  if (!widget) return;
  
  const allWidgets = Array.from(document.querySelectorAll('.widget'));
  const minZ = Math.min(...allWidgets.map(w => parseInt(window.getComputedStyle(w).zIndex) || 1));
  
  widget.style.zIndex = minZ - 1;
  saveWidgetLayout(); // Save z-index changes
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
  
  pagesContainer.addEventListener('touchstart', (e) => {
    if (isEditMode) return; // Disable swipe in edit mode
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  pagesContainer.addEventListener('touchend', (e) => {
    if (isEditMode) return; // Disable swipe in edit mode
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
    if (e.target.closest('.widget') || e.target.closest('.page-nav-arrow')) return; // Don't swipe if clicking widget or arrow
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
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
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
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
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
  
  // Load page-specific widget layout
  const layoutKey = `dakboard-widget-layout-page-${currentPageIndex}`;
  const saved = localStorage.getItem(layoutKey);
  
  if (saved) {
    try {
      const layout = JSON.parse(saved);
      Object.keys(layout).forEach(widgetId => {
        const widget = pageElement.querySelector(`.${widgetId}`);
        if (widget && layout[widgetId] && !widget.classList.contains('hidden')) {
          const { x, y, width, height, zIndex } = layout[widgetId];
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
          if (typeof updateWidgetScale === 'function') {
            updateWidgetScale(widget);
          }
        }
      });
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
      const widgetId = widget.classList[1]; // Get second class (e.g., 'calendar-widget')
      const rect = widget.getBoundingClientRect();
      const dashboardRect = pageElement.getBoundingClientRect();
      
      const zIndex = parseInt(window.getComputedStyle(widget).zIndex) || 1;
      layout[widgetId] = {
        x: rect.left - dashboardRect.left,
        y: rect.top - dashboardRect.top,
        width: rect.width,
        height: rect.height,
        zIndex: zIndex
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
  
  // Set default background
  newPage.style.background = '#1a1a1a';
  
  // Mark all widgets as hidden for the new page
  const visibility = {};
  Object.keys(WIDGET_CONFIG).forEach(widgetId => {
    visibility[widgetId] = false; // All widgets hidden by default
  });
  const visibilityKey = `dakboard-widget-visibility-page-${newPageIndex}`;
  localStorage.setItem(visibilityKey, JSON.stringify(visibility));
  
  // Update page list UI
  updatePageList();
  
  // Update navigation arrows
  updateNavigationArrows();
  
  // Switch to the new page
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
  
  // Renumber pages after the deleted one
  for (let i = pageIndex + 1; i < totalPages; i++) {
    const oldLayoutKey = `dakboard-widget-layout-page-${i}`;
    const oldBgKey = `dakboard-background-page-${i}`;
    const oldEditKey = `dakboard-edit-mode-page-${i}`;
    
    const newLayoutKey = `dakboard-widget-layout-page-${i - 1}`;
    const newBgKey = `dakboard-background-page-${i - 1}`;
    const newEditKey = `dakboard-edit-mode-page-${i - 1}`;
    
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
    deleteBtn.textContent = '×';
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
}

// Export all dashboard configuration to JSON file
function exportConfiguration() {
  try {
    // Get total pages and current page
    const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    const currentPage = parseInt(localStorage.getItem('dakboard-current-page')) || 0;
    
    const config = {
      version: '2.1', // Updated: Added smooth loop animations
      exportDate: new Date().toISOString(),
      metadata: {
        totalPages: totalPages,
        currentPage: currentPage
      },
      pages: []
    };
    
    // Organize data by page
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
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
      
      // Get widget layout for this page
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
      
      // Organize widgets for this page - include ALL widgets
      Object.keys(WIDGET_CONFIG).forEach(widgetId => {
        const widgetInfo = WIDGET_CONFIG[widgetId];
        const widget = {
          widgetId: widgetId,
          name: widgetInfo.name,
          icon: widgetInfo.icon,
          visible: visibility.hasOwnProperty(widgetId) ? visibility[widgetId] !== false : true, // Use saved visibility or default to true
          layout: layout[widgetId] || null,
          styles: null
        };
        
        // Get widget styles for this page
        const stylesKey = `dakboard-widget-styles-${widgetId}-page-${pageIndex}`;
        const stylesValue = localStorage.getItem(stylesKey);
        if (stylesValue) {
          try {
            widget.styles = JSON.parse(stylesValue);
          } catch (e) {
            console.warn(`Error parsing styles for ${widgetId} on page ${pageIndex}:`, e);
          }
        }
        
        // Always include widget in export - this ensures complete configuration
        page.widgets.push(widget);
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
    }
    
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
    
    // Create JSON blob and trigger download
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
    a.download = `dakboard-config-${dateStr}_${timeStr}.json`;
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
      
      // Confirm before importing (will overwrite existing data)
      const confirmed = confirm(
        'This will overwrite your current dashboard configuration. Are you sure you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
      
      // Clear existing dashboard-related localStorage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('dakboard-') || key.startsWith('whiteboard-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      let importedCount = 0;
      
      // Only support new organized format (v2.0)
      if (!config.pages || !Array.isArray(config.pages)) {
        throw new Error('Invalid configuration format. Expected "pages" array.');
      }
      
      
      // Import metadata
      if (config.metadata) {
        if (config.metadata.totalPages !== undefined) {
          localStorage.setItem('dakboard-total-pages', config.metadata.totalPages.toString());
          importedCount++;
        }
        if (config.metadata.currentPage !== undefined) {
          localStorage.setItem('dakboard-current-page', config.metadata.currentPage.toString());
          importedCount++;
        }
      }
      
      // Import each page
      config.pages.forEach(page => {
        const pageIndex = page.pageIndex;
        
        // Import page name
        if (page.name) {
          localStorage.setItem(`dakboard-page-name-${pageIndex}`, page.name);
          importedCount++;
        }
        
        // Import page background
        if (page.background) {
          const bgValue = typeof page.background === 'object' 
            ? JSON.stringify(page.background) 
            : page.background;
          localStorage.setItem(`dakboard-page-background-${pageIndex}`, bgValue);
          importedCount++;
        }
        
        // Import edit mode
        if (page.editMode !== undefined) {
          localStorage.setItem(`dakboard-edit-mode-page-${pageIndex}`, page.editMode.toString());
          importedCount++;
        }
        
          // Build complete visibility map - include ALL widgets
          const visibility = {};
          // First, mark all widgets as hidden by default (not on this page)
          Object.keys(WIDGET_CONFIG).forEach(widgetId => {
            visibility[widgetId] = false;
          });
          // Then, set visibility from imported data - only mark as true if explicitly visible
          page.widgets.forEach(widget => {
            visibility[widget.widgetId] = widget.visible === true;
          });
          localStorage.setItem(`dakboard-widget-visibility-page-${pageIndex}`, JSON.stringify(visibility));
          importedCount++;
        
        // Import widget layouts
        const layout = {};
        page.widgets.forEach(widget => {
          if (widget.layout) {
            layout[widget.widgetId] = widget.layout;
          }
        });
        if (Object.keys(layout).length > 0) {
          localStorage.setItem(`dakboard-widget-layout-page-${pageIndex}`, JSON.stringify(layout));
          importedCount++;
        }
        
        // Import widget styles
        page.widgets.forEach(widget => {
          if (widget.styles) {
            localStorage.setItem(
              `dakboard-widget-styles-${widget.widgetId}-page-${pageIndex}`,
              JSON.stringify(widget.styles)
            );
            importedCount++;
          }
        });
        
        // Import whiteboard data
        if (page.whiteboard) {
          Object.keys(page.whiteboard).forEach(key => {
            const whiteboardKey = `whiteboard-${key}-page-${pageIndex}`;
            localStorage.setItem(whiteboardKey, page.whiteboard[key]);
            importedCount++;
          });
        }
      });
      
      
      // Move widgets to their correct pages based on visibility
      // This ensures widgets are on the right pages after import
      config.pages.forEach((page, pageIndex) => {
        const pageElement = getPageElement(pageIndex);
        if (!pageElement) return;
        
        page.widgets.forEach(widget => {
          const widgetElement = document.querySelector(`.${widget.widgetId}`);
          if (!widgetElement) return;
          
          // Find which page the widget is currently on
          const currentPage = widgetElement.closest('.dashboard.page');
          const currentPageId = currentPage ? parseInt(currentPage.getAttribute('data-page-id')) : -1;
          
          // If widget should be visible on this page, move it here
          if (widget.visible === true && currentPageId !== pageIndex) {
            // Remove from current page
            if (currentPage) {
              widgetElement.remove();
            }
            // Add to correct page
            pageElement.appendChild(widgetElement);
          } else if (widget.visible === false && currentPageId === pageIndex) {
            // Widget shouldn't be on this page, hide it
            widgetElement.classList.add('hidden');
          }
        });
      });
      
      // Reload the page to apply the new configuration
      alert('Configuration imported successfully! The page will reload to apply changes.');
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

