import { checkApiKey, ok, fail } from './_lib.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  const { number, message } = req.body || {};
  if (!number) return fail(res, 'number is required');
  if (!message) return fail(res, 'message is required');

  const formatted = number.replace(/[^0-9]/g, '');
  if (formatted.length < 9) return fail(res, 'Invalid phone number');

  // Hook point: connect your WA session here
  return ok(res, {
    message: 'Message queued successfully',
    to: `${formatted}@s.whatsapp.net`,
    preview: message.slice(0, 50),
    timestamp: new Date().toISOString(),
  });
}
