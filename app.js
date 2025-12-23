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
    
    // Update current conditions
    const icon = getWeatherIcon(attrs.condition || state);
    document.getElementById('weather-icon').textContent = icon;
    
    const temp = attrs.temperature || attrs.temp || '--';
    document.getElementById('weather-temp').textContent = `${Math.round(temp)}°F`;
    
    // Update condition text
    const condition = attrs.condition || state || '--';
    document.getElementById('weather-conditions').textContent = condition;
    
    // Update current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    document.getElementById('weather-time').textContent = `${timeStr} • ${dateStr}`;
    
    // Update details
    document.getElementById('weather-feels-like').textContent = 
      attrs.temperature_feels_like ? `${Math.round(attrs.temperature_feels_like)}°F` : '--°F';
    document.getElementById('weather-humidity').textContent = 
      attrs.humidity ? `${Math.round(attrs.humidity)}%` : '--%';
    document.getElementById('weather-wind').textContent = 
      attrs.wind_speed ? `${Math.round(attrs.wind_speed)} mph` : '-- mph';
    
    // Load forecast
    loadWeatherForecast(attrs);
  } catch (error) {
    console.error('Error loading weather:', error);
    document.getElementById('weather-conditions').textContent = 'Error loading weather';
  }
}

// Load weather forecast from Pirate Weather entities
async function loadWeatherForecast(attrs) {
  const forecastList = document.getElementById('weather-forecast-list');
  forecastList.innerHTML = '<div style="color: #888; text-align: center; padding: 10px;">Loading forecast...</div>';
  
  try {
    // Pirate Weather creates individual sensor entities for each day
    // Format: sensor.pirateweather_day_1_high, sensor.pirateweather_day_1_low, sensor.pirateweather_day_1_condition, etc.
    // Or: sensor.pirateweather_daily_1_high, etc.
    
    const forecastDays = [];
    const daysToShow = 8; // Show 8 days like the HA card
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Try to fetch forecast entities - Pirate Weather uses different naming patterns
    const baseEntityId = CONFIG.HA_WEATHER_ENTITY.replace('weather.', 'sensor.').replace('weather_', 'sensor.');
    
    // Try different naming patterns
    const patterns = [
      { high: `${baseEntityId}_day_`, low: `${baseEntityId}_day_`, condition: `${baseEntityId}_day_`, icon: `${baseEntityId}_day_` },
      { high: `${baseEntityId}_daily_`, low: `${baseEntityId}_daily_`, condition: `${baseEntityId}_daily_`, icon: `${baseEntityId}_daily_` },
      { high: `${baseEntityId.replace('pirateweather', 'pirateweather_daily')}_`, low: `${baseEntityId.replace('pirateweather', 'pirateweather_daily')}_`, condition: `${baseEntityId.replace('pirateweather', 'pirateweather_daily')}_`, icon: `${baseEntityId.replace('pirateweather', 'pirateweather_daily')}_` },
    ];
    
    let foundPattern = null;
    let forecastData = [];
    
    // Try each pattern
    for (const pattern of patterns) {
      try {
        // Test if day 1 entities exist
        const testHigh = await fetchHAEntity(`${pattern.high}1_high`);
        if (testHigh && testHigh.state) {
          foundPattern = pattern;
          break;
        }
      } catch (e) {
        // Try next pattern
        continue;
      }
    }
    
    if (!foundPattern) {
      // Try fetching all states and filtering for forecast entities
      const allStates = await fetchAllHAStates();
      if (allStates) {
        const forecastEntities = allStates.filter(e => {
          const id = e.entity_id.toLowerCase();
          return (id.includes('pirate') || id.includes('weather')) && 
                 (id.includes('day_') || id.includes('daily_')) &&
                 (id.includes('high') || id.includes('low') || id.includes('condition') || id.includes('icon'));
        });
        
        if (forecastEntities.length > 0) {
          // Parse entities to build forecast
          forecastData = parseForecastFromEntities(forecastEntities, daysToShow);
        }
      }
    } else {
      // Fetch forecast using found pattern
      for (let day = 1; day <= daysToShow; day++) {
        try {
          const [highEntity, lowEntity, conditionEntity, iconEntity] = await Promise.all([
            fetchHAEntity(`${foundPattern.high}${day}_high`).catch(() => null),
            fetchHAEntity(`${foundPattern.low}${day}_low`).catch(() => null),
            fetchHAEntity(`${foundPattern.condition}${day}_condition`).catch(() => null),
            fetchHAEntity(`${foundPattern.icon}${day}_icon`).catch(() => null)
          ]);
          
          if (highEntity && lowEntity) {
            const high = Math.round(parseFloat(highEntity.state) || 0);
            const low = Math.round(parseFloat(lowEntity.state) || 0);
            const condition = conditionEntity ? (conditionEntity.state || conditionEntity.attributes?.condition || 'unknown') : 'unknown';
            const icon = iconEntity ? iconEntity.state : getWeatherIcon(condition);
            
            // Calculate day name (today + day offset)
            const forecastDate = new Date();
            forecastDate.setDate(forecastDate.getDate() + (day - 1));
            const dayName = dayNames[forecastDate.getDay()];
            
            forecastData.push({ day, dayName, high, low, condition, icon });
          }
        } catch (error) {
          console.error(`Error fetching forecast day ${day}:`, error);
        }
      }
    }
    
    if (forecastData.length === 0) {
      forecastList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Forecast data not available. Checking entity structure...</div>';
      // Log available entities for debugging
      console.log('No forecast data found. Available entities:', await getPirateWeatherEntities());
      return;
    }
    
    // Render forecast
    renderForecast(forecastData, attrs);
  } catch (error) {
    console.error('Error loading forecast:', error);
    forecastList.innerHTML = '<div style="color: #e74c3c; text-align: center; padding: 20px;">Error loading forecast</div>';
  }
}

// Parse forecast from entity list
function parseForecastFromEntities(entities, daysToShow) {
  const forecastData = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Group entities by day number
  const dayMap = {};
  
  entities.forEach(entity => {
    const id = entity.entity_id.toLowerCase();
    // Extract day number from entity ID (e.g., "day_1_high" -> day 1)
    const dayMatch = id.match(/(?:day_|daily_)(\d+)/);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1]);
      if (dayNum >= 1 && dayNum <= daysToShow) {
        if (!dayMap[dayNum]) {
          dayMap[dayNum] = {};
        }
        
        if (id.includes('high')) {
          dayMap[dayNum].high = Math.round(parseFloat(entity.state) || 0);
        } else if (id.includes('low')) {
          dayMap[dayNum].low = Math.round(parseFloat(entity.state) || 0);
        } else if (id.includes('condition')) {
          dayMap[dayNum].condition = entity.state || 'unknown';
        } else if (id.includes('icon')) {
          dayMap[dayNum].icon = entity.state;
        }
      }
    }
  });
  
  // Build forecast array
  for (let day = 1; day <= daysToShow; day++) {
    if (dayMap[day] && dayMap[day].high !== undefined && dayMap[day].low !== undefined) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + (day - 1));
      const dayName = dayNames[forecastDate.getDay()];
      
      forecastData.push({
        day,
        dayName,
        high: dayMap[day].high,
        low: dayMap[day].low,
        condition: dayMap[day].condition || 'unknown',
        icon: dayMap[day].icon || getWeatherIcon(dayMap[day].condition || 'unknown')
      });
    }
  }
  
  return forecastData;
}

// Render forecast items
function renderForecast(forecastData, attrs) {
  const forecastList = document.getElementById('weather-forecast-list');
  forecastList.innerHTML = '';
  
  if (forecastData.length === 0) {
    forecastList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No forecast data available</div>';
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
  
  forecastData.forEach((day, index) => {
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
    
    forecastItem.innerHTML = `
      <div class="weather-forecast-day">${day.dayName}</div>
      <div class="weather-forecast-icon">${day.icon}</div>
      <div class="weather-forecast-temps">
        <div class="weather-forecast-low">${day.low}°</div>
        <div class="weather-forecast-bar">
          <div class="weather-forecast-bar-fill" style="width: ${barWidth}%; left: ${barLeft}%;">
            ${markerPercent !== null ? `<div class="weather-forecast-bar-marker" style="left: ${markerPercent}%;"></div>` : ''}
          </div>
        </div>
        <div class="weather-forecast-high">${day.high}°</div>
      </div>
    `;
    
    forecastList.appendChild(forecastItem);
  });
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

