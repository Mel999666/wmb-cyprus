// /api/get-live-scores.js
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

function isAllowedLiveKey(key) {
  return /^wmb:(live|livescore|live_draft):/.test(String(key || ''));
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');

    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token } = chooseKvCreds('read');
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    // Scan possible LIVE prefixes only (including some older variants)
    const patterns = [
      'wmb:live:*',
      'wmb:livescore:*',
      'wmb:live_draft:*',
      'wmb:live-score:*',
      'wmb:live_scores:*',
      'wmb:liveScore:*',
    ];

    const keys = [];
    for (const pat of patterns) {
      const found = await scanAll(url, token, pat, 1000);
      found.forEach(k => keys.push(k));
    }

    // Load, filter strictly to allowed live keys, then dedupe by judgekey
    const byJudgeKey = new Map();

    for (const key of keys) {
      if (!isAllowedLiveKey(key)) continue;

      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) continue;

      const g = await r.json();
      const raw = g?.result ?? g?.value ?? null;
      const obj = safeParseValue(raw);
      if (!obj) continue;

      const judge = String(obj.judge || '').trim();
      const judgekey =
        String(obj.judgekey || '').trim() ||
        key.replace(/^wmb:(?:live|livescore|live_draft):/, '');

      const ts = Number(obj.ts) || 0;
      const scores = obj.scores || {};

      const existing = byJudgeKey.get(judgekey);
      if (!existing || ts >= existing.ts) {
        byJudgeKey.set(judgekey, {
          key, // exact KV key for delete
          judge,
          judgekey,
          scores,
          ts,
        });
      }
    }

    const entries = Array.from(byJudgeKey.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));

    return new Response(JSON.stringify({ ok: true, count: entries.length, entries }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('get-live-scores handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
