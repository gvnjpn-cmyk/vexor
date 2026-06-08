import { checkApiKey, ok, fail } from './_lib.js';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const W = 600;
const H = 340;

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trunc(str, max) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

async function fetchAvatarBase64(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buf).resize(132, 132).jpeg({ quality: 85 }).toBuffer();
    return 'data:image/jpeg;base64,' + resized.toString('base64');
  } catch {
    return null;
  }
}

function buildSvg({ name, number, role, bio, avatarB64, initials, date }) {
  const isOwner    = role === 'Owner';
  const roleColor  = isOwner ? '#fbbf24' : '#a78bfa';
  const roleBg     = isOwner ? 'rgba(251,191,36,0.15)' : 'rgba(167,139,250,0.15)';
  const roleBorder = isOwner ? 'rgba(251,191,36,0.5)'  : 'rgba(109,40,217,0.6)';

  const avatarEl = avatarB64
    ? `<image href="${avatarB64}" x="16" y="${H/2-66}" width="132" height="132"
         preserveAspectRatio="xMidYMid slice" clip-path="url(#ac)"/>`
    : `<circle cx="82" cy="${H/2}" r="66" fill="#2a1f4a"/>
       <text x="82" y="${H/2+15}" font-size="40"
             fill="${roleColor}" text-anchor="middle">${esc(initials)}</text>`;

  const bioEl = bio && bio.trim()
    ? `<text x="180" y="212" font-size="11" fill="#6b6b8a">BIO</text>
       <text x="180" y="230" font-size="13" fill="#9d9dbb">${esc(trunc(bio, 55))}</text>`
    : '';

  const gridH = Array.from({length:21},(_,i)=>`<line x1="${i*30}" y1="0" x2="${i*30}" y2="${H}"/>`).join('');
  const gridV = Array.from({length:12},(_,i)=>`<line x1="0" y1="${i*30}" x2="${W}" y2="${i*30}"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#1a1030"/>
    </linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
    <clipPath id="ac"><circle cx="82" cy="${H/2}" r="66"/></clipPath>
    <clipPath id="cc"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  <g clip-path="url(#cc)" stroke="rgba(167,139,250,0.04)" stroke-width="1">${gridH}${gridV}</g>
  <rect x="0" y="0" width="6" height="${H}" rx="3" fill="url(#al)"/>
  <text x="${W-20}" y="30" font-size="13" fill="#a78bfa" text-anchor="end">VEXOR</text>
  ${avatarEl}
  <circle cx="82" cy="${H/2}" r="73" fill="none" stroke="rgba(167,139,250,0.2)" stroke-width="1"/>
  <circle cx="82" cy="${H/2}" r="70" fill="none" stroke="#7c3aed" stroke-width="2.5"/>
  <rect x="180" y="56" width="90" height="24" rx="5" fill="${roleBg}" stroke="${roleBorder}" stroke-width="1"/>
  <text x="191" y="74" font-size="11" fill="${roleColor}">${esc(role.toUpperCase())}</text>
  <text x="180" y="128" font-size="26" font-weight="bold" fill="#ededf5">${esc(trunc(name, 22))}</text>
  <rect x="180" y="140" width="${W-210}" height="1" fill="#a78bfa" opacity="0.35"/>
  <text x="180" y="165" font-size="11" fill="#6b6b8a">NOMOR WA</text>
  <text x="180" y="186" font-size="15" font-weight="bold" fill="#ededf5">+${esc(number)}</text>
  ${bioEl}
  <rect x="0" y="${H-42}" width="${W}" height="42" fill="rgba(167,139,250,0.05)"/>
  <rect x="0" y="${H-42}" width="${W}" height="1" fill="rgba(167,139,250,0.12)"/>
  <text x="20" y="${H-14}" font-size="11" fill="#3d3d5a">vexor.api id-card</text>
  <text x="${W-20}" y="${H-14}" font-size="11" fill="#3d3d5a" text-anchor="end">${esc(date)}</text>
</svg>`;
}

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  const { number, role = 'Member', bio = '' } = req.body || {};
  let { name, avatar } = req.body || {};

  if (!number) return fail(res, 'number is required');

  const formatted = number.replace(/[^0-9]/g, '');
  if (!name || !name.trim()) name = '+' + formatted;

  if (!avatar || !avatar.trim()) {
    const initials = name === '+' + formatted
      ? formatted.slice(-2)
      : name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=2a1f4a&color=a78bfa&bold=true&format=png`;
  }

  const initials = name === '+' + formatted
    ? formatted.slice(-2)
    : name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const date = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const avatarB64 = await fetchAvatarBase64(avatar);

  try {
    const svg = buildSvg({ name, number: formatted, role, bio, avatarB64, initials, date });
    const resvg = new Resvg(svg);
    const pngBuffer = Buffer.from(resvg.render().asPng());

    return ok(res, {
      imageBase64: pngBuffer.toString('base64'),
      mimeType: 'image/png',
      width: W,
      height: H,
      meta: { name, number: '+' + formatted, role, avatarFetched: !!avatarB64 },
    });
  } catch (e) {
    return fail(res, 'Render error: ' + e.message, 500);
  }
}
