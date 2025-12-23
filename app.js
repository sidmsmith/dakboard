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
  
  // Todo add item
  const todoInput = document.getElementById('todo-input');
  const todoAddBtn = document.getElementById('todo-add-btn');
  
  if (todoAddBtn) {
    todoAddBtn.addEventListener('click', () => {
      if (activeTodoList && todoInput && todoInput.value.trim()) {
        addTodoItem(activeTodoList, todoInput.value);
      }
    });
  }
  
  if (todoInput) {
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && activeTodoList && todoInput.value.trim()) {
        addTodoItem(activeTodoList, todoInput.value);
      }
    });
  }
  
  document.getElementById('close-month-modal').addEventListener('click', () => {
    closeMonthModal();
  });
  
  // Close modal on background click
  document.getElementById('month-modal').addEventListener('click', (e) => {
    if (e.target.id === 'month-modal') {
      closeMonthModal();
    }
  });
  
  // Hourly forecast modal
  document.getElementById('close-hourly-modal').addEventListener('click', () => {
    closeHourlyModal();
  });
  
  document.getElementById('hourly-modal').addEventListener('click', (e) => {
    if (e.target.id === 'hourly-modal') {
      closeHourlyModal();
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

// Show hourly forecast modal
function showHourlyForecast(dayOffset, dayName, high, low) {
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
      attrs.apparent_temperature ? `${Math.round(attrs.apparent_temperature)}°F` : '--°F';
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
        showHourlyForecast(offset, name, highTemp, lowTemp);
      };
    })(dayOffsetForClick, day.dayName, day.high, day.low));
    
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

// Todo list state
let todoLists = [];
let activeTodoList = null;

// Load todos from HA - discover all todo lists
async function loadTodos() {
  try {
    // Discover all todo list entities
    const allStates = await fetchAllHAStates();
    if (!allStates) {
      document.getElementById('todo-list').innerHTML = 
        '<li class="todo-item"><span style="color: #888;">Error discovering todo lists</span></li>';
      return;
    }
    
    // Filter for todo entities - check multiple patterns
    todoLists = allStates
      .filter(e => {
        const entityId = e.entity_id.toLowerCase();
        const domain = e.entity_id.split('.')[0]?.toLowerCase();
        const friendlyName = (e.attributes?.friendly_name || '').toLowerCase();
        
        // Check multiple patterns:
        // 1. Entity ID starts with 'todo.'
        // 2. Domain is 'todo'
        // 3. Entity type/domain in attributes
        // 4. Friendly name contains 'todo' (as fallback)
        return entityId.startsWith('todo.') || 
               domain === 'todo' ||
               e.attributes?.device_class === 'todo' ||
               (friendlyName.includes('todo') && entityId.includes('list'));
      })
      .map(e => ({
        entityId: e.entity_id,
        name: e.attributes?.friendly_name || 
              e.attributes?.name || 
              e.entity_id.replace(/^todo\./, '').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()),
        entity: e
      }));
    
    // Debug: log found entities
    console.log('Found todo entities:', todoLists.map(l => ({ id: l.entityId, name: l.name })));
    console.log('All entities (first 20):', allStates.slice(0, 20).map(e => e.entity_id));
    
    if (todoLists.length === 0) {
      // Try to find any entity with 'todo' in the name for debugging
      const todoLike = allStates.filter(e => 
        e.entity_id.toLowerCase().includes('todo') || 
        (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase().includes('todo'))
      );
      console.log('Entities with "todo" in name:', todoLike.map(e => ({ id: e.entity_id, name: e.attributes?.friendly_name })));
      
      document.getElementById('todo-list').innerHTML = 
        '<li class="todo-item"><span style="color: #888;">No todo lists found. Check console for debug info.</span></li>';
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
    document.getElementById('todo-list').innerHTML = 
      '<li class="todo-item"><span class="error">Error loading todos</span></li>';
  }
}

// Render todo list tabs
function renderTodoTabs() {
  const tabsContainer = document.getElementById('todo-tabs');
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
}

// Load items for a specific todo list
async function loadTodoListItems(entityId) {
  try {
    const entity = await fetchHAEntity(entityId);
    if (!entity) {
      document.getElementById('todo-list').innerHTML = 
        '<li class="todo-item"><span style="color: #888;">Error loading todo list</span></li>';
      return;
    }
    
    const items = entity.attributes?.items || [];
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    
    if (items.length === 0) {
      todoList.innerHTML = '<li class="todo-item"><span style="color: #888;">No todos</span></li>';
      return;
    }
    
    // Separate completed and incomplete items
    const incomplete = items.filter(item => item.status === 'needs_action');
    const completed = items.filter(item => item.status === 'completed');
    
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
  } catch (error) {
    console.error('Error loading todo list items:', error);
    document.getElementById('todo-list').innerHTML = 
      '<li class="todo-item"><span class="error">Error loading items</span></li>';
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
  checkbox.addEventListener('click', () => {
    toggleTodoItem(entityId, item.uid, !isCompleted);
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
  try {
    const action = complete ? 'complete' : 'uncomplete';
    
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      // Direct HA API call for local development
      await fetch(`${window.CONFIG.HA_URL}/api/services/todo/${action}_item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          uid: itemUid
        })
      });
    } else {
      // Use serverless function (for Vercel production)
      await fetch('/api/ha-todo-action', {
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
    }
    
    // Reload items after a short delay
    setTimeout(() => {
      loadTodoListItems(entityId);
    }, 300);
  } catch (error) {
    console.error('Error toggling todo item:', error);
  }
}

// Add new todo item
async function addTodoItem(entityId, summary) {
  if (!summary || !summary.trim()) return;
  
  try {
    if (window.CONFIG && window.CONFIG.LOCAL_MODE && window.CONFIG.HA_URL && window.CONFIG.HA_TOKEN) {
      // Direct HA API call for local development
      await fetch(`${window.CONFIG.HA_URL}/api/services/todo/add_item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CONFIG.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_id: entityId,
          item: summary.trim()
        })
      });
    } else {
      // Use serverless function (for Vercel production)
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
    }
    
    // Clear input and reload
    document.getElementById('todo-input').value = '';
    setTimeout(() => {
      loadTodoListItems(entityId);
    }, 300);
  } catch (error) {
    console.error('Error adding todo item:', error);
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
        // Don't log 404s/500s for missing entities (expected for some forecast days/hours)
        // Just throw silently - caller will handle
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } else {
      // Use serverless function (for Vercel production)
      const response = await fetch(`/api/ha-fetch?entityId=${encodeURIComponent(entityId)}`);
      if (!response.ok) {
        // Don't log 404s/500s for missing entities (expected for some forecast days/hours)
        // Just throw silently - caller will handle
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
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

