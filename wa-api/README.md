# Vexor API Platform

REST API platform untuk WhatsApp bot, deploy-ready di Vercel.

## Struktur Project

```
wa-api/
├── index.html          ← Frontend (docs + API tester)
├── vercel.json         ← Vercel config
├── api/
│   ├── _lib.js         ← Auth helper (shared)
│   ├── status.js       ← GET /api/status
│   ├── send-message.js ← POST /api/send-message
│   ├── send-media.js   ← POST /api/send-media
│   ├── groups.js       ← GET  /api/groups
│   ├── sticker.js      ← POST /api/sticker
│   ├── downloader.js   ← POST /api/downloader
│   └── ai-reply.js     ← POST /api/ai-reply
```

## Deploy ke Vercel

1. Upload folder ini ke GitHub
2. Import repo di vercel.com
3. Tambahkan Environment Variables:
   - `API_KEY` = api key rahasia kamu (cth: `rahasia123`)
   - `ANTHROPIC_API_KEY` = API key Anthropic (untuk endpoint /api/ai-reply)
4. Deploy!

## Semua Endpoint

| Method | Path               | Keterangan                        |
|--------|--------------------|-----------------------------------|
| GET    | /api/status        | Cek status API                    |
| POST   | /api/send-message  | Kirim pesan teks                  |
| POST   | /api/send-media    | Kirim gambar/video/audio/dokumen  |
| GET    | /api/groups        | Ambil daftar grup WA              |
| POST   | /api/sticker       | Buat stiker dari gambar/gif       |
| POST   | /api/downloader    | Download TikTok/YouTube/IG/Twitter|
| POST   | /api/ai-reply      | Generate balasan AI (Claude)      |

## Autentikasi

Semua endpoint (kecuali /api/status) butuh API key:

```
Header: x-api-key: <API_KEY>
# atau
Query:  ?apikey=<API_KEY>
```

## Menghubungkan ke Baileys (WA Session)

Di setiap file `api/*.js` ada komentar `// Hook point`.
Tambahkan logic Baileys/Whatsapp-web.js di sana.

Contoh untuk send-message.js:
```js
// Import sock dari session manager kamu
import { sock } from '../lib/wa-session.js'
await sock.sendMessage(formatted + '@s.whatsapp.net', { text: message })
```

## Integrasi ID Card dengan Baileys

Endpoint `/api/id-card` bisa dipanggil hanya dengan `number` saja.
Tapi kalau mau nama & foto PP beneran dari WA, kirim dari bot Baileys kamu:

```js
// Di plugin bot Baileys kamu (contoh: plugins/id-card.js)

import fetch from 'node-fetch';

const API_URL = 'https://vexor-kamu.vercel.app'; // ganti URL deploy kamu
const API_KEY = process.env.VEXOR_API_KEY;

export async function handleIdCard(sock, msg) {
  const sender = msg.key.remoteJid;
  const number = sender.replace('@s.whatsapp.net', '');

  // 1. Ambil nama dari profil WA
  let name = msg.pushName || number;

  // 2. Ambil URL foto profil WA
  let avatar = null;
  try {
    avatar = await sock.profilePictureUrl(sender, 'image');
  } catch {
    avatar = null; // pakai fallback otomatis
  }

  // 3. Ambil status/bio WA (opsional)
  let bio = '';
  try {
    const status = await sock.fetchStatus(sender);
    bio = status?.status || '';
  } catch {}

  // 4. Panggil Vexor API
  const res = await fetch(`${API_URL}/api/id-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ number, name, avatar, bio, role: 'Member' })
  });

  const data = await res.json();
  if (!data.ok) return sock.sendMessage(sender, { text: '❌ Gagal generate ID card' });

  // 5. Kirim gambar ke WA
  const imageBuffer = Buffer.from(data.imageBase64, 'base64');
  await sock.sendMessage(sender, {
    image: imageBuffer,
    caption: `✅ *ID Card kamu*\n📛 ${name}\n📱 +${number}`
  });
}
```

### Cara pakai di message handler:
```js
if (text === '/id' || text === '.id') {
  await handleIdCard(sock, msg);
}
```

### Env variable tambahan di bot:
```
VEXOR_API_KEY=rahasia123
```
