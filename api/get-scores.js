// /api/get-scores.js
export const config = { runtime: 'edge' };
import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code, headers: { 'content-type':'application/json' }
  });
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);
    const body = await req.json();
    const password = String(body?.password || '');
    const dbg = !!body?.debug;

    // Gate with RESULTS_PASSWORD
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    // Use the *same* creds as submit-score (write pair)
    const { url, token, mode } = chooseKvCreds('write');
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:scores:';
    const keys = await scanAll(url, token, `${prefix}*`);

    // Fetch each payload
    const entries = [];
    for (const key of keys) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) continue;
      const g = await r.json();
      if (!g?.result) continue;
      try {
        const obj = JSON.parse(decodeURIComponent(g.result));
        entries.push({
          judge: obj.judge || '',
          judgekey: obj.judgekey || key.replace(prefix,''),
          scores: obj.scores || {},
          ts: Number(obj.ts) || 0
        });
      } catch { /* ignore */ }
    }

    // Shape for frontend
    const judges = {};
    for (const e of entries) {
      judges[e.judge || e.judgekey] = {
        judge: e.judge || e.judgekey,
        when: e.ts || 0,
        scores: e.scores || {}
      };
    }

    return new Response(JSON.stringify({
      ok:true,
      count: entries.length,
      judges,
      entries,
      ...(dbg ? { scannedPrefix: `${prefix}*`, scannedCount: keys.length, mode, urlHost:new URL(url).host } : {})
    }), { status:200, headers:{'content-type':'application/json'} });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}

