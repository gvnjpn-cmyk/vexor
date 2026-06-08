import { checkApiKey, ok, fail } from './_lib.js';
import { Resvg } from '@resvg/resvg-js';

function esc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function wrapSvgText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

const RANDOM_QUOTES = [
  { text: 'Jangan pernah menyerah. Kesuksesan adalah milik mereka yang terus berusaha.', author: 'Anonim' },
  { text: 'Hidup adalah perjalanan, bukan tujuan. Nikmati setiap langkahnya.', author: 'Anonim' },
  { text: 'Kegagalan adalah awal dari kesuksesan yang lebih besar.', author: 'Anonim' },
  { text: 'Mimpi besar, kerja keras, pantang menyerah.', author: 'Anonim' },
  { text: 'Setiap hari adalah kesempatan baru untuk menjadi lebih baik.', author: 'Anonim' },
  { text: 'Keberanian bukan berarti tidak takut, tapi melangkah meski takut.', author: 'Anonim' },
];

const THEMES = {
  purple: { bg1:'#0f0f1a', bg2:'#1a1030', accent1:'#a78bfa', accent2:'#6d28d9', quote:'#ededf5', author:'#a78bfa' },
  blue:   { bg1:'#0c1445', bg2:'#0f0f1a', accent1:'#60a5fa', accent2:'#1d4ed8', quote:'#ededf5', author:'#60a5fa' },
  green:  { bg1:'#0a1a0f', bg2:'#0f1a10', accent1:'#34d399', accent2:'#059669', quote:'#ededf5', author:'#34d399' },
  gold:   { bg1:'#1a1205', bg2:'#0f0f0a', accent1:'#fbbf24', accent2:'#d97706', quote:'#ededf5', author:'#fbbf24' },
};

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  let { text, author, theme = 'purple' } = req.body || {};

  // Random quote kalau tidak ada input
  if (!text || !text.trim()) {
    const rand = RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)];
    text = rand.text;
    author = author || rand.author;
  }
  if (!author || !author.trim()) author = 'Anonim';

  const colors = THEMES[theme] || THEMES.purple;
  const W = 520;
  const lines = wrapSvgText(text.slice(0, 200), 36);
  const H = Math.max(200, 80 + lines.length * 30 + 80);

  const quoteLines = lines.map((line, i) =>
    `<text x="${W/2}" y="${90 + i * 30}" font-size="17" fill="${colors.quote}" text-anchor="middle">${esc(line)}</text>`
  ).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.bg1}"/>
      <stop offset="100%" stop-color="${colors.bg2}"/>
    </linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${colors.accent1}"/>
      <stop offset="100%" stop-color="${colors.accent2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>
  <rect x="${W-4}" y="0" width="4" height="${H}" rx="2" fill="url(#al)"/>

  <!-- Quote mark besar -->
  <text x="28" y="72" font-size="80" fill="${colors.accent1}" opacity="0.15">"</text>

  <!-- Teks quote -->
  ${quoteLines}

  <!-- Garis pembatas -->
  <rect x="${W/2-40}" y="${H-68}" width="80" height="2" rx="1" fill="url(#al)"/>

  <!-- Author -->
  <text x="${W/2}" y="${H-38}" font-size="13" fill="${colors.author}" text-anchor="middle">— ${esc(author)}</text>
  <text x="${W/2}" y="${H-16}" font-size="10" fill="#3d3d5a" text-anchor="middle">Vexor Quote Card</text>
</svg>`;

  try {
    const resvg = new Resvg(svg);
    const png = Buffer.from(resvg.render().asPng());
    return ok(res, {
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      width: W, height: H,
      meta: { text, author, theme },
    });
  } catch(e) { return fail(res, 'Render error: ' + e.message, 500); }
}
