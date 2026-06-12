import { setCors, validateDakboardPassword } from './lib/auth.js';

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = validateDakboardPassword(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.status === 401 ? 'Incorrect password' : auth.error });
  }

  return res.status(200).json({ ok: true });
}
