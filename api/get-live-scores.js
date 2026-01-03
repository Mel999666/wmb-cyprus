// /api/get-live-scores.js
export const config = { runtime: 'edge' };

import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

// Accept both plain JSON and URI-encoded JSON
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
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    // We ONLY consider these as "live scoring" storage.
    // Keep legacy prefix here only to allow old data to be seen + deduped,
    // but we will still treat them as live and dedupe by judgekey.
    const LIVE_PREFIXES = [
      'wmb:live:',      // current
      'wmb:livescore:'  // legacy from earlier versions
    ];

    const keys = [];
    for (const prefix of LIVE_PREFIXES) {
      const found = await scanAll(url, token, `${prefix}*`, 500);
      for (const k of found) keys.push(k);
    }

    // Read all candidate entries
    const rawEntries = [];
    for (const key of keys) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) continue;

      const g = await r.json();
      const raw = g?.result ?? g?.value ?? null;
      const obj = safeParseValue(raw);
      if (!obj) continue;

      const judgekey = String(obj.judgekey || '').trim() || key.split(':').slice(2).join(':');
      rawEntries.push({
        key,
        judge: String(obj.judge || ''),
        judgekey,
        scores: obj.scores || {},
        ts: Number(obj.ts) || 0,
      });
    }

    // DEDUPE by judgekey (keep newest submission only)
    const byJudgeKey = new Map();
    for (const e of rawEntries) {
      const jk = e.judgekey || '';
      if (!jk) continue;

      const prev = byJudgeKey.get(jk);
      if (!prev || (e.ts || 0) > (prev.ts || 0)) {
        byJudgeKey.set(jk, e);
      }
    }

    const entries = Array.from(byJudgeKey.values())
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // judges object keyed by judgekey for scoreboard calculations
    const judges = {};
    for (const e of entries) {
      const id = e.judgekey;
      judges[id] = { judge: e.judge || id, when: e.ts, scores: e.scores };
    }

    const payload = { ok: true, count: entries.length, judges, entries };

    if (debug) {
      payload.debug = {
        prefixes: LIVE_PREFIXES,
        scannedKeyCount: keys.length,
        returnedEntryCount: entries.length,
        scannedKeys: keys,
      };
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
