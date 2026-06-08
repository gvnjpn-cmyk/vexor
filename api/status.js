export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    name: 'Vexor API',
    version: '1.0.0',
    status: 'online',
    endpoints: [
      { method: 'POST', path: '/api/send-message',  auth: true,  desc: 'Send text message' },
      { method: 'POST', path: '/api/send-media',    auth: true,  desc: 'Send image/video/audio/document' },
      { method: 'GET',  path: '/api/groups',        auth: true,  desc: 'Get group list' },
      { method: 'POST', path: '/api/sticker',       auth: true,  desc: 'Convert image/gif to sticker' },
      { method: 'POST', path: '/api/downloader',    auth: true,  desc: 'Download TikTok/YouTube/IG/Twitter' },
      { method: 'POST', path: '/api/ai-reply',      auth: true,  desc: 'Generate AI reply via Claude' },
      { method: 'POST', path: '/api/id-card',       auth: true,  desc: 'Generate kartu ID sebagai gambar PNG' },
      { method: 'POST', path: '/api/leaderboard',   auth: true,  desc: 'Generate gambar leaderboard/top member' },
      { method: 'GET',  path: '/api/weather',       auth: true,  desc: 'Card cuaca dari nama kota (?city=Jakarta)' },
      { method: 'POST', path: '/api/quote-card',    auth: true,  desc: 'Generate gambar quote/kutipan' },
      { method: 'POST', path: '/api/ai-coder',      auth: true,  desc: 'Generate kode dari prompt, kirim sebagai ZIP' },
    ],
    timestamp: new Date().toISOString(),
  });
}
