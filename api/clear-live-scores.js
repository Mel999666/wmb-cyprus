// /api/clear-live-scores.js
export const config = { runtime: 'edge' };

import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');

    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token } = chooseKvCreds('write');
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    const patterns = [
      'wmb:live:*',
      'wmb:livescore:*',
      'wmb:live_draft:*',
    ];

    const keys = [];
    for (const pat of patterns) {
      const found = await scanAll(url, token, pat, 1000);
      found.forEach(k => keys.push(k));
    }

    let deleted = 0;
    for (const k of keys) {
      const r = await fetch(`${url}/del/${encodeURIComponent(k)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) deleted++;
    }

    return new Response(JSON.stringify({ ok: true, deleted }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('clear-live-scores handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
