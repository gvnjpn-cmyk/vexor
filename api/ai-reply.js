import { checkApiKey, ok, fail } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  const { prompt, system, model, number } = req.body || {};
  if (!prompt) return fail(res, 'prompt is required');

  const aiModel = model || 'claude-haiku-4-5';
  const systemPrompt = system || 'You are a helpful WhatsApp bot assistant. Reply concisely.';

  try {
    // Uses Anthropic API - set ANTHROPIC_API_KEY in Vercel env vars
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.json();
      return fail(res, err?.error?.message || 'AI request failed', 502);
    }

    const data = await aiRes.json();
    const reply = data.content?.[0]?.text || '';

    return ok(res, {
      reply,
      model: aiModel,
      sendTo: number ? `${number.replace(/\D/g, '')}@s.whatsapp.net` : null,
      tokens: data.usage || {},
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return fail(res, 'Failed to reach AI service: ' + e.message, 502);
  }
}
