// Home Assistant WebSocket helper for serverless (entity registry, etc.)
import WebSocket from 'ws';

/**
 * Send one authenticated HA websocket command and return its result.
 * @param {string} haUrl e.g. https://homeassistant.local:8123
 * @param {string} haToken long-lived access token
 * @param {object} command command fields without id (e.g. { type, entity_ids })
 */
export function haWebsocketCommand(haUrl, haToken, command, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (!haUrl || !haToken) {
      reject(new Error('HA URL and token required for websocket'));
      return;
    }

    const wsUrl = `${String(haUrl).replace(/\/$/, '').replace(/^http/i, 'ws')}/api/websocket`;
    let settled = false;
    let msgId = 1;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch (_) { /* ignore */ }
      fn(value);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`HA websocket timeout for ${command?.type || 'command'}`));
    }, timeoutMs);

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finish(reject, err);
      return;
    }

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (err) {
        finish(reject, err);
        return;
      }

      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: haToken }));
        return;
      }

      if (msg.type === 'auth_invalid') {
        finish(reject, new Error(msg.message || 'HA websocket auth failed'));
        return;
      }

      if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({ id: msgId, ...command }));
        return;
      }

      if (msg.type === 'result' && msg.id === msgId) {
        if (msg.success) {
          finish(resolve, msg.result);
        } else {
          finish(reject, new Error(msg.error?.message || 'HA websocket command failed'));
        }
      }
    });

    ws.on('error', (err) => {
      finish(reject, err);
    });

    ws.on('close', () => {
      if (!settled) {
        finish(reject, new Error('HA websocket closed before result'));
      }
    });
  });
}

/**
 * Fetch entity registry entries (extended_dict) for the given entity IDs.
 * Returns a map of entity_id -> entry | null.
 */
export async function fetchEntityRegistryEntries(haUrl, haToken, entityIds) {
  if (!entityIds?.length) return {};
  return haWebsocketCommand(haUrl, haToken, {
    type: 'config/entity_registry/get_entries',
    entity_ids: entityIds
  });
}
