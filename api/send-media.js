import { checkApiKey, ok, fail } from './_lib.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  const { number, url, caption, type } = req.body || {};
  if (!number) return fail(res, 'number is required');
  if (!url) return fail(res, 'url is required');

  const mediaType = type || 'image';
  const allowed = ['image', 'video', 'audio', 'document'];
  if (!allowed.includes(mediaType)) return fail(res, `type must be one of: ${allowed.join(', ')}`);

  const formatted = number.replace(/[^0-9]/g, '');

  // Hook point: connect your WA session here
  return ok(res, {
    message: 'Media queued successfully',
    to: `${formatted}@s.whatsapp.net`,
    mediaType,
    url,
    caption: caption || '',
    timestamp: new Date().toISOString(),
  });
}
