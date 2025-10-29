// /api/kv-get.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);
    const { password, key } = await req.json() || {};
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }
    if (!key) return bad('Missing key');

    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    // Your submit endpoint URL-encodes JSON, so decode here if present
    let payload = null;
    if (data?.result) {
      try { payload = JSON.parse(decodeURIComponent(data.result)); }
      catch { payload = data.result; }
    }
    return new Response(JSON.stringify({ ok: true, key, raw: data, payload }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
