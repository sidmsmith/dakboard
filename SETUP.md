# Dakboard Setup Guide

## Quick Start

1. **Update Entity IDs in `app.js`**
   - Open `dakboard/app.js`
   - Find the `CONFIG` object at the top
   - Update all entity IDs and webhook IDs to match your Home Assistant setup

2. **Verify Environment Variables in Vercel**
   - Ensure `HA_URL` and `HA_TOKEN` are set in your Vercel project
   - These should already be configured if you mentioned you have them

3. **Deploy to Vercel**
   - Push code to GitHub
   - Vercel will auto-deploy
   - Or manually deploy via Vercel CLI: `vercel`

## Finding Your Home Assistant Entity IDs

### Weather Entity (Pirate Weather)
1. Open Home Assistant
2. Go to **Developer Tools** > **States**
3. Search for `weather.pirate_weather` or similar
4. Common names: `weather.pirate_weather`, `weather.pirateweather`, `weather.pirate_weather_hourly`
5. Copy the exact entity ID

### Todo List Entity
1. In Home Assistant, go to **Developer Tools** > **States**
2. Search for `input_text` or `todo`
3. Common names: `input_text.todo_list`, `input_text.todos`, `todo.home`
4. If you don't have one, you can create it in `configuration.yaml`:
   ```yaml
   input_text:
     todo_list:
       name: "Todo List"
       initial: ""
   ```
5. Copy the exact entity ID

### Garage Door Entities
1. In Home Assistant, go to **Developer Tools** > **States**
2. Search for `cover` entities
3. Find your garage door entities (usually `cover.garage_door_1`, `cover.garage_door_2`, etc.)
4. Common names:
   - `cover.garage_door`
   - `cover.garage_door_1`
   - `cover.myq_garage_door_1`
   - `cover.meross_garage_door_1`
5. Copy all three entity IDs

### Alarm Panel Entity
1. In Home Assistant, go to **Developer Tools** > **States**
2. Search for `alarm_control_panel`
3. Common names:
   - `alarm_control_panel.home_alarm`
   - `alarm_control_panel.house`
   - `alarm_control_panel.ring_alarm`
4. Copy the exact entity ID

## Finding Your Webhook IDs

Webhooks in Home Assistant are created as automations or scripts. You need to find the webhook ID that triggers your garage doors and alarm.

### Method 1: Check Your Automations
1. Go to **Settings** > **Automations & Scenes**
2. Find automations that control your garage doors/alarm
3. Look for webhook triggers - the webhook ID is in the URL: `/api/webhook/{webhook_id}`

### Method 2: Check Your Scripts
1. Go to **Settings** > **Scripts**
2. Find scripts that control your garage doors/alarm
3. Check if they use webhooks

### Method 3: Create New Webhooks
If you don't have webhooks set up, you can create them:

1. **Create a webhook automation** in Home Assistant:
   ```yaml
   automation:
     - alias: "Garage Door 1 Toggle"
       trigger:
         - platform: webhook
           webhook_id: garage_door_1_toggle
       action:
         - service: cover.toggle
           target:
             entity_id: cover.garage_door_1
   ```

2. **Or create a script**:
   ```yaml
   script:
     garage_door_1_toggle:
       alias: "Toggle Garage Door 1"
       sequence:
         - service: cover.toggle
           target:
             entity_id: cover.garage_door_1
   ```
   Then create a webhook automation that calls this script.

3. **For alarm**, create similar webhook automation:
   ```yaml
   automation:
     - alias: "Alarm Toggle"
       trigger:
         - platform: webhook
           webhook_id: alarm_toggle
       action:
         - service: alarm_control_panel.alarm_toggle
           target:
             entity_id: alarm_control_panel.home_alarm
   ```

## Updating app.js Configuration

Open `dakboard/app.js` and update the `CONFIG` object:

```javascript
const CONFIG = {
  // Home Assistant Entity IDs
  HA_WEATHER_ENTITY: 'weather.pirate_weather', // ← Update this
  HA_TODO_ENTITY: 'input_text.todo_list', // ← Update this
  HA_GARAGE_DOOR_1: 'cover.garage_door_1', // ← Update this
  HA_GARAGE_DOOR_2: 'cover.garage_door_2', // ← Update this
  HA_GARAGE_DOOR_3: 'cover.garage_door_3', // ← Update this
  HA_ALARM_ENTITY: 'alarm_control_panel.home_alarm', // ← Update this
  
  // Home Assistant Webhook IDs
  HA_GARAGE_WEBHOOK_1: 'garage_door_1_toggle', // ← Update this
  HA_GARAGE_WEBHOOK_2: 'garage_door_2_toggle', // ← Update this
  HA_GARAGE_WEBHOOK_3: 'garage_door_3_toggle', // ← Update this
  HA_ALARM_WEBHOOK: 'alarm_toggle', // ← Update this
  
  // Refresh interval (milliseconds)
  REFRESH_INTERVAL: 30000, // 30 seconds (adjust as needed)
};
```

## Testing

1. **Test locally** (if possible):
   - Run a local server: `python -m http.server 8000`
   - Open `http://localhost:8000`
   - Check browser console for errors

2. **Test on Vercel**:
   - Deploy to Vercel
   - Open your Vercel URL
   - Check browser console for errors
   - Verify data is loading

## Troubleshooting

### "Error loading weather" / "Error loading todos" / etc.
- Check that entity IDs are correct in `app.js`
- Verify entities exist in Home Assistant (Developer Tools > States)
- Check Vercel function logs for API errors

### Garage doors / Alarm not toggling
- Verify webhook IDs are correct
- Check that webhooks exist in Home Assistant
- Verify webhook automations are enabled
- Check Vercel function logs for errors

### CORS errors
- The serverless functions should handle CORS automatically
- If you see CORS errors, check that `HA_URL` is correct in Vercel

### 401 Unauthorized errors
- Verify `HA_TOKEN` is correct in Vercel
- Check that the token hasn't expired
- Create a new long-lived access token if needed

## Next Steps

Once HA integration is working:
- ✅ Weather widget displaying Pirate Weather data
- ✅ Todo list showing HA todo items
- ✅ Garage doors showing status and toggling on click
- ✅ Alarm panel showing status and toggling on click
- ✅ Auto-refresh every 30 seconds

Then we can proceed with:
- Calendar integration (Google Calendar & Office365)
- Monthly calendar modal
- Additional polish and features



