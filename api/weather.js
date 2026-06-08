import { checkApiKey, ok, fail } from './_lib.js';
import { Resvg } from '@resvg/resvg-js';

function esc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const WMO_CODES = {
  0:'Cerah',1:'Hampir Cerah',2:'Berawan Sebagian',3:'Berawan',
  45:'Berkabut',48:'Berkabut Beku',51:'Gerimis Ringan',53:'Gerimis',55:'Gerimis Lebat',
  61:'Hujan Ringan',63:'Hujan',65:'Hujan Lebat',
  71:'Salju Ringan',73:'Salju',75:'Salju Lebat',
  80:'Hujan Singkat',81:'Hujan Deras Singkat',82:'Hujan Sangat Deras',
  95:'Badai Petir',96:'Badai + Hujan Es',99:'Badai + Hujan Es Lebat',
};

const WMO_ICON = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️',
};

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'GET') return fail(res, 'Method not allowed', 405);

  const city = req.query.city;
  if (!city) return fail(res, 'city query param is required. Example: ?city=Jakarta');

  try {
    // 1. Geocoding
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) return fail(res, `Kota "${city}" tidak ditemukan`);

    const { latitude, longitude, name: cityName, country } = geoData.results[0];

    // 2. Weather
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const wxData = await wxRes.json();
    const c = wxData.current;

    const temp     = Math.round(c.temperature_2m);
    const feels    = Math.round(c.apparent_temperature);
    const humidity = c.relative_humidity_2m;
    const wind     = Math.round(c.wind_speed_10m);
    const rain     = c.precipitation;
    const code     = c.weather_code;
    const desc     = WMO_CODES[code] || 'Tidak Diketahui';
    const icon     = WMO_ICON[code] || '🌡️';
    const date     = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

    const W = 500, H = 220;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1445"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="4" rx="2" fill="url(#al)"/>

  <!-- Icon besar -->
  <text x="52" y="110" font-size="64" text-anchor="middle">${icon}</text>

  <!-- Suhu -->
  <text x="130" y="90" font-size="52" font-weight="bold" fill="#ededf5">${temp}°</text>
  <text x="132" y="115" font-size="14" fill="#94a3b8">${desc}</text>
  <text x="132" y="135" font-size="12" fill="#6b6b8a">Terasa ${feels}°C</text>

  <!-- Kota -->
  <text x="${W-16}" y="36" font-size="16" font-weight="bold" fill="#ededf5" text-anchor="end">${esc(cityName)}, ${esc(country)}</text>
  <text x="${W-16}" y="55" font-size="11" fill="#6b6b8a" text-anchor="end">${esc(date)}</text>

  <!-- Stats -->
  <rect x="16" y="160" width="${W-32}" height="1" fill="rgba(167,139,250,0.2)"/>
  <text x="60"  y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">KELEMBABAN</text>
  <text x="60"  y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${humidity}%</text>
  <text x="180" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">ANGIN</text>
  <text x="180" y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${wind} km/h</text>
  <text x="300" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">HUJAN</text>
  <text x="300" y="210" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle">${rain} mm</text>
  <text x="420" y="192" font-size="11" fill="#6b6b8a" text-anchor="middle">VEXOR</text>
  <text x="420" y="210" font-size="11" fill="#3d3d5a" text-anchor="middle">weather</text>
</svg>`;

    const resvg = new Resvg(svg);
    const png = Buffer.from(resvg.render().asPng());

    return ok(res, {
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      width: W, height: H,
      data: { city: cityName, country, temp, feels, humidity, wind, rain, desc, icon },
    });
  } catch(e) { return fail(res, 'Weather fetch error: ' + e.message, 500); }
}
