// /api/get-scores.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Upstash KV listing: /keys/{cursor}?prefix=...&limit=...
 * Returns shapes like:
 *   { result: { keys: ["k1","k2"], cursor: "next" } }
 * or sometimes { keys:[...], cursor:"..." }
 * We iterate until cursor === "0" or empty.
 */
async function listKeysKV(url, token, prefix, limit = 200) {
  const keys = [];
  let cursor = '0';

  while (true) {
    const u = `${url}/keys/${encodeURIComponent(cursor)}?prefix=${encodeURIComponent(prefix)}&limit=${limit}`;
    const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`KV keys failed: ${t || res.status}`);
    }
    const data = await res.json();

    // Normalize possible shapes
    const payload = data?.result || data;
    const batch = Array.isArray(payload?.keys) ? payload.keys : [];
    const next = String(payload?.cursor ?? '0');

    for (const k of batch) if (typeof k === 'string') keys.push(k);
    if (next === '0' || batch.length === 0) break;
    cursor = next;
  }
  return keys;
}

/**
 * Fallback for Upstash Redis (if you ever swap products): /scan/{cursor}?match=...&count=...
 * We only call this if KV listing throws.
 */
async function listKeysRedis(url, token, prefix, count = 200) {
  const keys = [];
  let cursor = '0';
  const match = encodeURIComponent(`${prefix}*`);

  do {
    const res = await fetch(`${url}/scan/${cursor}?match=${match}&count=${count}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Redis SCAN failed: ${t || res.status}`);
    }
    const data = await res.json();

    let nextCursor = '0';
    let batch = [];

    if (Array.isArray(data) && data.length >= 2) {
      nextCursor = String(data[0] ?? '0');
      batch = Array.isArray(data[1]) ? data[1] : [];
    } else {
      nextCursor = String(data.cursor ?? data.next_cursor ?? '0');
      batch = data.keys || data.results || data.result || [];
    }

    for (const k of batch) {
      if (typeof k === 'string' && k.startsWith(prefix)) keys.push(k);
    }
    cursor = nextCursor;
  } while (cursor !== '0');

  return keys;
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');
    const ok = !!(process.env.RESULTS_PASSWORD) && password === process.env.RESULTS_PASSWORD;
    if (!ok) return bad('Unauthorized', 401);

    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:scores:';

    // Prefer KV listing; if not available, fall back to Redis SCAN.
    let keys = [];
    try {
      keys = await listKeysKV(url, token, prefix);
    } catch {
      keys = await listKeysRedis(url, token, prefix);
    }

    // Fetch values
    const entries = [];
    for (const key of keys) {
      const getRes = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) continue;
      const g = await getRes.json();
      const raw = g?.result;
      if (!raw) continue;
      try {
        const obj = JSON.parse(decodeURIComponent(raw));
        entries.push({
          judge: obj.judge || '',
          judgekey: obj.judgekey || key.replace(prefix, ''),
          scores: obj.scores || {},
          ts: Number(obj.ts) || 0
        });
      } catch {
        // ignore malformed entries
      }
    }

    // Shape expected by frontend
    const judges = {};
    for (const e of entries) {
      judges[e.judge || e.judgekey] = {
        judge: e.judge || e.judgekey,
        when: e.ts || 0,
        scores: e.scores || {}
      };
    }

    return new Response(JSON.stringify({ ok: true, count: entries.length, entries, judges }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
