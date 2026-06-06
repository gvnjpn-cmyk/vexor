// _lib.js - shared auth + CORS helper

// Tambah domain/IP bot kamu di sini, atau set env ALLOWED_ORIGINS
// Format: comma-separated, cth: "https://bot.pterodactyl.io,http://103.x.x.x"
function getAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS || '';
  if (env) return env.split(',').map(o => o.trim());
  return null; // null = allow semua origin (default open)
}

export function setCors(req, res) {
  const allowed = getAllowedOrigins();
  const origin = req.headers['origin'] || req.headers['host'] || '*';

  if (!allowed) {
    // Tidak ada whitelist → allow semua (cocok untuk API publik dengan key auth)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Ada whitelist → cek origin
    const matched = allowed.find(a => origin.includes(a.replace(/https?:\/\//, '')));
    if (matched) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowed[0]);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function checkApiKey(req, res) {
  // Handle preflight OPTIONS dulu
  if (req.method === 'OPTIONS') {
    setCors(req, res);
    res.status(200).end();
    return false;
  }

  setCors(req, res);

  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.apikey;
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
