import { checkApiKey, ok, fail } from './_lib.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  const { url, packname, author, number } = req.body || {};
  if (!url) return fail(res, 'url (image/gif/video) is required');

  const ext = url.split('.').pop().toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webp'];
  if (!allowed.includes(ext)) return fail(res, `Unsupported file type. Allowed: ${allowed.join(', ')}`);

  // Hook point: use sharp + @whiskeysockets/baileys to convert & send
  return ok(res, {
    message: 'Sticker job queued',
    source: url,
    packname: packname || 'WA Bot',
    author: author || 'API',
    sendTo: number ? `${number.replace(/\D/g, '')}@s.whatsapp.net` : null,
    timestamp: new Date().toISOString(),
  });
}
