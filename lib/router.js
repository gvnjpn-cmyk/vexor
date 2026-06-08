// Semua logic endpoint dikumpulkan di sini
import { ok, fail } from './_lib.js';
import { POPPINS_BOLD_B64 } from './_font.js';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { ghHeaders, ghBase, ghBranch, ghPluginsPath, isConfigured } from './dash/_gh.js';

const FONT_BUF = Buffer.from(POPPINS_BOLD_B64, 'base64');

// ─── Helpers ───────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function trunc(s,n) { return s.length>n?s.slice(0,n)+'...':s; }
function svgRender(svg) {
  const resvg = new Resvg(svg);
  return Buffer.from(resvg.render().asPng());
}
async function fetchAvatarB64(url) {
  try {
    const r = await fetch(url,{signal:AbortSignal.timeout(4000)});
    if(!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const resized = await sharp(buf).resize(132,132).jpeg({quality:85}).toBuffer();
    return 'data:image/jpeg;base64,'+resized.toString('base64');
  } catch { return null; }
}
function wrapText(text,maxChars) {
  const words=text.split(' ');const lines=[];let line='';
  for(const w of words){
    if((line+' '+w).trim().length>maxChars){if(line)lines.push(line.trim());line=w;}
    else line=(line+' '+w).trim();
  }
  if(line)lines.push(line.trim());
  return lines;
}

// ─── STATUS BOT ────────────────────────────────────────────
let botState = { online:false,lastSeen:null,uptime:0,memory:null,version:null,pluginCount:0,msgCount:0 };

export async function handleStatus(req,res) {
  if(req.method==='GET') {
    const isOnline = botState.lastSeen && (Date.now()-new Date(botState.lastSeen).getTime())<90000;
    return ok(res,{...botState,online:isOnline});
  }
  if(req.method==='POST') {
    const{uptime,memory,version,pluginCount,msgCount}=req.body||{};
    botState={online:true,lastSeen:new Date().toISOString(),
      uptime:uptime??botState.uptime,memory:memory??botState.memory,
      version:version??botState.version,pluginCount:pluginCount??botState.pluginCount,
      msgCount:msgCount??botState.msgCount,reportedAt:new Date().toISOString()};
    return ok(res,{received:true});
  }
  return fail(res,'Method not allowed',405);
}

// ─── SEND MESSAGE ───────────────────────────────────────────
export function handleSendMessage(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{number,message}=req.body||{};
  if(!number) return fail(res,'number is required');
  if(!message) return fail(res,'message is required');
  const formatted=number.replace(/[^0-9]/g,'');
  if(formatted.length<9) return fail(res,'Invalid phone number');
  return ok(res,{message:'Message queued',to:`${formatted}@s.whatsapp.net`,preview:message.slice(0,50),timestamp:new Date().toISOString()});
}

// ─── SEND MEDIA ─────────────────────────────────────────────
export function handleSendMedia(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{number,url,caption,type}=req.body||{};
  if(!number) return fail(res,'number is required');
  if(!url) return fail(res,'url is required');
  const mediaType=type||'image';
  const allowed=['image','video','audio','document'];
  if(!allowed.includes(mediaType)) return fail(res,`type must be: ${allowed.join(', ')}`);
  const formatted=number.replace(/[^0-9]/g,'');
  return ok(res,{message:'Media queued',to:`${formatted}@s.whatsapp.net`,mediaType,url,caption:caption||'',timestamp:new Date().toISOString()});
}

// ─── GROUPS ─────────────────────────────────────────────────
export function handleGroups(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  return ok(res,{total:3,groups:[
    {id:'120363000000000001@g.us',name:'Family Group',participants:12,isAdmin:true},
    {id:'120363000000000002@g.us',name:'Work Team',participants:30,isAdmin:false},
    {id:'120363000000000003@g.us',name:'Bot Testing',participants:5,isAdmin:true},
  ],note:'Connect Baileys session for real data'});
}

// ─── STICKER ─────────────────────────────────────────────────
export function handleSticker(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{url,packname,author,number}=req.body||{};
  if(!url) return fail(res,'url is required');
  return ok(res,{message:'Sticker job queued',source:url,packname:packname||'WA Bot',author:author||'API',sendTo:number?`${number.replace(/\D/g,'')}@s.whatsapp.net`:null,timestamp:new Date().toISOString()});
}

// ─── DOWNLOADER ──────────────────────────────────────────────
export function handleDownloader(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{url,quality}=req.body||{};
  if(!url) return fail(res,'url is required');
  const platform=/tiktok\.com/i.test(url)?'tiktok':/youtu/.test(url)?'youtube':/instagram\.com/i.test(url)?'instagram':/twitter\.com|x\.com/i.test(url)?'twitter':null;
  if(!platform) return fail(res,'Unsupported URL');
  return ok(res,{platform,originalUrl:url,quality:quality||'best',message:'Connect yt-dlp or cobalt.tools for real downloads',timestamp:new Date().toISOString()});
}

// ─── AI REPLY ───────────────────────────────────────────────
export async function handleAiReply(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{prompt,system,model}=req.body||{};
  if(!prompt) return fail(res,'prompt is required');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:model||'claude-haiku-4-5',max_tokens:512,system:system||'You are a helpful WhatsApp bot.',messages:[{role:'user',content:prompt}]}),
    });
    if(!r.ok){const e=await r.json();return fail(res,e?.error?.message||'AI error',502);}
    const d=await r.json();
    return ok(res,{reply:d.content?.[0]?.text||'',model:model||'claude-haiku-4-5',tokens:d.usage||{}});
  } catch(e){return fail(res,'AI error: '+e.message,502);}
}

// ─── AI CODER ───────────────────────────────────────────────
const MODELS=['zai-org/GLM-5','meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'];
function fetchTO(url,opts={}) {
  const c=new AbortController();const t=setTimeout(()=>c.abort(),90000);
  return fetch(url,{...opts,signal:c.signal}).finally(()=>clearTimeout(t));
}
async function parseStream(sr) {
  let out='',buf='';
  const reader=sr.body.getReader();const dec=new TextDecoder();
  while(true){const{done,value}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();
    for(const l of lines){const tr=l.trim();if(!tr)continue;try{const j=JSON.parse(tr);const c=j?.choices?.[0]?.delta?.content;if(c)out+=c;}catch{}}}
  if(buf.trim()){try{const j=JSON.parse(buf.trim());const c=j?.choices?.[0]?.delta?.content;if(c)out+=c;}catch{}}
  return out;
}
function extractFiles(output) {
  const files=[];const re=/```(?:tsx?|jsx?|css|scss|json|html?|md)\{path=([^}]+)\}\n([\s\S]*?)```/g;let m;
  while((m=re.exec(output))!==null){const p=m[1].replace(/^\//,'');if(p&&m[2])files.push({path:p,content:m[2]});}
  return files;
}
export async function handleAiCoder(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{prompt}=req.body||{};
  if(!prompt?.trim()) return fail(res,'prompt is required');
  let chatId=null,lastMessageId=null,usedModel=null;
  for(const model of MODELS){
    try{
      const r=await fetchTO('https://llamacoder.together.ai/api/create-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt.trim(),model,quality:'low'})});
      if(!r.ok)continue;const d=await r.json();
      if(d?.chatId){chatId=d.chatId;lastMessageId=d.lastMessageId;usedModel=model;break;}
    }catch{continue;}
  }
  if(!chatId) return fail(res,'Gagal buat session LlamaCoder',502);
  let sr;
  try{sr=await fetchTO('https://llamacoder.together.ai/api/get-next-completion-stream-promise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId:lastMessageId,model:usedModel})});}
  catch(e){return fail(res,'Stream error: '+e.message,502);}
  if(!sr.ok) return fail(res,'Stream error: '+sr.status,502);
  let out;try{out=await parseStream(sr);}catch(e){return fail(res,'Stream parse error: '+e.message,502);}
  if(!out) return fail(res,'No output generated',502);
  const files=extractFiles(out);
  if(!files.length) return fail(res,'No files generated. Try a more specific prompt.');
  const{zipSync,strToU8}=await import('fflate');
  const zf={};for(const f of files)zf[f.path]=strToU8(f.content);
  const zipped=zipSync(zf,{level:6});
  return ok(res,{zipBase64:Buffer.from(zipped).toString('base64'),mimeType:'application/zip',fileName:`aicoder-${prompt.trim().replace(/\s+/g,'-').toLowerCase().slice(0,30)}.zip`,files:files.map(f=>f.path),totalFiles:files.length,model:usedModel?.split('/').pop()});
}

// ─── ID CARD ────────────────────────────────────────────────
export async function handleIdCard(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{number,role='Member',bio=''}=req.body||{};let{name,avatar}=req.body||{};
  if(!number) return fail(res,'number is required');
  const formatted=number.replace(/[^0-9]/g,'');
  if(!name?.trim()) name='+'+formatted;
  if(!avatar?.trim()){
    const ini=name==='+'+formatted?formatted.slice(-2):name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    avatar=`https://ui-avatars.com/api/?name=${encodeURIComponent(ini)}&size=200&background=2a1f4a&color=a78bfa&bold=true&format=png`;
  }
  const initials=name==='+'+formatted?formatted.slice(-2):name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
  const date=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  const avatarB64=await fetchAvatarB64(avatar);
  const isOwner=role==='Owner';
  const rc=isOwner?'#fbbf24':'#a78bfa',rb=isOwner?'rgba(251,191,36,0.15)':'rgba(167,139,250,0.15)',rbo=isOwner?'rgba(251,191,36,0.5)':'rgba(109,40,217,0.6)';
  const W=600,H=340;
  const avatarEl=avatarB64?`<image href="${avatarB64}" x="16" y="${H/2-66}" width="132" height="132" preserveAspectRatio="xMidYMid slice" clip-path="url(#ac)"/>`:
    `<circle cx="82" cy="${H/2}" r="66" fill="#2a1f4a"/><text x="82" y="${H/2+15}" font-size="40" fill="${rc}" text-anchor="middle">${esc(initials)}</text>`;
  const bioEl=bio?.trim()?`<text x="180" y="212" font-size="11" fill="#6b6b8a">BIO</text><text x="180" y="230" font-size="13" fill="#9d9dbb">${esc(trunc(bio,55))}</text>`:'';
  const gH=Array.from({length:21},(_,i)=>`<line x1="${i*30}" y1="0" x2="${i*30}" y2="${H}"/>`).join('');
  const gV=Array.from({length:12},(_,i)=>`<line x1="0" y1="${i*30}" x2="${W}" y2="${i*30}"/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f0f1a"/><stop offset="100%" stop-color="#1a1030"/></linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>
    <clipPath id="ac"><circle cx="82" cy="${H/2}" r="66"/></clipPath>
    <clipPath id="cc"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  <g clip-path="url(#cc)" stroke="rgba(167,139,250,0.04)" stroke-width="1">${gH}${gV}</g>
  <rect x="0" y="0" width="6" height="${H}" rx="3" fill="url(#al)"/>
  <text x="${W-20}" y="30" font-size="13" fill="#a78bfa" text-anchor="end">VEXOR</text>
  ${avatarEl}
  <circle cx="82" cy="${H/2}" r="73" fill="none" stroke="rgba(167,139,250,0.2)" stroke-width="1"/>
  <circle cx="82" cy="${H/2}" r="70" fill="none" stroke="#7c3aed" stroke-width="2.5"/>
  <rect x="180" y="56" width="90" height="24" rx="5" fill="${rb}" stroke="${rbo}" stroke-width="1"/>
  <text x="191" y="74" font-size="11" fill="${rc}">${esc(role.toUpperCase())}</text>
  <text x="180" y="128" font-size="26" font-weight="bold" fill="#ededf5">${esc(trunc(name,22))}</text>
  <rect x="180" y="140" width="${W-210}" height="1" fill="#a78bfa" opacity="0.35"/>
  <text x="180" y="165" font-size="11" fill="#6b6b8a">NOMOR WA</text>
  <text x="180" y="186" font-size="15" font-weight="bold" fill="#ededf5">+${esc(formatted)}</text>
  ${bioEl}
  <rect x="0" y="${H-42}" width="${W}" height="42" fill="rgba(167,139,250,0.05)"/>
  <rect x="0" y="${H-42}" width="${W}" height="1" fill="rgba(167,139,250,0.12)"/>
  <text x="20" y="${H-14}" font-size="11" fill="#3d3d5a">vexor.api id-card</text>
  <text x="${W-20}" y="${H-14}" font-size="11" fill="#3d3d5a" text-anchor="end">${esc(date)}</text>
</svg>`;
  try{const png=svgRender(svg);return ok(res,{imageBase64:png.toString('base64'),mimeType:'image/png',width:W,height:H,meta:{name,number:'+'+formatted,role}});}
  catch(e){return fail(res,'Render error: '+e.message,500);}
}

// ─── LEADERBOARD ────────────────────────────────────────────
export async function handleLeaderboard(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{title='Top Member',members}=req.body||{};
  if(!members||!Array.isArray(members)||!members.length) return fail(res,'members array required');
  const top=members.slice(0,10);
  const W=520,HEADER=80,ROW_H=64,PADDING=16,H=HEADER+top.length*ROW_H+PADDING;
  const MEDALS=['🥇','🥈','🥉'],RC=['#fbbf24','#94a3b8','#cd7f32'],RB=['rgba(251,191,36,0.12)','rgba(148,163,184,0.08)','rgba(205,127,50,0.08)'];
  const rows=top.map((m,i)=>{
    const y=HEADER+i*ROW_H,rc=RC[i]||'#6b6b8a',rb=RB[i]||'rgba(255,255,255,0.03)';
    const medal=i<3?MEDALS[i]:`#${i+1}`;
    return `<rect x="12" y="${y+4}" width="${W-24}" height="${ROW_H-8}" rx="8" fill="${rb}" stroke="${rc}" stroke-width="${i<3?'1':'0.3'}" stroke-opacity="0.4"/>
    <text x="36" y="${y+ROW_H/2+6}" font-size="${i<3?18:14}" fill="${rc}" text-anchor="middle">${medal}</text>
    <text x="64" y="${y+ROW_H/2-4}" font-size="14" font-weight="bold" fill="#ededf5">${esc(trunc(String(m.name||'?'),20))}</text>
    ${m.extra?`<text x="64" y="${y+ROW_H/2+13}" font-size="11" fill="#6b6b8a">${esc(String(m.extra))}</text>`:''}
    <text x="${W-20}" y="${y+ROW_H/2+6}" font-size="14" font-weight="bold" fill="${rc}" text-anchor="end">${esc(String(m.score??0))}</text>`;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f0f1a"/><stop offset="100%" stop-color="#1a1030"/></linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>
  <text x="${W/2}" y="30" font-size="11" fill="#6b6b8a" text-anchor="middle">LEADERBOARD</text>
  <text x="${W/2}" y="58" font-size="20" font-weight="bold" fill="#ededf5" text-anchor="middle">${esc(trunc(title,30))}</text>
  <rect x="12" y="70" width="${W-24}" height="1" fill="rgba(167,139,250,0.2)"/>
  ${rows}</svg>`;
  try{const png=svgRender(svg);return ok(res,{imageBase64:png.toString('base64'),mimeType:'image/png',width:W,height:H,total:top.length});}
  catch(e){return fail(res,'Render error: '+e.message,500);}
}

// ─── QUOTE CARD ─────────────────────────────────────────────
const RAND_QUOTES=[
  {text:'Jangan pernah menyerah. Kesuksesan adalah milik mereka yang terus berusaha.',author:'Anonim'},
  {text:'Hidup adalah perjalanan, bukan tujuan. Nikmati setiap langkahnya.',author:'Anonim'},
  {text:'Kegagalan adalah awal dari kesuksesan yang lebih besar.',author:'Anonim'},
  {text:'Mimpi besar, kerja keras, pantang menyerah.',author:'Anonim'},
  {text:'Setiap hari adalah kesempatan baru untuk menjadi lebih baik.',author:'Anonim'},
];
const THEMES={
  purple:{bg1:'#0f0f1a',bg2:'#1a1030',a1:'#a78bfa',a2:'#6d28d9',qt:'#ededf5',au:'#a78bfa'},
  blue:{bg1:'#0c1445',bg2:'#0f0f1a',a1:'#60a5fa',a2:'#1d4ed8',qt:'#ededf5',au:'#60a5fa'},
  green:{bg1:'#0a1a0f',bg2:'#0f1a10',a1:'#34d399',a2:'#059669',qt:'#ededf5',au:'#34d399'},
  gold:{bg1:'#1a1205',bg2:'#0f0f0a',a1:'#fbbf24',a2:'#d97706',qt:'#ededf5',au:'#fbbf24'},
};
export async function handleQuoteCard(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  let{text,author,theme='purple'}=req.body||{};
  if(!text?.trim()){const r=RAND_QUOTES[Math.floor(Math.random()*RAND_QUOTES.length)];text=r.text;author=author||r.author;}
  if(!author?.trim()) author='Anonim';
  const c=THEMES[theme]||THEMES.purple;
  const W=520;const lines=wrapText(text.slice(0,200),36);const H=Math.max(200,80+lines.length*30+80);
  const qLines=lines.map((l,i)=>`<text x="${W/2}" y="${90+i*30}" font-size="17" fill="${c.qt}" text-anchor="middle">${esc(l)}</text>`).join('\n');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c.bg1}"/><stop offset="100%" stop-color="${c.bg2}"/></linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${c.a1}"/><stop offset="100%" stop-color="${c.a2}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>
  <rect x="${W-4}" y="0" width="4" height="${H}" rx="2" fill="url(#al)"/>
  <text x="28" y="72" font-size="80" fill="${c.a1}" opacity="0.15">"</text>
  ${qLines}
  <rect x="${W/2-40}" y="${H-68}" width="80" height="2" rx="1" fill="url(#al)"/>
  <text x="${W/2}" y="${H-38}" font-size="13" fill="${c.au}" text-anchor="middle">- ${esc(author)}</text>
  <text x="${W/2}" y="${H-16}" font-size="10" fill="#3d3d5a" text-anchor="middle">Vexor Quote Card</text>
</svg>`;
  try{const png=svgRender(svg);return ok(res,{imageBase64:png.toString('base64'),mimeType:'image/png',width:W,height:H,meta:{text,author,theme}});}
  catch(e){return fail(res,'Render error: '+e.message,500);}
}

// ─── QUOTE STICKER ──────────────────────────────────────────
const COLORS_QS={pink:'#f68ac9',blue:'#6cace4',red:'#f44336',green:'#4caf50',yellow:'#ffeb3b',purple:'#9c27b0',darkblue:'#0d47a1',orange:'#ff9800',black:'#000000',white:'#ffffff',teal:'#008080',gold:'#FFD700',silver:'#C0C0C0',cyan:'#48D1CC',violet:'#BA55D3'};
export async function handleQuoteSticker(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  const{text,name='User',avatar,color='black'}=req.body||{};
  if(!text?.trim()) return fail(res,'text is required');
  if(text.length>100) return fail(res,'text max 100 karakter');
  const bg=COLORS_QS[color.toLowerCase()];
  if(!bg) return fail(res,`Warna tidak valid. Pilih: ${Object.keys(COLORS_QS).join(', ')}`);
  let avatarUrl=avatar||'https://files.catbox.moe/nwvkbt.png';
  if(avatar?.startsWith('http')){
    try{
      const r=await fetch(avatar,{signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const buf=Buffer.from(await r.arrayBuffer());
        const fd=new FormData();fd.append('file',new Blob([buf],{type:'image/jpeg'}),'avatar.jpg');
        const ur=await fetch('https://api.soonex.biz.id/api/upload',{method:'POST',body:fd,signal:AbortSignal.timeout(8000)});
        const ud=await ur.json();if(ud?.status&&ud?.result?.url)avatarUrl=ud.result.url;
      }
    }catch{}
  }
  try{
    const qr=await fetch('https://bot.lyo.su/quote/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
      body:JSON.stringify({type:'quote',format:'png',backgroundColor:bg,width:512,height:768,scale:2,messages:[{entities:[],avatar:true,from:{id:1,name:String(name).slice(0,32),photo:{url:avatarUrl}},text:text.trim(),replyMessage:{}}]})});
    if(!qr.ok) return fail(res,'Quote API error: '+qr.status,502);
    const qd=await qr.json();
    if(!qd?.result?.image) return fail(res,'Quote API tidak mengembalikan gambar',502);
    return ok(res,{imageBase64:qd.result.image,mimeType:'image/png',hint:'Convert ke stiker pakai wa-sticker-formatter',meta:{name,color,backgroundColor:bg}});
  }catch(e){return fail(res,'Quote error: '+e.message,502);}
}

// ─── WEATHER ────────────────────────────────────────────────
const WMO={0:'Cerah',1:'Hampir Cerah',2:'Berawan Sebagian',3:'Berawan',45:'Berkabut',51:'Gerimis',61:'Hujan Ringan',63:'Hujan',65:'Hujan Lebat',80:'Hujan Singkat',95:'Badai Petir'};
const WMI={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',80:'🌦️',95:'⛈️'};
export async function handleWeather(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  const city=req.query?.city;if(!city) return fail(res,'city query param required');
  try{
    const gr=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id&format=json`,{signal:AbortSignal.timeout(5000)});
    const gd=await gr.json();if(!gd.results?.length) return fail(res,`Kota "${city}" tidak ditemukan`);
    const{latitude,longitude,name:cityName,country}=gd.results[0];
    const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto`,{signal:AbortSignal.timeout(5000)});
    const wd=await wr.json();const c=wd.current;
    const temp=Math.round(c.temperature_2m),feels=Math.round(c.apparent_temperature),humidity=c.relative_humidity_2m,wind=Math.round(c.wind_speed_10m),rain=c.precipitation,code=c.weather_code;
    const desc=WMO[code]||'Tidak Diketahui',icon=WMI[code]||'🌡️';
    const date=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    const W=500,H=220;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0c1445"/><stop offset="100%" stop-color="#0f0f1a"/></linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>
  <text x="52" y="110" font-size="64" text-anchor="middle">${icon}</text>
  <text x="130" y="90" font-size="52" font-weight="bold" fill="#ededf5">${temp}°</text>
  <text x="132" y="115" font-size="14" fill="#94a3b8">${desc}</text>
  <text x="132" y="135" font-size="12" fill="#6b6b8a">Terasa ${feels}°C</text>
  <text x="${W-16}" y="36" font-size="16" font-weight="bold" fill="#ededf5" text-anchor="end">${esc(cityName)}, ${esc(country)}</text>
  <text x="${W-16}" y="55" font-size="11" fill="#6b6b8a" text-anchor="end">${esc(date)}</text>
  <rect x="16" y="160" width="${W-32}" height="1" fill="rgba(167,139,250,0.2)"/>
  <text x="60" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">KELEMBABAN</text>
  <text x="60" y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${humidity}%</text>
  <text x="180" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">ANGIN</text>
  <text x="180" y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${wind} km/h</text>
  <text x="300" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">HUJAN</text>
  <text x="300" y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${rain} mm</text>
  <text x="420" y="201" font-size="10" fill="#3d3d5a" text-anchor="middle">vexor weather</text>
</svg>`;
    const png=svgRender(svg);
    return ok(res,{imageBase64:png.toString('base64'),mimeType:'image/png',width:W,height:H,data:{city:cityName,country,temp,feels,humidity,wind,rain,desc,icon}});
  }catch(e){return fail(res,'Weather error: '+e.message,500);}
}

// ─── DASH PLUGINS ───────────────────────────────────────────
export async function handleDashPlugins(req,res) {
  if(req.method!=='GET') return fail(res,'Method not allowed',405);
  if(!isConfigured()) return fail(res,'GitHub belum dikonfigurasi',503);
  try{
    const r=await fetch(`${ghBase()}/contents/${ghPluginsPath()}?ref=${ghBranch()}`,{headers:ghHeaders(),signal:AbortSignal.timeout(8000)});
    if(r.status===404) return fail(res,'Folder plugin tidak ditemukan',404);
    if(!r.ok) return fail(res,'GitHub error: '+r.status,502);
    const files=await r.json();
    const plugins=files.filter(f=>f.type==='file'&&f.name.endsWith('.js')).map(f=>({name:f.name,path:f.path,sha:f.sha,size:f.size,downloadUrl:f.download_url,enabled:!f.name.startsWith('_')}));
    return ok(res,{plugins,total:plugins.length,branch:ghBranch(),path:ghPluginsPath()});
  }catch(e){return fail(res,'GitHub error: '+e.message,502);}
}

export async function handleDashUpload(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  if(!isConfigured()) return fail(res,'GitHub belum dikonfigurasi',503);
  const{filename,content,message}=req.body||{};
  if(!filename||!content) return fail(res,'filename dan content diperlukan');
  if(!filename.endsWith('.js')) return fail(res,'Hanya file .js');
  if(filename.includes('/')||filename.includes('..')) return fail(res,'Nama file tidak valid');
  const pluginPath=`${ghPluginsPath()}/${filename}`;
  try{
    let sha=null;
    const ck=await fetch(`${ghBase()}/contents/${pluginPath}?ref=${ghBranch()}`,{headers:ghHeaders(),signal:AbortSignal.timeout(6000)});
    if(ck.ok){const d=await ck.json();sha=d.sha;}
    const body={message:message||`upload ${filename} via Vexor`,content,branch:ghBranch()};
    if(sha)body.sha=sha;
    const pr=await fetch(`${ghBase()}/contents/${pluginPath}`,{method:'PUT',headers:ghHeaders(),signal:AbortSignal.timeout(10000),body:JSON.stringify(body)});
    if(!pr.ok){const e=await pr.json();return fail(res,'GitHub push error: '+(e.message||pr.status),502);}
    const pd=await pr.json();
    return ok(res,{message:sha?'Plugin diupdate':'Plugin ditambahkan',filename,sha:pd.content?.sha,action:sha?'updated':'created'});
  }catch(e){return fail(res,'Upload error: '+e.message,502);}
}

export async function handleDashToggle(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  if(!isConfigured()) return fail(res,'GitHub belum dikonfigurasi',503);
  const{filename,enable}=req.body||{};
  if(!filename) return fail(res,'filename required');
  const isDisabled=filename.startsWith('_');
  if(enable&&!isDisabled) return ok(res,{message:'Plugin sudah enabled'});
  if(!enable&&isDisabled) return ok(res,{message:'Plugin sudah disabled'});
  const newName=enable?filename.replace(/^_/,''):`_${filename}`;
  const oldPath=`${ghPluginsPath()}/${filename}`,newPath=`${ghPluginsPath()}/${newName}`;
  try{
    const gr=await fetch(`${ghBase()}/contents/${oldPath}?ref=${ghBranch()}`,{headers:ghHeaders(),signal:AbortSignal.timeout(6000)});
    if(!gr.ok) return fail(res,`Plugin '${filename}' tidak ditemukan`,404);
    const fd=await gr.json();
    const cr=await fetch(`${ghBase()}/contents/${newPath}`,{method:'PUT',headers:ghHeaders(),signal:AbortSignal.timeout(10000),body:JSON.stringify({message:`${enable?'enable':'disable'}: ${filename}`,content:fd.content.replace(/\n/g,''),branch:ghBranch()})});
    if(!cr.ok){const e=await cr.json();return fail(res,'Gagal rename: '+e.message,502);}
    await fetch(`${ghBase()}/contents/${oldPath}`,{method:'DELETE',headers:ghHeaders(),signal:AbortSignal.timeout(10000),body:JSON.stringify({message:`remove: ${filename}`,sha:fd.sha,branch:ghBranch()})});
    return ok(res,{message:enable?`${newName} diaktifkan`:`${newName} dinonaktifkan`,oldName:filename,newName,action:enable?'enabled':'disabled'});
  }catch(e){return fail(res,'Toggle error: '+e.message,502);}
}

export async function handleDashRestart(req,res) {
  if(req.method!=='POST') return fail(res,'Method not allowed',405);
  if(!isConfigured()) return fail(res,'GitHub belum dikonfigurasi',503);
  const ts=new Date().toISOString();
  const content=Buffer.from(`${ts}\n`).toString('base64');
  try{
    let sha=null;
    const ck=await fetch(`${ghBase()}/contents/.restart?ref=${ghBranch()}`,{headers:ghHeaders(),signal:AbortSignal.timeout(5000)});
    if(ck.ok){const d=await ck.json();sha=d.sha;}
    const body={message:`restart signal ${ts}`,content,branch:ghBranch()};if(sha)body.sha=sha;
    const r=await fetch(`${ghBase()}/contents/.restart`,{method:'PUT',headers:ghHeaders(),signal:AbortSignal.timeout(8000),body:JSON.stringify(body)});
    if(!r.ok){const e=await r.json();return fail(res,'GitHub error: '+e.message,502);}
    return ok(res,{message:'Sinyal restart dikirim. Bot akan restart ~30 detik.',triggeredAt:ts});
  }catch(e){return fail(res,'Restart error: '+e.message,502);}
}
