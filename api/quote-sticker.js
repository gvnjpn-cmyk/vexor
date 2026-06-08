import { checkApiKey, ok, fail } from './_lib.js';

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  const { text, name = 'User', avatar, color = 'black' } = req.body || {};
  if (!text || !text.trim()) return fail(res, 'text is required');
  if (text.length > 100) return fail(res, 'text max 100 karakter');

  const COLORS = {
    pink:'#f68ac9', blue:'#6cace4', red:'#f44336', green:'#4caf50',
    yellow:'#ffeb3b', purple:'#9c27b0', darkblue:'#0d47a1', lightblue:'#03a9f4',
    ash:'#9e9e9e', orange:'#ff9800', black:'#000000', white:'#ffffff',
    teal:'#008080', lightpink:'#FFC0CB', chocolate:'#A52A2A', salmon:'#FFA07A',
    magenta:'#FF00FF', deeppink:'#FF1493', fire:'#B22222', skyblue:'#00BFFF',
    hotpink:'#FF69B4', cyan:'#48D1CC', violet:'#BA55D3', gold:'#FFD700',
    silver:'#C0C0C0', darkgreen:'#008000', navyblue:'#191970', darkred:'#8B0000',
  };

  const backgroundColor = COLORS[color.toLowerCase()];
  if (!backgroundColor) return fail(res, `Warna '${color}' tidak valid. Pilih: ${Object.keys(COLORS).join(', ')}`);

  // Resolve avatar URL
  let avatarUrl = avatar || 'https://files.catbox.moe/nwvkbt.png';

  // Kalau avatar adalah URL foto profil WA, coba upload ke soonex dulu
  if (avatar && avatar.startsWith('http')) {
    try {
      const ppRes = await fetch(avatar, { signal: AbortSignal.timeout(5000) });
      if (ppRes.ok) {
        const ppBuf = Buffer.from(await ppRes.arrayBuffer());
        const formData = new FormData();
        formData.append('file', new Blob([ppBuf], { type: 'image/jpeg' }), 'avatar.jpg');
        const uploadRes = await fetch('https://api.soonex.biz.id/api/upload', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(8000),
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.status && uploadData?.result?.url) {
          avatarUrl = uploadData.result.url;
        }
      }
    } catch { /* pakai avatar asli */ }
  }

  try {
    const quoteRes = await fetch('https://bot.lyo.su/quote/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        type: 'quote',
        format: 'png',
        backgroundColor,
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
          entities: [],
          avatar: true,
          from: { id: 1, name: String(name).slice(0, 32), photo: { url: avatarUrl } },
          text: text.trim(),
          replyMessage: {},
        }],
      }),
    });

    if (!quoteRes.ok) return fail(res, `Quote API error: ${quoteRes.status}`, 502);
    const quoteData = await quoteRes.json();
    if (!quoteData?.result?.image) return fail(res, 'Quote API tidak mengembalikan gambar', 502);

    return ok(res, {
      imageBase64: quoteData.result.image,
      mimeType: 'image/png',
      hint: 'Kirim ke WA pakai wa-sticker-formatter untuk jadi stiker',
      meta: { name, color, backgroundColor, avatarUsed: avatarUrl },
    });

  } catch (e) {
    return fail(res, 'Quote generation error: ' + e.message, 502);
  }
}
