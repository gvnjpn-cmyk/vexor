// GET  /api/dash/status        → ambil status bot terakhir
// POST /api/dash/status        → bot kirim heartbeat
import { checkApiKey, ok, fail } from '../_lib.js';

// In-memory store (cukup untuk satu instance Vercel)
// Vercel serverless stateless, tapi heartbeat tiap 30-60 detik
// jadi selalu fresh di window aktif
let botState = {
  online: false,
  lastSeen: null,
  uptime: 0,
  memory: null,
  version: null,
  pluginCount: 0,
  msgCount: 0,
  reportedAt: null,
};

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;

  if (req.method === 'GET') {
    const now = Date.now();
    const lastMs = botState.lastSeen ? new Date(botState.lastSeen).getTime() : 0;
    const isOnline = botState.lastSeen && (now - lastMs) < 90_000; // 90 detik timeout
    return ok(res, { ...botState, online: isOnline });
  }

  if (req.method === 'POST') {
    const { uptime, memory, version, pluginCount, msgCount } = req.body || {};
    botState = {
      online: true,
      lastSeen: new Date().toISOString(),
      uptime:      uptime      ?? botState.uptime,
      memory:      memory      ?? botState.memory,
      version:     version     ?? botState.version,
      pluginCount: pluginCount ?? botState.pluginCount,
      msgCount:    msgCount    ?? botState.msgCount,
      reportedAt:  new Date().toISOString(),
    };
    return ok(res, { received: true });
  }

  return fail(res, 'Method not allowed', 405);
}
