import { ok, fail } from './_lib.js';

// ─── PHILOSOPHER QUOTES ───────────────────────────────────────
export async function handlePhilosopherQuotes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/filsuf-quotes.json',{headers:{'User-Agent':'Mozilla/5.0'}});
    const data = await r.json();
    const quotes = Array.isArray(data)?data:data.quotes||data.result||data.data||[];
    if(!quotes.length) return fail(res,'No quotes available');
    const pick = quotes[Math.floor(Math.random()*quotes.length)];
    return ok(res,{quote:pick.quote||pick.text||pick.kata,author:pick.philosopher||pick.author||pick.filsuf||pick.name,source:'Philosopher Quotes'});
  } catch(e){return fail(res,'Quotes error: '+e.message,502);}
}

// ─── ANIME QUOTES — pakai animechan (stable) ──────────────────
export async function handleAnimeQuotes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r = await fetch('https://animechan.io/api/v1/quotes/random',{signal:AbortSignal.timeout(6000)});
    if(!r.ok) throw new Error('API error '+r.status);
    const d = await r.json();
    const q = d.data||d;
    return ok(res,{quote:q.content||q.quote||'No quote',character:q.character?.name||q.character||'Unknown',anime:q.anime?.name||q.anime||'Unknown',source:'Anime Quote'});
  } catch(e){
    // fallback static
    const fallback=[
      {quote:'People\'s lives don\'t end when they die.',character:'Itachi Uchiha',anime:'Naruto'},
      {quote:'The only ones who should kill, are those who are prepared to be killed.',character:'Lelouch',anime:'Code Geass'},
      {quote:'Whatever you lose, you\'ll find it again. But what you throw away you\'ll never get back.',character:'Himura Kenshin',anime:'Rurouni Kenshin'},
    ];
    const pick=fallback[Math.floor(Math.random()*fallback.length)];
    return ok(res,{...pick,source:'Fallback'});
  }
}

// ─── QR CODE ─────────────────────────────────────────────────
export async function handleQrCode(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text,size}=req.body||{};
  if(!text) return fail(res,'text is required');
  const s=Math.min(size||300,1000);
  try {
    const r=await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(text)}&format=png`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error('QR API error');
    const buf=await r.arrayBuffer();
    return ok(res,{imageBase64:Buffer.from(buf).toString('base64'),mimeType:'image/png',width:s,height:s,text});
  } catch(e){return fail(res,'QR error: '+e.message,502);}
}

// ─── BARCODE — pakai bwip-js via API ─────────────────────────
export async function handleBarcode(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text,format}=req.body||{};
  if(!text) return fail(res,'text is required');
  // pakai QR code sebagai fallback barcode
  try {
    const r=await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&format=png`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error('Barcode API error');
    const buf=await r.arrayBuffer();
    return ok(res,{imageBase64:Buffer.from(buf).toString('base64'),mimeType:'image/png',format:format||'QR',text});
  } catch(e){return fail(res,'Barcode error: '+e.message,502);}
}

// ─── USERNAME GENERATOR ───────────────────────────────────────
export async function handleUsernameGen(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {name,style}=req.body||{};
  const adj=['cool','epic','swift','dark','fire','cyber','neon','hyper','ultra','mega'];
  const noun=['wolf','dragon','ninja','code','pixel','hack','byte','storm','blade','ghost'];
  const user=(name||'user').toLowerCase().replace(/\s+/g,'');
  const rand=()=>Math.floor(Math.random()*9999);
  const rAdj=()=>adj[Math.floor(Math.random()*adj.length)];
  const rNoun=()=>noun[Math.floor(Math.random()*noun.length)];
  const styles={
    cool:()=>`${rAdj()}_${rNoun()}`,
    number:()=>`${user}${rand()}`,
    underscore:()=>`_${user}_`,
    camel:()=>`${user}${rAdj().charAt(0).toUpperCase()+rAdj().slice(1)}`
  };
  const fn=styles[style]||styles.cool;
  return ok(res,{username:fn(),alternatives:[fn(),fn(),fn()],style:style||'cool'});
}

// ─── JOKES — jokeapi stable ───────────────────────────────────
export async function handleJokes(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  try {
    const r=await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&format=json',{signal:AbortSignal.timeout(6000)});
    if(!r.ok) throw new Error('API error');
    const d=await r.json();
    return ok(res,{joke:d.type==='single'?d.joke:`${d.setup}\n${d.delivery}`,category:d.category,type:d.type});
  } catch(e){
    const jokes=['Kenapa programmer suka dark mode? Karena cahaya menarik bug!','Kenapa programmer tidak suka alam? Terlalu banyak bugs!'];
    return ok(res,{joke:jokes[Math.floor(Math.random()*jokes.length)],category:'Programming',source:'fallback'});
  }
}

// ─── CURRENCY ────────────────────────────────────────────────
export async function handleCurrencyConvert(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {from,to,amount}=req.query||{};
  if(!from||!to||!amount) return fail(res,'from, to, amount required');
  try {
    const r=await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`,{signal:AbortSignal.timeout(6000)});
    if(!r.ok) throw new Error('API error');
    const d=await r.json();
    const rate=d.rates?.[to.toUpperCase()];
    if(!rate) return fail(res,'Currency not found');
    return ok(res,{from:from.toUpperCase(),to:to.toUpperCase(),amount:parseFloat(amount),rate,result:parseFloat((parseFloat(amount)*rate).toFixed(2))});
  } catch(e){return fail(res,'Currency error: '+e.message,502);}
}

// ─── ASCII ART — pakai texttoascii.com ───────────────────────
export async function handleAsciiArt(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text}=req.body||{};
  if(!text||text.length>20) return fail(res,'text required, max 20 char');
  try {
    const r=await fetch(`https://api.texttoascii.com/api?text=${encodeURIComponent(text)}&font=block`,{signal:AbortSignal.timeout(6000)});
    if(r.ok){
      const ascii=await r.text();
      if(ascii&&ascii.length>5) return ok(res,{ascii,text});
    }
    // fallback: buat manual sederhana
    const ascii=text.split('').map(c=>`[${c}]`).join('');
    return ok(res,{ascii:`\n${ascii}\n`,text,note:'simplified'});
  } catch(e){
    const ascii=text.split('').map(c=>`[${c}]`).join('');
    return ok(res,{ascii:`\n${ascii}\n`,text,note:'fallback'});
  }
}

// ─── RANDOM NAME ─────────────────────────────────────────────
export async function handleRandomName(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const first=['Ace','Blade','Cipher','Dark','Echo','Fang','Ghost','Hunter','Inferno','Jade','Kaze','Luna','Nexus','Orion','Phoenix','Raven','Shadow','Thunder','Viper','Zephyr'];
  const last=['Storm','Fire','Wolf','Knight','Blade','Code','Byte','Cyber','Nexus','Prime','Zero','Alpha','Delta','Sigma','Nova'];
  const f=first[Math.floor(Math.random()*first.length)];
  const l=last[Math.floor(Math.random()*last.length)];
  return ok(res,{fullName:`${f} ${l}`,firstName:f,lastName:l,username:`${f.toLowerCase()}${l.toLowerCase()}`});
}

// ─── GRADIENT BG ─────────────────────────────────────────────
export async function handleGradientBg(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {color1,color2,width,height}=req.body||{};
  const c1=color1||'#7c6fff',c2=color2||'#4f46e5';
  const w=Math.min(width||800,1920),h=Math.min(height||600,1080);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  try {
    const {Resvg}=await import('@resvg/resvg-js');
    const png=Buffer.from(new Resvg(svg).render().asPng());
    return ok(res,{imageBase64:png.toString('base64'),mimeType:'image/png',width:w,height:h,colors:{from:c1,to:c2}});
  } catch(e){return fail(res,'Gradient error: '+e.message,500);}
}

// ─── TEXT STATS ───────────────────────────────────────────────
export async function handleTextStats(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {text}=req.body||{};
  if(!text) return fail(res,'text required');
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  const chars=text.length;
  const lines=text.split('\n').length;
  const vowels=(text.match(/[aeiouAEIOU]/g)||[]).length;
  const sentences=(text.match(/[.!?]+/g)||[]).length||1;
  return ok(res,{characters:chars,words,lines,vowels,sentences,readingTime:`${Math.ceil(words/200)} min`,avgWordLength:(chars/words).toFixed(1)});
}

// ─── IP INFO ─────────────────────────────────────────────────
export async function handleIpInfo(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {ip}=req.query||{};
  if(!ip) return fail(res,'ip query param required');
  try {
    // ip-api.com lebih stable dan gratis
    const r=await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,region,timezone,lat,lon,isp,org,query`,{signal:AbortSignal.timeout(6000)});
    const d=await r.json();
    if(d.status==='fail') return fail(res,'IP not found');
    return ok(res,{ip:d.query,country:d.country,countryCode:d.countryCode,city:d.city,region:d.region,timezone:d.timezone,lat:d.lat,lng:d.lon,isp:d.isp});
  } catch(e){return fail(res,'IP error: '+e.message,502);}
}

// ─── COLOR INFO ───────────────────────────────────────────────
export async function handleColorInfo(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const {hex}=req.query||{};
  if(!hex) return fail(res,'hex required');
  const color=hex.replace('#','');
  if(!/^[0-9A-Fa-f]{6}$/.test(color)) return fail(res,'Invalid hex color');
  // Calculate color info locally (no external API)
  const r=parseInt(color.slice(0,2),16);
  const g=parseInt(color.slice(2,4),16);
  const b=parseInt(color.slice(4,6),16);
  const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255;
  const l=(max+min)/2;
  const s=max===min?0:(l>0.5?(max-min)/(2-max-min):(max-min)/(max+min));
  const brightness=Math.round((r*299+g*587+b*114)/1000);
  return ok(res,{hex:`#${color}`,rgb:`rgb(${r},${g},${b})`,hsl:`hsl(${Math.round(l*360)},${Math.round(s*100)}%,${Math.round(l*100)}%)`,brightness,isDark:brightness<128,r,g,b});
}

// ─── SHORT URL ───────────────────────────────────────────────
export async function handleShortUrl(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const {url}=req.body||{};
  if(!url) return fail(res,'url required');
  try {
    const r=await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error('TinyURL error');
    const short=await r.text();
    if(!short.startsWith('http')) throw new Error('Invalid response');
    return ok(res,{original:url,shortened:short,service:'TinyURL'});
  } catch(e){
    // fallback: is.gd
    try {
      const r2=await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,{signal:AbortSignal.timeout(8000)});
      const short=await r2.text();
      return ok(res,{original:url,shortened:short,service:'is.gd'});
    } catch(e2){return fail(res,'URL shortener error: '+e2.message,502);}
  }
}

// ─── RANDOM FACTS — pakai numbersapi + fallback ───────────────
export async function handleRandomFacts(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const facts=[
    'Gurita memiliki 3 jantung dan darah berwarna biru.',
    'Madu tidak pernah basi — ditemukan madu berumur 3000 tahun di makam Mesir masih bisa dimakan.',
    'Pisang secara teknis adalah buah berry, tapi stroberi bukan.',
    'Semut tidak pernah tidur.',
    'Oktobus dapat membuka toples dari dalam.',
    'Kupu-kupu merasakan rasa dengan kaki mereka.',
    'Hati manusia berdenyut sekitar 100.000 kali sehari.',
    'DNA manusia 98.7% sama dengan simpanse.',
    'Semut bisa mengangkat beban 50 kali lebih berat dari tubuhnya.',
    'Warna asli wortel adalah ungu, bukan oranye.',
    'Kilat menyambar Bumi sekitar 100 kali per detik.',
    'Otak manusia menghasilkan lebih banyak impuls listrik dalam sehari dari semua telepon di dunia.',
  ];
  try {
    const r=await fetch('https://uselessfacts.jscinc.com/random.json',{signal:AbortSignal.timeout(4000)});
    if(r.ok){const d=await r.json();if(d?.text) return ok(res,{fact:d.text,source:'Useless Facts'});}
  } catch{}
  return ok(res,{fact:facts[Math.floor(Math.random()*facts.length)],source:'local'});
}
