// GET /api/dash/plugins → list semua plugin dari GitHub repo
import { checkApiKey, ok, fail } from '../_lib.js';
import { ghHeaders, ghBase, ghBranch, ghPluginsPath, isConfigured } from './_gh.js';

export default async function handler(req, res) {
  if (!checkApiKey(req, res)) return;
  if (req.method !== 'GET') return fail(res, 'Method not allowed', 405);

  if (!isConfigured()) return fail(res, 'GITHUB_TOKEN dan GITHUB_REPO belum dikonfigurasi di env Vercel', 503);

  try {
    const path = ghPluginsPath();
    const r = await fetch(`${ghBase()}/contents/${path}?ref=${ghBranch()}`, {
      headers: ghHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (r.status === 404) return fail(res, `Folder '${path}' tidak ditemukan di repo`, 404);
    if (!r.ok) return fail(res, `GitHub API error: ${r.status}`, 502);

    const files = await r.json();
    const plugins = files
      .filter(f => f.type === 'file' && f.name.endsWith('.js'))
      .map(f => ({
        name: f.name,
        path: f.path,
        sha: f.sha,
        size: f.size,
        downloadUrl: f.download_url,
        htmlUrl: f.html_url,
        // Disabled kalau nama diawali _ (konvensi)
        enabled: !f.name.startsWith('_'),
      }));

    return ok(res, { plugins, total: plugins.length, branch: ghBranch(), path });
  } catch (e) {
    return fail(res, 'GitHub fetch error: ' + e.message, 502);
  }
}
