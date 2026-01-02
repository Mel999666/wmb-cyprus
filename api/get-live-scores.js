export const config = { runtime: 'edge' };

import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

function safeParseValue(v) {
  if (v == null) return null;
  try { return JSON.parse(decodeURIComponent(v)); } catch {}
  try { return JSON.parse(v); } catch {}
  return null;
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');
    const debug = !!body?.debug;

    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token } = chooseKvCreds('read');
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:livesub:';
    const matchPattern = `${prefix}*`;

    const keys = await scanAll(url, token, matchPattern, 200);

    const entries = [];
    for (const key of keys) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) continue;

      const g = await r.json();
      const raw = g?.result ?? g?.value ?? null;
      const obj = safeParseValue(raw);
      if (!obj) continue;

      entries.push({
        judge: obj.judge || '',
        judgekey: obj.judgekey || key.replace(prefix, ''),
        scores: obj.scores || {},
        ts: Number(obj.ts) || 0,
      });
    }

    const judges = {};
    for (const e of entries) {
      const id = e.judge || e.judgekey;
      judges[id] = { judge: id, when: e.ts, scores: e.scores };
    }

    const payload = { ok: true, count: entries.length, judges, entries };

    if (debug) {
      payload.debug = { scannedPrefix: matchPattern, scannedCount: keys.length, scannedKeys: keys };
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('get-live-scores handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
