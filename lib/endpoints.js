// All new endpoints
import { ok, fail } from './_lib.js';

export async function handlePhilosopherQuotes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/filsuf-quotes.json', {
      headers: {'User-Agent':'Mozilla/5.0','Accept':'application/json'}
    });
    const data = await r.json();
    const quotes = Array.isArray(data) ? data : data.quotes || data.result || data.data || [];
    if(!quotes.length) return fail(res,'No quotes available');
    const pick = quotes[Math.floor(Math.random()*quotes.length)];
    return ok(res, {quote: pick.quote || pick.text || pick.kata, author: pick.philosopher || pick.author || pick.filsuf || pick.name, source: 'Philosopher Quotes'});
  } catch(e) { return fail(res,'Quotes error: '+e.message,502); }
}

export async function handleAnimeQuotes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://api.jikan.moe/v4/random/quotes');
    if(!r.ok) return fail(res,'Anime API error');
    const d = await r.json();
    const q = d.data;
    return ok(res, {quote: q.quote || 'No quote', character: q.character?.name || 'Unknown', anime: q.anime?.title || 'Unknown', source: 'Anime Quote'});
  } catch(e) { return fail(res,'Anime quotes error: '+e.message,502); }
}

export async function handleQrCode(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text, size} = req.body || {};
  if(!text) return fail(res,'text is required');
  const s = size || 200;
  const encoded = encodeURIComponent(text);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encoded}`;
  try {
    const r = await fetch(url);
    const buf = await r.arrayBuffer();
    return ok(res, {imageBase64: Buffer.from(buf).toString('base64'), mimeType: 'image/png', width: s, height: s, text});
  } catch(e) { return fail(res,'QR error: '+e.message,502); }
}

export async function handleBarcode(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text, format} = req.body || {};
  if(!text) return fail(res,'text is required');
  const fmt = format || 'CODE128';
  const url = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(text)}&code=${fmt}&width=200&height=100`;
  try {
    const r = await fetch(url);
    const buf = await r.arrayBuffer();
    return ok(res, {imageBase64: Buffer.from(buf).toString('base64'), mimeType: 'image/png', format: fmt, text});
  } catch(e) { return fail(res,'Barcode error: '+e.message,502); }
}

export async function handleUsernameGen(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {name, style} = req.body || {};
  const adj = ['cool','epic','swift','dark','fire','cyber'];
  const noun = ['wolf','dragon','ninja','code','pixel','hack'];
  const user = name || 'user';
  const styles = {
    cool: () => `${adj[Math.floor(Math.random()*adj.length)]}_${noun[Math.floor(Math.random()*noun.length)]}`,
    number: () => `${user}${Math.floor(Math.random()*9999)}`,
    underscore: () => `_${user.toLowerCase()}_`
  };
  const fn = styles[style] || styles.cool;
  return ok(res, {username: fn(), alternatives: [fn(), fn(), fn()], style: style || 'cool'});
}

export async function handleJokes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode');
    const d = await r.json();
    return ok(res, {joke: d.type==='single' ? d.joke : `${d.setup}\n${d.delivery}`, category: d.category});
  } catch(e) { return fail(res,'Jokes error: '+e.message,502); }
}

export async function handleCurrencyConvert(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {from, to, amount} = req.query || {};
  if(!from || !to || !amount) return fail(res,'from, to, amount required');
  try {
    const r = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
    const d = await r.json();
    if(!d.rates) return fail(res,'Currency not found');
    const rate = d.rates[to.toUpperCase()];
    if(!rate) return fail(res,'Target currency not found');
    const result = (parseFloat(amount) * rate).toFixed(2);
    return ok(res, {from: from.toUpperCase(), to: to.toUpperCase(), amount: parseFloat(amount), rate, result: parseFloat(result)});
  } catch(e) { return fail(res,'Currency error: '+e.message,502); }
}

export async function handleAsciiArt(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text} = req.body || {};
  if(!text || text.length>30) return fail(res,'text required, max 30 char');
  try {
    const r = await fetch(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`);
    const ascii = await r.text();
    return ok(res, {ascii, text, length: ascii.length});
  } catch(e) { return fail(res,'ASCII error: '+e.message,502); }
}

export async function handleRandomName(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const names = ['Ace','Blade','Cipher','Dark','Echo','Fang','Ghost','Hunter'];
  const surnames = ['Storm','Fire','Wolf','Knight','Blade','Code','Byte','Cyber'];
  const first = names[Math.floor(Math.random()*names.length)];
  const last = surnames[Math.floor(Math.random()*surnames.length)];
  return ok(res, {fullName: `${first} ${last}`, firstName: first, lastName: last, username: `${first.toLowerCase()}${last.toLowerCase()}`});
}

export async function handleGradientBg(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {color1, color2, width, height} = req.body || {};
  const c1 = color1 || '#7c6fff';
  const c2 = color2 || '#4f46e5';
  const w = width || 800;
  const h = height || 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="grad"><stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#grad)"/></svg>`;
  try {
    const { Resvg } = await import('@resvg/resvg-js');
    const resvg = new Resvg(svg);
    const png = Buffer.from(resvg.render().asPng());
    return ok(res, {imageBase64: png.toString('base64'), mimeType: 'image/png', width: w, height: h, colors: {from: c1, to: c2}});
  } catch(e) { return fail(res,'Gradient error: '+e.message,500); }
}

export async function handleTextStats(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text} = req.body || {};
  if(!text) return fail(res,'text required');
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  const lines = text.split('\n').length;
  const vowels = (text.match(/[aeiouAEIOU]/g) || []).length;
  return ok(res, {characters: chars, words, lines, vowels, readingTime: `${Math.ceil(words/200)} min`});
}

export async function handleIpInfo(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {ip} = req.query || {};
  if(!ip) return fail(res,'ip query param required');
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const d = await r.json();
    return ok(res, {ip: d.ip, country: d.country_name, city: d.city, timezone: d.timezone, lat: d.latitude, lng: d.longitude});
  } catch(e) { return fail(res,'IP error: '+e.message,502); }
}

export async function handleColorInfo(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {hex} = req.query || {};
  if(!hex || !hex.match(/^#?[0-9A-F]{6}$/i)) return fail(res,'valid hex color required');
  const color = hex.replace('#','');
  try {
    const r = await fetch(`https://www.thecolorapi.com/id?hex=${color}`);
    const d = await r.json();
    return ok(res, {hex: `#${color}`, rgb: d.rgb.value, hsl: d.hsl.value, name: d.name.value});
  } catch(e) { return fail(res,'Color error: '+e.message,502); }
}

export async function handleShortUrl(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {url} = req.body || {};
  if(!url) return fail(res,'url required');
  try {
    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const short = await r.text();
    return ok(res, {original: url, shortened: short, service: 'TinyURL'});
  } catch(e) { return fail(res,'URL error: '+e.message,502); }
}

export async function handleRandomFacts(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://uselessfacts.jscinc.com/random.json');
    const d = await r.json();
    return ok(res, {fact: d.text, source: 'Useless Facts'});
  } catch(e) { return fail(res,'Facts error: '+e.message,502); }
}
