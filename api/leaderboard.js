import { checkApiKey, ok, fail } from './_lib.js';
import { Resvg } from '@resvg/resvg-js';

const W = 520;
const HEADER = 80;
const ROW_H = 64;
const PADDING = 16;

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function trunc(str, max) { return str.length > max ? str.slice(0,max)+'...' : str; }

const MEDALS = ['🥇','🥈','🥉'];
const RANK_COLORS = ['#fbbf24','#94a3b8','#cd7f32'];
const RANK_BG = ['rgba(251,191,36,0.12)','rgba(148,163,184,0.08)','rgba(205,127,50,0.08)'];

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  const { title = 'Top Member', members } = req.body || {};
  if (!members || !Array.isArray(members) || members.length === 0)
    return fail(res, 'members array is required. Format: [{name, score, extra?}]');

  const top = members.slice(0, 10);
  const H = HEADER + top.length * ROW_H + PADDING;

  const rows = top.map((m, i) => {
    const y = HEADER + i * ROW_H;
    const rankColor = RANK_COLORS[i] || '#6b6b8a';
    const rowBg = RANK_BG[i] || 'rgba(255,255,255,0.03)';
    const medal = i < 3 ? MEDALS[i] : `#${i+1}`;
    const name = esc(trunc(String(m.name || 'Unknown'), 20));
    const score = esc(String(m.score ?? '0'));
    const extra = m.extra ? esc(trunc(String(m.extra), 18)) : '';

    return `
    <rect x="12" y="${y+4}" width="${W-24}" height="${ROW_H-8}" rx="8" fill="${rowBg}" stroke="${rankColor}" stroke-width="${i<3?'1':'0.3'}" stroke-opacity="0.4"/>
    <text x="36" y="${y+ROW_H/2+6}" font-size="${i<3?18:14}" fill="${rankColor}" text-anchor="middle">${medal}</text>
    <text x="64" y="${y+ROW_H/2-4}" font-size="14" font-weight="bold" fill="#ededf5">${name}</text>
    ${extra ? `<text x="64" y="${y+ROW_H/2+13}" font-size="11" fill="#6b6b8a">${extra}</text>` : ''}
    <text x="${W-20}" y="${y+ROW_H/2+6}" font-size="14" font-weight="bold" fill="${rankColor}" text-anchor="end">${score}</text>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#1a1030"/>
    </linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>
  <text x="${W/2}" y="30" font-size="11" fill="#6b6b8a" text-anchor="middle" letter-spacing="3">LEADERBOARD</text>
  <text x="${W/2}" y="58" font-size="20" font-weight="bold" fill="#ededf5" text-anchor="middle">${esc(trunc(title,30))}</text>
  <rect x="12" y="70" width="${W-24}" height="1" fill="rgba(167,139,250,0.2)"/>
  ${rows}
  </svg>`;

  try {
    const resvg = new Resvg(svg);
    const png = Buffer.from(resvg.render().asPng());
    return ok(res, {
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      width: W, height: H,
      total: top.length,
    });
  } catch(e) { return fail(res, 'Render error: ' + e.message, 500); }
}
