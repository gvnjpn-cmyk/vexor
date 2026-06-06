import { checkApiKey, ok, fail } from './_lib.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register fonts — path relatif ke root project di Vercel
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  try {
    const base = path.join(__dirname, '..', 'public', 'fonts');
    GlobalFonts.registerFromPath(path.join(base, 'Poppins-Regular.ttf'), 'Poppins');
    GlobalFonts.registerFromPath(path.join(base, 'Poppins-Bold.ttf'), 'Poppins');
    fontsRegistered = true;
  } catch (e) {
    console.warn('Font register failed, fallback to Liberation Sans:', e.message);
  }
}

const FONT = 'Poppins, Liberation Sans, FreeSans, sans-serif';
const W = 600;
const H = 340;

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  ensureFonts();

  const { number, role = 'Member', bio = '' } = req.body || {};
  let { name, avatar } = req.body || {};

  if (!number) return fail(res, 'number is required');

  const formatted = number.replace(/[^0-9]/g, '');

  // Fallback name
  if (!name || !name.trim()) name = '+' + formatted;

  // Fallback avatar via ui-avatars (reliable, no CORS)
  if (!avatar || !avatar.trim()) {
    const initials = name === '+' + formatted
      ? formatted.slice(-2)
      : name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=2a1f4a&color=a78bfa&bold=true&format=png`;
  }

  try {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0f1a');
    bg.addColorStop(1, '#1a1030');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fill();

    // ── Subtle grid pattern ──
    ctx.strokeStyle = 'rgba(167,139,250,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // ── Left accent bar ──
    const accent = ctx.createLinearGradient(0, 0, 0, H);
    accent.addColorStop(0, '#a78bfa');
    accent.addColorStop(1, '#6d28d9');
    ctx.fillStyle = accent;
    roundRect(ctx, 0, 0, 6, H, 3);
    ctx.fill();

    // ── Brand top-right ──
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ VEXOR', W - 20, 28);

    // ── Avatar ──
    const AX = 82, AY = H / 2, AR = 66;
    ctx.save();
    ctx.beginPath();
    ctx.arc(AX, AY, AR, 0, Math.PI * 2);
    ctx.clip();
    try {
      const img = await loadImage(avatar);
      ctx.drawImage(img, AX - AR, AY - AR, AR * 2, AR * 2);
    } catch {
      ctx.fillStyle = '#2a1f4a';
      ctx.fill();
      ctx.font = `bold 38px ${FONT}`;
      ctx.fillStyle = '#a78bfa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name[0]?.toUpperCase() || '?', AX, AY);
    }
    ctx.restore();

    // ── Avatar ring ──
    ctx.beginPath();
    ctx.arc(AX, AY, AR + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(AX, AY, AR + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(167,139,250,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Role badge ──
    const roleText = role.toUpperCase();
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const roleW = ctx.measureText(roleText).width + 22;
    ctx.fillStyle = 'rgba(167,139,250,0.15)';
    roundRect(ctx, 180, 56, roleW, 24, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(109,40,217,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText(roleText, 191, 73);

    // ── Name ──
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillStyle = '#ededf5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const displayName = name.length > 22 ? name.slice(0, 22) + '…' : name;
    ctx.fillText(displayName, 180, 128);

    // ── Divider ──
    const divGrad = ctx.createLinearGradient(180, 0, W - 30, 0);
    divGrad.addColorStop(0, 'rgba(167,139,250,0.4)');
    divGrad.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(180, 140, W - 210, 1);

    // ── Number ──
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#6b6b8a';
    ctx.fillText('NOMOR WA', 180, 165);
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = '#ededf5';
    ctx.fillText('+' + formatted, 180, 186);

    // ── Bio ──
    if (bio && bio.trim()) {
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#6b6b8a';
      ctx.fillText('BIO', 180, 212);
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = '#9d9dbb';
      wrapText(ctx, bio.slice(0, 80), 180, 230, W - 215, 18);
    }

    // ── Bottom strip ──
    ctx.fillStyle = 'rgba(167,139,250,0.05)';
    ctx.fillRect(0, H - 42, W, 42);

    // bottom divider line
    ctx.fillStyle = 'rgba(167,139,250,0.12)';
    ctx.fillRect(0, H - 42, W, 1);

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = '#3d3d5a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('vexor.api · id-card', 20, H - 21);
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), W - 20, H - 21);

    const buffer = canvas.toBuffer('image/png');
    const base64 = buffer.toString('base64');

    return ok(res, {
      imageBase64: base64,
      mimeType: 'image/png',
      width: W,
      height: H,
      meta: { name, number: '+' + formatted, role, avatarAuto: !req.body?.avatar, nameAuto: !req.body?.name },
    });

  } catch (e) {
    return fail(res, 'Canvas render error: ' + e.message, 500);
  }
}
