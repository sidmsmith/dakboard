import { validateProfileApiKey, setCors } from './lib/auth.js';
import { ensureSchema, getSql, pruneAutoBackups } from './lib/db.js';
import { hashConfig } from './lib/hash.js';

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = validateProfileApiKey(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      return await handleGet(req, res);
    }

    if (req.method === 'POST') {
      return await handlePost(req, res);
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Profiles API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req, res) {
  const sql = getSql();
  const { id, type, device_id: deviceId, include_config: includeConfig } = req.query;

  if (id) {
    const rows = await sql`
      SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at, config
      FROM dakboard_profiles
      WHERE id = ${parseInt(id, 10)}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const row = rows[0];
    return res.status(200).json({
      id: row.id,
      profile_type: row.profile_type,
      name: row.name,
      device_id: row.device_id,
      device_label: row.device_label,
      content_hash: row.content_hash,
      saved_at: row.saved_at,
      config: row.config
    });
  }

  let rows;
  if (type === 'auto') {
    if (deviceId) {
      rows = await sql`
        SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at
        FROM dakboard_profiles
        WHERE profile_type = 'auto' AND device_id = ${deviceId}
        ORDER BY saved_at DESC
        LIMIT 60
      `;
    } else {
      rows = await sql`
        SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at
        FROM dakboard_profiles
        WHERE profile_type = 'auto'
        ORDER BY saved_at DESC
        LIMIT 200
      `;
    }
  } else if (type === 'manual') {
    rows = await sql`
      SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at
      FROM dakboard_profiles
      WHERE profile_type = 'manual'
      ORDER BY saved_at DESC
      LIMIT 200
    `;
  } else if (type === 'current') {
    if (!deviceId) {
      return res.status(400).json({ error: 'device_id is required for current profile lookup' });
    }

    if (includeConfig === 'true') {
      rows = await sql`
        SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at, config
        FROM dakboard_profiles
        WHERE profile_type = 'current' AND device_id = ${deviceId}
        ORDER BY saved_at DESC
        LIMIT 1
      `;
    } else {
      rows = await sql`
        SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at
        FROM dakboard_profiles
        WHERE profile_type = 'current' AND device_id = ${deviceId}
        ORDER BY saved_at DESC
        LIMIT 1
      `;
    }
  } else {
    rows = await sql`
      SELECT id, profile_type, name, device_id, device_label, content_hash, saved_at
      FROM dakboard_profiles
      WHERE profile_type IN ('manual', 'auto')
      ORDER BY saved_at DESC
      LIMIT 200
    `;
  }

  const profiles = rows.map((row) => ({
    id: row.id,
    profile_type: row.profile_type,
    name: row.name,
    device_id: row.device_id,
    device_label: row.device_label,
    content_hash: row.content_hash,
    saved_at: row.saved_at,
    ...(includeConfig === 'true' && row.config ? { config: row.config } : {})
  }));

  return res.status(200).json({ profiles });
}

async function handlePost(req, res) {
  const sql = getSql();
  const {
    profile_type: profileType,
    name,
    config,
    device_id: deviceId,
    device_label: deviceLabel
  } = req.body || {};

  if (!profileType || !config) {
    return res.status(400).json({ error: 'profile_type and config are required' });
  }

  if (!['manual', 'auto', 'current'].includes(profileType)) {
    return res.status(400).json({ error: 'Invalid profile_type' });
  }

  if ((profileType === 'auto' || profileType === 'current') && !deviceId) {
    return res.status(400).json({ error: 'device_id is required for auto/current profiles' });
  }

  if (profileType === 'manual' && (!name || !String(name).trim())) {
    return res.status(400).json({ error: 'name is required for manual profiles' });
  }

  const contentHash = hashConfig(config);
  const savedAt = new Date().toISOString();

  if (profileType === 'auto') {
    const latest = await sql`
      SELECT id, content_hash, saved_at
      FROM dakboard_profiles
      WHERE profile_type = 'auto' AND device_id = ${deviceId}
      ORDER BY saved_at DESC
      LIMIT 1
    `;

    if (latest.length && latest[0].content_hash === contentHash) {
      return res.status(200).json({
        skipped: true,
        reason: 'unchanged',
        id: latest[0].id,
        saved_at: latest[0].saved_at
      });
    }

    const displayName = `Auto backup${deviceLabel ? ` (${deviceLabel})` : ''}`;
    const inserted = await sql`
      INSERT INTO dakboard_profiles (
        profile_type, name, device_id, device_label, config, content_hash, saved_at
      ) VALUES (
        'auto', ${displayName}, ${deviceId}, ${deviceLabel || null},
        ${JSON.stringify(config)}::jsonb, ${contentHash}, ${savedAt}::timestamptz
      )
      RETURNING id, saved_at
    `;

    await pruneAutoBackups(deviceId, 60);

    return res.status(201).json({
      created: true,
      id: inserted[0].id,
      saved_at: inserted[0].saved_at
    });
  }

  if (profileType === 'current') {
    await sql`
      DELETE FROM dakboard_profiles
      WHERE profile_type = 'current' AND device_id = ${deviceId}
    `;

    const inserted = await sql`
      INSERT INTO dakboard_profiles (
        profile_type, name, device_id, device_label, config, content_hash, saved_at
      ) VALUES (
        'current', ${'Current sync'}, ${deviceId}, ${deviceLabel || null},
        ${JSON.stringify(config)}::jsonb, ${contentHash}, ${savedAt}::timestamptz
      )
      RETURNING id, saved_at
    `;

    return res.status(200).json({
      synced: true,
      id: inserted[0].id,
      saved_at: inserted[0].saved_at
    });
  }

  const inserted = await sql`
    INSERT INTO dakboard_profiles (
      profile_type, name, device_id, device_label, config, content_hash, saved_at
    ) VALUES (
      'manual', ${String(name).trim()}, ${deviceId || null}, ${deviceLabel || null},
      ${JSON.stringify(config)}::jsonb, ${contentHash}, ${savedAt}::timestamptz
    )
    RETURNING id, saved_at
  `;

  return res.status(201).json({
    created: true,
    id: inserted[0].id,
    saved_at: inserted[0].saved_at
  });
}

async function handleDelete(req, res) {
  const sql = getSql();
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const deleted = await sql`
    DELETE FROM dakboard_profiles
    WHERE id = ${parseInt(id, 10)} AND profile_type = 'manual'
    RETURNING id
  `;

  if (!deleted.length) {
    return res.status(404).json({ error: 'Manual profile not found' });
  }

  return res.status(200).json({ deleted: true, id: deleted[0].id });
}
