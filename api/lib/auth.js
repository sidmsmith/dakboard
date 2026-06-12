export function validateProfileApiKey(req) {
  const expected = process.env.DAKBOARD_PROFILE_KEY;
  if (!expected) {
    return { ok: false, status: 500, error: 'DAKBOARD_PROFILE_KEY not configured' };
  }

  const headerKey = req.headers['x-dakboard-key'] || req.headers['x-dakboard-profile-key'];
  const bodyKey = req.body?.apiKey;
  const provided = headerKey || bodyKey;

  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dakboard-Key');
}
