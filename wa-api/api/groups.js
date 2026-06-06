import { checkApiKey, ok, fail } from './_lib.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return fail(res, 'Method not allowed', 405);
  if (!checkApiKey(req, res)) return;

  // Hook point: replace with real sock.groupFetchAllParticipating()
  const mockGroups = [
    { id: '120363000000000001@g.us', name: 'Family Group', participants: 12, isAdmin: true },
    { id: '120363000000000002@g.us', name: 'Work Team', participants: 30, isAdmin: false },
    { id: '120363000000000003@g.us', name: 'Bot Testing', participants: 5, isAdmin: true },
  ];

  return ok(res, {
    total: mockGroups.length,
    groups: mockGroups,
    note: 'Connect your Baileys session to return real groups',
  });
}
