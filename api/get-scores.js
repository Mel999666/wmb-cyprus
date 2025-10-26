export const config = { runtime: 'edge' };

function okResultsPass(pw) {
  const results = (process.env.RESULTS_PASSWORD || '').trim();
  const admin   = (process.env.ADMIN_PASSWORD   || '').trim(); // fallback if RESULTS_PASSWORD not set
  if (!pw) return false;
  if (results) return pw === results;
  if (admin)   return pw === admin;
  return false;
}

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);
    const body = await req.json();
    if (!okResultsPass(String(body?.password || ''))) return bad('Unauthorized', 401);

    const url   = (process.env.KV_REST_API_URL   || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const keysRes = await fetch(`${url}/keys/${encodeURIComponent('wmb:scores:*')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const keysJson = await keysRes.json();
    const keys = Array.isArray(keysJson.result) ? keysJson.result : [];

    const out = {};
    for (const k of keys) {
      const g = await fetch(`${url}/get/${encodeURIComponent(k)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const gj = await g.json();
      if (gj?.result) {
        try {
          const val = JSON.parse(gj.result);
          if (val?.judge && val?.scores) out[val.judge] = val;
        } catch {}
      }
    }

    return new Response(JSON.stringify({ judges: out }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return bad('Server error', 500);
  }
}
