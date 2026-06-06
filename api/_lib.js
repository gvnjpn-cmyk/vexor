// lib/auth.js - shared auth helper
export function checkApiKey(req, res) {
  const key = req.headers['x-api-key'] || req.query.apikey;
  const valid = process.env.API_KEY || 'waapikey123';
  if (!key || key !== valid) {
    res.status(401).json({ ok: false, error: 'Invalid or missing API key', hint: 'Pass x-api-key header or ?apikey= query' });
    return false;
  }
  return true;
}

export function ok(res, data) {
  return res.status(200).json({ ok: true, ...data });
}

export function fail(res, msg, code = 400) {
  return res.status(code).json({ ok: false, error: msg });
}
