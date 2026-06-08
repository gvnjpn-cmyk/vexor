/*
  Plugin QC (Quote Card Sticker) untuk bot Baileys
  Deps: wa-sticker-formatter, axios (atau native fetch)
  Command: /qc <warna> <teks>
*/

import { Sticker, StickerTypes } from 'wa-sticker-formatter';

const COLORS = {
  pink:'#f68ac9', blue:'#6cace4', red:'#f44336', green:'#4caf50',
  yellow:'#ffeb3b', purple:'#9c27b0', darkblue:'#0d47a1', lightblue:'#03a9f4',
  ash:'#9e9e9e', orange:'#ff9800', black:'#000000', white:'#ffffff',
  teal:'#008080', lightpink:'#FFC0CB', chocolate:'#A52A2A', salmon:'#FFA07A',
  magenta:'#FF00FF', tan:'#D2B48C', wheat:'#F5DEB3', deeppink:'#FF1493',
  fire:'#B22222', skyblue:'#00BFFF', brightskyblue:'#1E90FF', hotpink:'#FF69B4',
  lightskyblue:'#87CEEB', seagreen:'#20B2AA', darkred:'#8B0000', orangered:'#FF4500',
  cyan:'#48D1CC', violet:'#BA55D3', mossgreen:'#00FF7F', darkgreen:'#008000',
  navyblue:'#191970', darkorange:'#FF8C00', darkpurple:'#9400D3', fuchsia:'#FF00FF',
  darkmagenta:'#8B008B', darkgray:'#2F4F4F', peachpuff:'#FFDAB9', gold:'#FFD700',
  silver:'#C0C0C0', goldenrod:'#DAA520',
};

const handler = async (m, plug) => {
  const { sock, chatId, reply, react, m: msg } = plug;
  const body = m.body?.replace(/^[!/.](qc)\s*/i, '').trim() || '';
  const [colorRaw, ...msgParts] = body.split(' ');
  const color = colorRaw?.toLowerCase();

  if (!color || !msgParts.length && !m.quoted) {
    const colorList = Object.keys(COLORS).join(', ');
    return reply(`*💡 Contoh:* /qc black halo dunia\n\n*Warna tersedia:*\n${colorList}`);
  }

  const message = m.quoted?.text || msgParts.join(' ');
  if (!message?.trim()) return reply('❌ Teks pesan tidak boleh kosong!');
  if (message.length > 100) return reply('❌ Maksimal 100 karakter!');

  const backgroundColor = COLORS[color];
  if (!backgroundColor) return reply(`❌ Warna '${color}' tidak ditemukan!\nKetik /qc untuk lihat daftar warna.`);

  await react('⏳');

  try {
    // Ambil foto profil
    let avatarUrl = 'https://files.catbox.moe/nwvkbt.png';
    try {
      const ppUrl = await sock.profilePictureUrl(m.sender, 'image');
      if (ppUrl) {
        // Download & upload ke soonex
        const ppRes = await fetch(ppUrl);
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
    } catch { /* pakai fallback */ }

    const username = m.pushName || 'User';

    // Generate quote image
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
          from: {
            id: 1,
            name: username,
            photo: { url: avatarUrl },
          },
          text: message,
          replyMessage: {},
        }],
      }),
    });

    if (!quoteRes.ok) throw new Error(`Quote API error: ${quoteRes.status}`);
    const quoteData = await quoteRes.json();
    const imgBuffer = Buffer.from(quoteData.result.image, 'base64');

    // Convert ke stiker
    const sticker = new Sticker(imgBuffer, {
      pack: 'Vexor Bot',
      author: username,
      type: StickerTypes.FULL,
      quality: 100,
    });

    await sock.sendMessage(chatId, { sticker: await sticker.toBuffer() }, { quoted: msg });
    await react('✅');

  } catch (e) {
    await react('❌');
    await reply(`❌ Error: ${e.message}`);
  }
};

handler.help = ['qc <warna> <teks>'];
handler.tags = ['sticker'];
handler.command = /^(qc)$/i;
handler.limit = true;

export default handler;
