// POST /api/dash/restart → kirim sinyal restart ke bot via flag file di GitHub
import { checkApiKey, ok, fail } from '../_lib.js';
import { ghHeaders, ghBase, ghBranch, isConfigured } from './_gh.js';

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!isConfigured()) return fail(res, 'GitHub belum dikonfigurasi', 503);

  // Tulis timestamp ke .restart file di repo
  // Bot polling file ini tiap 30 detik, kalau berubah → restart
  const flagPath = '.restart';
  const timestamp = new Date().toISOString();
  const content = Buffer.from(`${timestamp}\n`).toString('base64');

  try {
    // Cek sha existing
    let sha = null;
    const chk = await fetch(`${ghBase()}/contents/${flagPath}?ref=${ghBranch()}`, {
      headers: ghHeaders(), signal: AbortSignal.timeout(5000),
    });
    if (chk.ok) { const d = await chk.json(); sha = d.sha; }

    const body = {
      message: `chore: restart signal ${timestamp}`,
      content,
      branch: ghBranch(),
    };
    if (sha) body.sha = sha;

    const r = await fetch(`${ghBase()}/contents/${flagPath}`, {
      method: 'PUT',
      headers: ghHeaders(),
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.json();
      return fail(res, `GitHub error: ${err.message}`, 502);
    }

    return ok(res, {
      message: 'Sinyal restart dikirim. Bot akan restart dalam ~30 detik.',
      triggeredAt: timestamp,
    });
  } catch (e) {
    return fail(res, 'Restart error: ' + e.message, 502);
  }
}
