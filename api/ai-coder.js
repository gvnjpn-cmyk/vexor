import { checkApiKey, ok, fail } from './_lib.js';

const MODELS = [
  'zai-org/GLM-5',
  'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'
];
const BASE_URL = 'https://llamacoder.together.ai/api';
const TIMEOUT_MS = 90_000;

function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(tid));
}

async function parseStream(streamRes) {
  let fullOutput = '';
  let buffer = '';

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const j = JSON.parse(trimmed);
        const content = j?.choices?.[0]?.delta?.content;
        if (content) fullOutput += content;
      } catch {}
    }
  }

  if (buffer.trim()) {
    try {
      const j = JSON.parse(buffer.trim());
      const content = j?.choices?.[0]?.delta?.content;
      if (content) fullOutput += content;
    } catch {}
  }

  return fullOutput;
}

function extractFiles(output) {
  const files = [];
  const regex = /```(?:tsx?|jsx?|css|scss|json|html?|md|env|toml|yaml|yml)\{path=([^}]+)\}\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    const filePath = match[1].replace(/^\//, '');
    const content = match[2];
    if (filePath && content) files.push({ path: filePath, content });
  }
  return files;
}

async function buildZipBase64(files) {
  // Build ZIP in-memory using pure JS (no exec/fs needed on Vercel)
  // Uses fflate via dynamic import
  const { zipSync, strToU8 } = await import('fflate');

  const zipFiles = {};
  for (const f of files) {
    zipFiles[f.path] = strToU8(f.content);
  }

  const zipped = zipSync(zipFiles, { level: 6 });
  return Buffer.from(zipped).toString('base64');
}

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) return fail(res, 'prompt is required');

  // 1. Create chat session
  let chatId = null, lastMessageId = null, usedModel = null;

  for (const model of MODELS) {
    try {
      const r = await fetchWithTimeout(`${BASE_URL}/create-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), model, quality: 'low' })
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.chatId) {
        chatId = data.chatId;
        lastMessageId = data.lastMessageId;
        usedModel = model;
        break;
      }
    } catch { continue; }
  }

  if (!chatId) return fail(res, 'Gagal membuat session LlamaCoder. Coba lagi nanti.', 502);

  // 2. Stream output
  let streamRes;
  try {
    streamRes = await fetchWithTimeout(`${BASE_URL}/get-next-completion-stream-promise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: lastMessageId, model: usedModel })
    });
  } catch (e) {
    return fail(res, 'Gagal stream output: ' + e.message, 502);
  }

  if (!streamRes.ok) return fail(res, 'Stream error: ' + streamRes.status, 502);

  let fullOutput;
  try {
    fullOutput = await parseStream(streamRes);
  } catch (e) {
    return fail(res, 'Error baca stream: ' + e.message, 502);
  }

  if (!fullOutput) return fail(res, 'Model tidak menghasilkan output. Coba prompt lebih spesifik.', 502);

  // 3. Extract files
  const files = extractFiles(fullOutput);
  if (files.length === 0) return fail(res, 'Tidak ada file yang dihasilkan. Coba prompt lebih spesifik.');

  // 4. Build ZIP
  let zipBase64;
  try {
    zipBase64 = await buildZipBase64(files);
  } catch (e) {
    return fail(res, 'Gagal buat ZIP: ' + e.message, 500);
  }

  const modelName = usedModel?.split('/').pop() ?? 'unknown';

  return ok(res, {
    zipBase64,
    mimeType: 'application/zip',
    fileName: `aicoder-${prompt.trim().replace(/\s+/g,'-').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,30)}.zip`,
    files: files.map(f => f.path),
    totalFiles: files.length,
    model: modelName,
    prompt: prompt.slice(0, 100),
  });
}
