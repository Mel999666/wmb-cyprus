// /api/get-scores.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

function pickKvCreds() {
  const url =
    (process.env.KV_REST_API_URL || '').trim() ||
    (process.env.KV_URL || '').trim();
  const token =
    (process.env.KV_REST_API_TOKEN || '').trim() ||
    (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();
  return { url, token };
}

// Upstash SCAN that tolerates all the JSON shapes they've used
async function scanAllWithPrefix(url, token, prefix) {
  const out = [];
  let cursor = '0';
  const match = `${prefix}*`;
  const count = 200;

  do {
    const res = await fetch(
      `${url}/scan/${cursor}?match=${encodeURIComponent(match)}&count=${count}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`SCAN failed: ${await res.text() || res.status}`);

    // Accept any shape: {cursor, keys} OR {cursor, results} OR ["cursor", ["k1"]] OR {result:{cursor,keys}}
    let data = await res.json();
    if (data && data.result) data = data.result;

    let next = '0';
    let batch = [];

    if (Array.isArray(data) && data.length >= 2) {
      next = String(data[0] ?? '0');
      batch = Array.isArray(data[1]) ? data[1] : [];
    } else {
      next = String(data.cursor ?? data.next_cursor ?? '0');
      batch = data.keys || data.results || data.result || [];
    }

    for (const k of batch) if (typeof k === 'string' && k.startsWith(prefix)) out.push(k);
    cursor = next;
  } while (cursor !== '0');

  return out;
}

// Accept both old plain-JSON values and new URI-encoded JSON values
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

    const { url, token } = pickKvCreds();
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:scores:';
    const keys = await scanAllWithPrefix(url, token, prefix);

    const entries = [];
    for (const key of keys) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) continue;

      const g = await r.json();
      // Upstash sometimes returns {result: "..."} or {value:"..."}
      const raw = g?.result ?? g?.value ?? null;
      const obj = safeParseValue(raw);
      if (!obj) continue;

      entries.push({
        judge: obj.judge || '',
        judgekey: obj.judgekey || key.replace(prefix, ''),
        scores: obj.scores || {},
        ts: Number(obj.ts) || 0
      });
    }

    const judges = {};
    for (const e of entries) {
      const id = e.judge || e.judgekey;
      judges[id] = { judge: id, when: e.ts, scores: e.scores };
    }

    const payload = { ok: true, count: entries.length, judges, entries };
    if (debug) {
      payload.mode = url.includes('upstash.io') ? 'write' : 'unknown';
      payload.scannedPrefix = `${prefix}*`;
      payload.scannedCount = keys.length;
      payload.urlHost = (() => { try { return new URL(url).host; } catch { return url; } })();
      payload.scannedKeys = keys;
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
