// POST /api/dash/toggle → enable/disable plugin (rename _nama.js ↔ nama.js)
import { checkApiKey, ok, fail } from '../_lib.js';
import { ghHeaders, ghBase, ghBranch, ghPluginsPath, isConfigured } from './_gh.js';

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);
  if (!isConfigured()) return fail(res, 'GitHub belum dikonfigurasi', 503);

  const { filename, enable } = req.body || {};
  if (!filename) return fail(res, 'filename is required');

  // Konvensi: plugin disabled = diawali dengan _
  const isDisabled = filename.startsWith('_');
  const action     = enable ? 'enable' : 'disable';

  // Kalau sudah sesuai state, skip
  if (enable && !isDisabled)  return ok(res, { message: 'Plugin sudah enabled', filename });
  if (!enable && isDisabled)  return ok(res, { message: 'Plugin sudah disabled', filename });

  const newName    = enable ? filename.replace(/^_/, '') : `_${filename}`;
  const oldPath    = `${ghPluginsPath()}/${filename}`;
  const newPath    = `${ghPluginsPath()}/${newName}`;

  try {
    // 1. Ambil konten file lama
    const getRes = await fetch(`${ghBase()}/contents/${oldPath}?ref=${ghBranch()}`, {
      headers: ghHeaders(), signal: AbortSignal.timeout(6000),
    });
    if (!getRes.ok) return fail(res, `Plugin '${filename}' tidak ditemukan`, 404);
    const fileData = await getRes.json();

    // 2. Buat file baru dengan nama baru
    const createRes = await fetch(`${ghBase()}/contents/${newPath}`, {
      method: 'PUT',
      headers: ghHeaders(),
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        message: `${action}: ${filename} → ${newName} via Vexor Dashboard`,
        content: fileData.content.replace(/\n/g, ''),
        branch: ghBranch(),
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      return fail(res, `Gagal buat file baru: ${err.message}`, 502);
    }

    // 3. Hapus file lama
    await fetch(`${ghBase()}/contents/${oldPath}`, {
      method: 'DELETE',
      headers: ghHeaders(),
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        message: `remove old: ${filename} via Vexor Dashboard`,
        sha: fileData.sha,
        branch: ghBranch(),
      }),
    });

    return ok(res, {
      message: enable ? `Plugin ${newName} diaktifkan` : `Plugin ${newName} dinonaktifkan`,
      oldName: filename,
      newName,
      action,
    });
  } catch (e) {
    return fail(res, 'Toggle error: ' + e.message, 502);
  }
}
