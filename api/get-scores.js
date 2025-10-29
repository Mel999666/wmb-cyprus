// /api/get-scores.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

async function scanAllWithPrefix(url, token, prefix) {
  // Robust SCAN loop that handles different Upstash JSON shapes
  const keys = [];
  let cursor = '0';
  const match = encodeURIComponent(`${prefix}*`);
  const count = 200;

  do {
    const res = await fetch(`${url}/scan/${cursor}?match=${match}&count=${count}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`SCAN failed: ${t || res.status}`);
    }
    const data = await res.json();

    // Upstash can return {cursor:"...", keys:[...]} OR {cursor:"...", results:[...]} OR ["cursor", ["k1","k2"]]
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

    // 1) enumerate all judge keys with SCAN
    const keys = await scanAllWithPrefix(url, token, prefix);

    // 2) fetch values
    const entries = [];
    for (const key of keys) {
      const getRes = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) continue;
      const g = await getRes.json();
      if (!g?.result) continue;

      try {
        const obj = JSON.parse(decodeURIComponent(g.result));
        entries.push({
          judge: obj.judge || '',
          judgekey: obj.judgekey || key.replace(prefix, ''),
          scores: obj.scores || {},
          ts: Number(obj.ts) || 0
        });
      } catch {
        // ignore bad payloads
      }
    }

    // 3) build the shape the frontend expects
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
