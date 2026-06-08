// GitHub API helper
const GH_TOKEN  = process.env.GITHUB_TOKEN || '';
const GH_REPO   = process.env.GITHUB_REPO  || '';   // username/repo
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GH_PATH   = process.env.GITHUB_PLUGINS_PATH || 'plugins';

export function ghHeaders() {
  return {
    'Authorization': `token ${GH_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Vexor-Dashboard',
  };
}

export function ghBase() { return `https://api.github.com/repos/${GH_REPO}`; }
export function ghBranch() { return GH_BRANCH; }
export function ghPluginsPath() { return GH_PATH; }

export function isConfigured() {
  return !!(GH_TOKEN && GH_REPO);
}
