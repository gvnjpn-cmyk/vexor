import { checkApiKey, ok, fail } from './_lib.js';

function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/youtu\.be|youtube\.com/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  const { url, quality } = req.body || {};
  if (!url) return fail(res, 'url is required');

  const platform = detectPlatform(url);
  if (!platform) return fail(res, 'Unsupported URL. Supported: TikTok, YouTube, Instagram, Twitter/X');

  // Hook point: integrate with yt-dlp / cobalt API / custom scraper
  // Example: const result = await ytdl(url) or fetch('https://cobalt.tools/api/json', ...)
  return ok(res, {
    platform,
    originalUrl: url,
    quality: quality || 'best',
    message: 'Download job received',
    hint: 'Connect to yt-dlp or cobalt.tools API to return real download links',
    timestamp: new Date().toISOString(),
  });
}
