// /api/delete-live-score.js
export const config = { runtime: 'edge' };

import { chooseKvCreds } from './_kv-helpers.js';

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
    const judgekey = String(body?.judgekey || '').trim();

    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }
    if (!judgekey) return bad('Missing judge key');

    const { url, token } = chooseKvCreds('write');
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    // Only delete live keys. Never touch online keys.
    const keysToDelete = [
      `wmb:live:${judgekey}`,      // current
      `wmb:livescore:${judgekey}`, // legacy
      `wmb:live_draft:${judgekey}` // optional draft cleanup
    ];

    for (const key of keysToDelete) {
      await fetch(`${url}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-live-score handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
