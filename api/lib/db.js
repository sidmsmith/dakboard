import { neon } from '@neondatabase/serverless';

let sql = null;
let schemaReady = false;

export function getSql() {
  if (!sql) {
    const url = process.env.NEON_DATABASE_URL;
    if (!url) {
      throw new Error('NEON_DATABASE_URL not configured');
    }
    sql = neon(url);
  }
  return sql;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS dakboard_profiles (
      id SERIAL PRIMARY KEY,
      profile_type VARCHAR(20) NOT NULL CHECK (profile_type IN ('manual', 'auto', 'current')),
      name VARCHAR(255),
      device_id VARCHAR(64),
      device_label VARCHAR(255),
      config JSONB NOT NULL,
      content_hash VARCHAR(64) NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_dakboard_profiles_type_saved
    ON dakboard_profiles (profile_type, saved_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_dakboard_profiles_auto_device_saved
    ON dakboard_profiles (profile_type, device_id, saved_at DESC)
    WHERE profile_type = 'auto'
  `;

  schemaReady = true;
}

export async function pruneAutoBackups(deviceId, keep = 60) {
  const sql = getSql();
  await sql`
    DELETE FROM dakboard_profiles
    WHERE id IN (
      SELECT id FROM dakboard_profiles
      WHERE profile_type = 'auto' AND device_id = ${deviceId}
      ORDER BY saved_at DESC
      OFFSET ${keep}
    )
  `;
}
