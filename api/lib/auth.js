export function validateDakboardPassword(req) {
  const expected = process.env.DAKBOARD_PASSWORD;
  if (!expected) {
    return { ok: false, status: 500, error: 'DAKBOARD_PASSWORD not configured' };
  }

  const headerPassword = req.headers['x-dakboard-password'];
  const bodyPassword = req.body?.password;
  const provided = headerPassword || bodyPassword;

  if (!provided || String(provided).toLowerCase() !== String(expected).toLowerCase()) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dakboard-Password');
}
