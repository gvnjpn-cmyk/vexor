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
