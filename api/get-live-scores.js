// /api/get-live-scores.js
export const config = { runtime: 'edge' };

import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

// Accept both old plain-JSON values and new URI-encoded JSON values
function safeParseValue(v) {
  if (v == null) return null;
  try { return JSON.parse(decodeURIComponent(v)); } catch {}
  try { return JSON.parse(v); } catch {}
  return null;
}

/**
 * Returns true if this submission contains any meaningful scoring.
 * This is a DISPLAY FILTER ONLY. It does not delete anything.
 *
 * We treat a submission as "real" if ANY band has ANY score > 0,
 * OR if there is any non-empty note field.
 */
function hasMeaningfulScores(scores) {
  if (!scores || typeof scores !== 'object') return false;

  for (const bandKey of Object.keys(scores)) {
    const s = scores[bandKey];
    if (!s || typeof s !== 'object') continue;

    const tight = Number(s.tight || 0);
    const song  = Number(s.song || 0);
    const stage = Number(s.stage || 0);
    const crowd = Number(s.crowd || 0);

    if (tight > 0 || song > 0 || stage > 0 || crowd > 0) return true;

    // Keep if judge wrote notes even if scores are 0
    const note = (s.note || '').toString().trim();
    if (note.length > 0) return true;
  }

  return false;
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
    if (!url || !token) return bad('KV not configured', 500);

    const LIVE_PREFIX = 'wmb:live:';
    const keys = await scanAll(url, token, `${LIVE_PREFIX}*`, 200);

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

      const scores = obj.scores || {};

      // SAFETY: hide any "empty / zero" submissions so online scorecards
      // don't pollute the live view. This does NOT delete anything.
      if (!hasMeaningfulScores(scores)) continue;

      entries.push({
        key, // keep for debugging, but UI will delete by judgekey
        judge: obj.judge || '',
        judgekey: obj.judgekey || key.replace(LIVE_PREFIX, ''),
        scores,
        ts: Number(obj.ts) || 0,
      });
    }

    // de-dupe by judgekey, keep newest (just in case)
    const byJudge = new Map();
    for (const e of entries) {
      const prev = byJudge.get(e.judgekey);
      if (!prev || (e.ts || 0) > (prev.ts || 0)) byJudge.set(e.judgekey, e);
    }

    const clean = Array.from(byJudge.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));

    return new Response(JSON.stringify({ ok: true, count: clean.length, entries: clean }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('get-live-scores handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
