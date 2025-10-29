// /api/kv-scan.js
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
    const { password, prefix = 'wmb:scores:' } = await req.json() || {};
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }
    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const out = [];
    let cursor = '0';
    const match = encodeURIComponent(`${prefix}*`);
    const count = 200;

    do {
      const res = await fetch(`${url}/scan/${cursor}?match=${match}&count=${count}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      let next = '0';
      let keys = [];
      if (Array.isArray(data) && data.length >= 2) {
        next = String(data[0] ?? '0');
        keys = Array.isArray(data[1]) ? data[1] : [];
      } else {
        next = String(data.cursor ?? data.next_cursor ?? '0');
        keys = data.keys || data.results || data.result || [];
      }
      out.push(...keys);
      cursor = next;
    } while (cursor !== '0');

    return new Response(JSON.stringify({ ok: true, keys: out }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
