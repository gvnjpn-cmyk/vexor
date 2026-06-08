// SINGLE SERVERLESS FUNCTION — semua route di sini
import { checkApiKey, fail } from '../lib/_lib.js';
import {
  handleStatus, handleSendMessage, handleSendMedia, handleGroups,
  handleSticker, handleDownloader, handleAiReply, handleAiCoder,
  handleIdCard, handleLeaderboard, handleQuoteCard, handleQuoteSticker,
  handleWeather, handleDashPlugins, handleDashUpload, handleDashToggle,
  handleDashRestart,
} from '../lib/router.js';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse path — strip /api prefix
  const path = (req.url || '').replace(/^\/api/, '').replace(/\?.*$/, '');

  // Status endpoint (no auth needed for basic ping)
  if (path === '' || path === '/' || path === '/status') {
    return res.status(200).json({
      ok: true, name: 'Vexor API', version: '1.0.0', status: 'online',
      endpoints: [
        'POST /api/send-message', 'POST /api/send-media', 'GET /api/groups',
        'POST /api/sticker', 'POST /api/downloader', 'POST /api/ai-reply',
        'POST /api/ai-coder', 'POST /api/id-card', 'POST /api/leaderboard',
        'POST /api/quote-card', 'POST /api/quote-sticker', 'GET /api/weather',
        'GET|POST /api/dash/status', 'GET /api/dash/plugins',
        'POST /api/dash/upload', 'POST /api/dash/toggle', 'POST /api/dash/restart',
      ],
      timestamp: new Date().toISOString(),
    });
  }

  // Auth check untuk semua endpoint
  if (!checkApiKey(req, res)) return;

  // Route map
  switch (path) {
    case '/send-message':    return handleSendMessage(req, res);
    case '/send-media':      return handleSendMedia(req, res);
    case '/groups':          return handleGroups(req, res);
    case '/sticker':         return handleSticker(req, res);
    case '/downloader':      return handleDownloader(req, res);
    case '/ai-reply':        return handleAiReply(req, res);
    case '/ai-coder':        return handleAiCoder(req, res);
    case '/id-card':         return handleIdCard(req, res);
    case '/leaderboard':     return handleLeaderboard(req, res);
    case '/quote-card':      return handleQuoteCard(req, res);
    case '/quote-sticker':   return handleQuoteSticker(req, res);
    case '/weather':         return handleWeather(req, res);
    case '/dash/status':     return handleStatus(req, res);
    case '/dash/plugins':    return handleDashPlugins(req, res);
    case '/dash/upload':     return handleDashUpload(req, res);
    case '/dash/toggle':     return handleDashToggle(req, res);
    case '/dash/restart':    return handleDashRestart(req, res);
    default:                 return fail(res, `Endpoint '${path}' tidak ditemukan`, 404);
  }
}
