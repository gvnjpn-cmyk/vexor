import { checkApiKey, ok, fail } from './_lib.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

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
  ctx.fillText(line.trim(), x, y);
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

// Fetch WA profile name via status endpoint
async function fetchWaName(number) {
  try {
    const jid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    // Hook: ganti dengan sock.fetchStatus(jid) dari Baileys
    // Ini fallback kalau dipanggil langsung dari API tanpa session
    return null;
  } catch {
    return null;
  }
}

// Fetch WA profile picture URL
async function fetchWaAvatar(number) {
  try {
    // Hook: ganti dengan sock.profilePictureUrl(jid, 'image') dari Baileys
    // Default fallback ke UI Avatar API
    const n = number.replace(/[^0-9]/g, '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&size=200&background=2a1f4a&color=a78bfa&bold=true`;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  // number wajib — nama & avatar opsional, akan di-fetch otomatis kalau kosong
  const { number, role = 'Member', bio = '' } = req.body || {};
  let { name, avatar } = req.body || {};

  if (!number) return fail(res, 'number is required');

  const formatted = number.replace(/[^0-9]/g, '');

  // Auto-fetch nama dari WA kalau tidak dikirim
  if (!name) {
    name = await fetchWaName(formatted);
    if (!name) name = '+' + formatted; // fallback ke nomor
  }

  // Auto-fetch foto PP dari WA kalau tidak dikirim
  if (!avatar) {
    avatar = await fetchWaAvatar(formatted);
  }

  try {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Background gradient ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0f1a');
    bg.addColorStop(1, '#1a1030');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fill();

    // ── Accent bar left ──
    const accent = ctx.createLinearGradient(0, 0, 0, H);
    accent.addColorStop(0, '#a78bfa');
    accent.addColorStop(1, '#6d28d9');
    ctx.fillStyle = accent;
    roundRect(ctx, 0, 0, 6, H, 3);
    ctx.fill();

    // ── Top brand label ──
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'right';
    ctx.fillText('⚡ VEXOR', W - 20, 30);

    // ── Avatar circle ──
    const AX = 80, AY = H / 2, AR = 68;
    ctx.save();
    ctx.beginPath();
    ctx.arc(AX, AY, AR, 0, Math.PI * 2);
    ctx.clip();
    if (avatar) {
      try {
        const img = await loadImage(avatar);
        ctx.drawImage(img, AX - AR, AY - AR, AR * 2, AR * 2);
      } catch {
        ctx.fillStyle = '#2a1f4a';
        ctx.fill();
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#a78bfa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name[0].toUpperCase(), AX, AY);
      }
    } else {
      ctx.fillStyle = '#2a1f4a';
      ctx.fill();
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#a78bfa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name[0].toUpperCase(), AX, AY);
    }
    ctx.restore();

    // ── Avatar ring ──
    ctx.beginPath();
    ctx.arc(AX, AY, AR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ── Role badge ──
    const roleText = role.toUpperCase();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const roleW = ctx.measureText(roleText).width + 20;
    ctx.fillStyle = 'rgba(167,139,250,0.18)';
    roundRect(ctx, 180, 58, roleW, 24, 5);
    ctx.fill();
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText(roleText, 190, 75);

    // ── Name ──
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ededf5';
    ctx.fillText(name.length > 22 ? name.slice(0, 22) + '…' : name, 180, 130);

    // ── Divider ──
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(180, 142, W - 210, 1);

    // ── Number row ──
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#7c7c9a';
    ctx.fillText('📱 Nomor', 180, 168);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ededf5';
    ctx.fillText('+' + formatted, 180, 188);

    // ── Bio ──
    if (bio) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#7c7c9a';
      ctx.fillText('💬 Bio', 180, 215);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#b0b0cc';
      wrapText(ctx, bio, 180, 233, W - 210, 18);
    }

    // ── Auto-fetch note ──
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#4a4a6a';
    ctx.textAlign = 'left';
    const autoLabel = name === '+' + formatted ? '⚡ Nama dari nomor WA' : '⚡ Data dari profil WA';
    ctx.fillText(autoLabel, 180, H - 52);

    // ── Bottom bar ──
    ctx.fillStyle = 'rgba(167,139,250,0.06)';
    ctx.fillRect(0, H - 44, W, 44);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#4a4a6a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Generated by Vexor API Platform', 20, H - 22);
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), W - 20, H - 22);

    const buffer = canvas.toBuffer('image/png');
    const base64 = buffer.toString('base64');

    return ok(res, {
      imageBase64: base64,
      mimeType: 'image/png',
      width: W,
      height: H,
      meta: {
        name,
        number: '+' + formatted,
        role,
        avatarFetched: !req.body?.avatar,
        nameFetched: !req.body?.name,
      },
    });

  } catch (e) {
    return fail(res, 'Canvas error: ' + e.message, 500);
  }
}
