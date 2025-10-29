// /api/kv-scan.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

function pickKvCreds() {
  // Try the "write" token first, then read-only, then legacy names.
  const url =
    (process.env.KV_REST_API_URL || '').trim() ||
    (process.env.KV_URL || '').trim();
  const token =
    (process.env.KV_REST_API_TOKEN || '').trim() ||
    (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();

  return { url, token };
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');
    const prefix = String(body?.prefix || '');
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token } = pickKvCreds();
    if (!url || !token) return bad('KV not configured', 500);

    const scanUrl = `${url}/scan/0?match=${encodeURIComponent(prefix ? `${prefix}*` : '*')}&count=200`;
    const res = await fetch(scanUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return bad(await res.text() || 'SCAN failed', 500);

    const data = await res.json();
    // Normalize response shapes
    let keys = [];
    if (Array.isArray(data) && data.length >= 2) {
      keys = Array.isArray(data[1]) ? data[1] : [];
    } else {
      keys = data.keys || data.results || data.result || [];
    }

    return new Response(JSON.stringify({ ok: true, keys }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
