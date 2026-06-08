// POST /api/dash/upload → upload / replace plugin ke GitHub
import { checkApiKey, ok, fail } from '../_lib.js';
import { ghHeaders, ghBase, ghBranch, ghPluginsPath, isConfigured } from './_gh.js';

export const config = { api: { bodyParser: { sizeLimit: '500kb' } } };

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!isConfigured()) return fail(res, 'GitHub belum dikonfigurasi', 503);

  const { filename, content, message } = req.body || {};
  if (!filename) return fail(res, 'filename is required');
  if (!content)  return fail(res, 'content is required (base64 encoded JS)');
  if (!filename.endsWith('.js')) return fail(res, 'Hanya file .js yang diizinkan');
  if (filename.includes('/') || filename.includes('..')) return fail(res, 'Nama file tidak valid');

  const pluginPath = `${ghPluginsPath()}/${filename}`;
  const commitMsg  = message || `feat: upload plugin ${filename} via Vexor Dashboard`;

  try {
    // Cek apakah file sudah ada (untuk update, butuh sha)
    let existingSha = null;
    const checkRes = await fetch(`${ghBase()}/contents/${pluginPath}?ref=${ghBranch()}`, {
      headers: ghHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      existingSha = existing.sha;
    }

    // Push ke GitHub
    const body = {
      message: commitMsg,
      content, // base64
      branch: ghBranch(),
    };
    if (existingSha) body.sha = existingSha;

    const pushRes = await fetch(`${ghBase()}/contents/${pluginPath}`, {
      method: 'PUT',
      headers: ghHeaders(),
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify(body),
    });

    if (!pushRes.ok) {
      const err = await pushRes.json();
      return fail(res, `GitHub push error: ${err.message || pushRes.status}`, 502);
    }

    const pushData = await pushRes.json();
    return ok(res, {
      message: existingSha ? 'Plugin diupdate' : 'Plugin baru ditambahkan',
      filename,
      path: pluginPath,
      sha: pushData.content?.sha,
      commit: pushData.commit?.sha,
      action: existingSha ? 'updated' : 'created',
    });
  } catch (e) {
    return fail(res, 'Upload error: ' + e.message, 502);
  }
}
