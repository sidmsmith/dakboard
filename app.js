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
  
  // Home Assistant Webhook IDs (for triggering actions)
  // Just the webhook ID, not the full URL - the code will handle the URL construction
  HA_GARAGE_WEBHOOK_1: 'garage1toggle', // Update with your webhook IDs
  HA_GARAGE_WEBHOOK_2: 'garage2toggle',
  HA_GARAGE_WEBHOOK_3: 'garage3toggle',
  HA_ALARM_WEBHOOK: 'alarm_toggle', // Update with your alarm webhook ID
  
  // Refresh interval (milliseconds)
  REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Calendar configuration
  CALENDAR_SOURCES: [], // Will be populated when calendar integration is added
};

// Current week tracking for calendar
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of week (Sunday)

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  initializeCalendar();
  initializeEventListeners();
  loadAllData();
  startAutoRefresh();
});

// Initialize calendar view
function initializeCalendar() {
  renderCalendar();
}

// Initialize event listeners
function initializeEventListeners() {
  // Calendar navigation
  document.getElementById('prev-week-btn').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });
  
  document.getElementById('next-week-btn').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
  });
  
  // Monthly view modal
  document.getElementById('month-view-btn').addEventListener('click', () => {
    showMonthModal();
  });
  
  document.getElementById('close-month-modal').addEventListener('click', () => {
    closeMonthModal();
  });
  
  // Close modal on background click
  document.getElementById('month-modal').addEventListener('click', (e) => {
    if (e.target.id === 'month-modal') {
      closeMonthModal();
    }
  });
}

// Render weekly calendar
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const weekRange = document.getElementById('week-range');
  
  // Clear existing days (keep headers)
  const headers = Array.from(grid.querySelectorAll('.calendar-day-header'));
  grid.innerHTML = '';
  headers.forEach(header => grid.appendChild(header));
  
  // Calculate week dates
  const weekStart = new Date(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Update week range display
  weekRange.textContent = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  
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
    
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'calendar-events';
    // Events will be populated when calendar integration is added
    
    dayDiv.appendChild(dayNumber);
    dayDiv.appendChild(eventsDiv);
    grid.appendChild(dayDiv);
  }
}

// Show monthly calendar modal
function showMonthModal() {
  const modal = document.getElementById('month-modal');
  const content = document.getElementById('month-calendar-content');
  
  // For now, show placeholder
  content.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">Monthly calendar view coming soon...</p>';
  
  modal.classList.add('active');
}

// Close monthly calendar modal
function closeMonthModal() {
  document.getElementById('month-modal').classList.remove('active');
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
      loadAlarm()
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
    
    // Update weather icon (simplified - you may want to map HA conditions to emojis)
    const icon = getWeatherIcon(attrs.condition || state);
    document.getElementById('weather-icon').textContent = icon;
    
    // Update temperature
    const temp = attrs.temperature || attrs.temp || '--';
    document.getElementById('weather-temp').textContent = `${Math.round(temp)}°F`;
    
    // Update details
    document.getElementById('weather-feels-like').textContent = 
      attrs.temperature_feels_like ? `${Math.round(attrs.temperature_feels_like)}°F` : '--°F';
    document.getElementById('weather-humidity').textContent = 
      attrs.humidity ? `${Math.round(attrs.humidity)}%` : '--%';
    document.getElementById('weather-wind').textContent = 
      attrs.wind_speed ? `${Math.round(attrs.wind_speed)} mph` : '-- mph';
    document.getElementById('weather-conditions').textContent = 
      attrs.condition || state || '--';
  } catch (error) {
    console.error('Error loading weather:', error);
    document.getElementById('weather-conditions').textContent = 'Error loading weather';
  }
}

// Get weather icon from condition
function getWeatherIcon(condition) {
  const iconMap = {
    'sunny': '☀️',
    'clear': '☀️',
    'partlycloudy': '⛅',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'snowy': '❄️',
    'windy': '💨',
    'foggy': '🌫️',
  };
  
  if (!condition) return '⏳';
  const lower = condition.toLowerCase();
  return iconMap[lower] || '🌤️';
}

// Load todos from HA
async function loadTodos() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_TODO_ENTITY);
    if (!entity) {
      document.getElementById('todo-list').innerHTML = 
        '<li class="todo-item"><span style="color: #888;">No todo list configured</span></li>';
      return;
    }
    
    const todos = entity.state || '';
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    
    if (!todos || todos.trim() === '') {
      todoList.innerHTML = '<li class="todo-item"><span style="color: #888;">No todos</span></li>';
      return;
    }
    
    // Parse todos (assuming comma-separated or newline-separated)
    const todoItems = todos.split(/[,\n]/).filter(item => item.trim() !== '');
    
    todoItems.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      
      const checkbox = document.createElement('div');
      checkbox.className = 'todo-checkbox';
      
      const text = document.createElement('span');
      text.textContent = todo.trim();
      
      li.appendChild(checkbox);
      li.appendChild(text);
      todoList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading todos:', error);
    document.getElementById('todo-list').innerHTML = 
      '<li class="todo-item"><span class="error">Error loading todos</span></li>';
  }
}

// Load garage doors from HA
async function loadGarageDoors() {
  const doors = [
    { id: 1, entity: CONFIG.HA_GARAGE_DOOR_1, webhook: CONFIG.HA_GARAGE_WEBHOOK_1, name: 'Garage 1' },
    { id: 2, entity: CONFIG.HA_GARAGE_DOOR_2, webhook: CONFIG.HA_GARAGE_WEBHOOK_2, name: 'Garage 2' },
    { id: 3, entity: CONFIG.HA_GARAGE_DOOR_3, webhook: CONFIG.HA_GARAGE_WEBHOOK_3, name: 'Garage 3' },
  ];
  
  const container = document.getElementById('garage-doors');
  container.innerHTML = '';
  
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
      
      doorDiv.innerHTML = `
        <div class="garage-door-icon">🚪</div>
        <div class="garage-door-name">${door.name}</div>
        <div class="garage-door-status">${isOpen ? 'OPEN' : 'CLOSED'}</div>
      `;
      
      doorDiv.addEventListener('click', () => toggleGarageDoor(doorDiv));
      container.appendChild(doorDiv);
    } catch (error) {
      console.error(`Error loading garage door ${door.id}:`, error);
      // Still create the door element but show error state
      const doorDiv = document.createElement('div');
      doorDiv.className = 'garage-door closed';
      doorDiv.innerHTML = `
        <div class="garage-door-icon">🚪</div>
        <div class="garage-door-name">${door.name}</div>
        <div class="garage-door-status" style="color: #888;">Error</div>
      `;
      container.appendChild(doorDiv);
    }
  }
}

// Toggle garage door
async function toggleGarageDoor(doorElement) {
  const webhookId = doorElement.dataset.webhookId;
  if (!webhookId) {
    console.error('No webhook ID for garage door');
    return;
  }
  
  doorElement.classList.add('loading');
  
  try {
    await triggerHAWebhook(webhookId);
    // Reload garage doors after a short delay to get updated state
    setTimeout(() => {
      loadGarageDoors();
    }, 1000);
  } catch (error) {
    console.error('Error toggling garage door:', error);
    doorElement.classList.remove('loading');
  }
}

// Load alarm status from HA
async function loadAlarm() {
  try {
    const entity = await fetchHAEntity(CONFIG.HA_ALARM_ENTITY);
    if (!entity) {
      document.getElementById('alarm-status-text').textContent = 'Not Available';
      return;
    }
    
    const state = entity.state;
    const statusDiv = document.getElementById('alarm-status');
    const icon = document.getElementById('alarm-icon');
    const text = document.getElementById('alarm-status-text');
    
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
    
    // Add click handler
    icon.onclick = () => toggleAlarm();
  } catch (error) {
    console.error('Error loading alarm:', error);
    document.getElementById('alarm-status-text').textContent = 'Error';
  }
}

// Toggle alarm
async function toggleAlarm() {
  const icon = document.getElementById('alarm-icon');
  icon.classList.add('loading');
  
  try {
    await triggerHAWebhook(CONFIG.HA_ALARM_WEBHOOK);
    // Reload alarm after a short delay
    setTimeout(() => {
      loadAlarm();
    }, 1000);
  } catch (error) {
    console.error('Error toggling alarm:', error);
    icon.classList.remove('loading');
  }
}

// Fetch HA entity via API (works both locally and in production)
async function fetchHAEntity(entityId) {
  try {
    // Check if we have local config (for local development)
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      // Direct HA API call for local development
      const response = await fetch(`${window.CONFIG.HA_URL}/api/states/${encodeURIComponent(entityId)}`, {
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } else {
      // Use serverless function (for Vercel production)
      const response = await fetch(`/api/ha-fetch?entityId=${encodeURIComponent(entityId)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
  } catch (error) {
    console.error(`Error fetching HA entity ${entityId}:`, error);
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
      actualWebhookId = webhookId.split('/api/webhook/')[1];
    }
    
    // Check if we have local config (for local development)
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      // Direct HA webhook call for local development
      const webhookUrl = `${window.CONFIG.HA_URL}/api/webhook/${actualWebhookId}`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.status === 204 ? { success: true } : await response.json();
    } else {
      // Use serverless function (for Vercel production)
      const response = await fetch(`/api/ha-webhook?webhookId=${encodeURIComponent(actualWebhookId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    }
  } catch (error) {
    console.error(`Error triggering webhook ${webhookId}:`, error);
    throw error;
  }
}

// Start auto-refresh
function startAutoRefresh() {
  setInterval(() => {
    loadAllData();
  }, CONFIG.REFRESH_INTERVAL);
}

