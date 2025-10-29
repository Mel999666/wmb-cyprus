// /api/get-scores.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

function pickKvCreds() {
  const primaryUrl = (process.env.KV_REST_API_URL || '').trim();
  const primaryTok = (process.env.KV_REST_API_TOKEN || '').trim();

  const roTok = (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();
  const legacyUrl = (process.env.KV_URL || '').trim();

  // Prefer full-access token + primary URL; else read-only + primary URL; else token + legacy URL
  const url = primaryUrl || legacyUrl;
  const token = primaryTok || roTok;

  return { url, token };
}

async function scanAllWithPrefix(url, token, prefix) {
  const keys = [];
  let cursor = '0';
  const match = encodeURIComponent(`${prefix}*`);
  const count = 200;

  do {
    const res = await fetch(`${url}/scan/${cursor}?match=${match}&count=${count}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || `SCAN ${res.status}`);
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

    for (const k of batch) if (typeof k === 'string' && k.startsWith(prefix)) keys.push(k);
    cursor = nextCursor;
  } while (cursor !== '0');

  return keys;
}

function parseStoredValue(raw) {
  // Accept either JSON string OR encodeURIComponent(JSON)
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(decodeURIComponent(raw)); } catch {}
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

    // Try the new prefix first, but we’ll also try a couple of legacy options if nothing is found.
    const prefixesToTry = ['wmb:scores:', 'scores:', 'wmb:judges:', 'judges:'];
    let foundKeys = [];
    let usedPrefix = '';

    for (const p of prefixesToTry) {
      const keys = await scanAllWithPrefix(url, token, p);
      if (keys.length) { foundKeys = keys; usedPrefix = p; break; }
    }

    const entries = [];
    for (const key of foundKeys) {
      const getRes = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) continue;
      const g = await getRes.json();
      const raw = g?.result;
      if (!raw) continue;

      const obj = parseStoredValue(raw);
      if (!obj) continue;

      entries.push({
        judge: obj.judge || '',
        judgekey: obj.judgekey || key.replace(usedPrefix, ''),
        scores: obj.scores || {},
        ts: Number(obj.ts) || 0
      });
    }

    const judges = {};
    for (const e of entries) {
      judges[e.judge || e.judgekey] = {
        judge: e.judge || e.judgekey,
        when: e.ts || 0,
        scores: e.scores || {}
      };
    }

    return new Response(JSON.stringify({
      ok: true,
      count: entries.length,
      judges,
      entries,
      ...(debug ? { scannedPrefix: usedPrefix, scannedKeys: foundKeys } : {})
    }), { status: 200, headers: { 'content-type': 'application/json' }});
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
