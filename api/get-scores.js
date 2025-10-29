// /api/get-scores.js
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

    const body = await req.json();
    const password = String(body?.password || '');
    const ok = !!(process.env.RESULTS_PASSWORD) && password === process.env.RESULTS_PASSWORD;
    if (!ok) return bad('Unauthorized', 401);

    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:scores:';
    // List keys
    const listRes = await fetch(`${url}/list/${encodeURIComponent(prefix)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!listRes.ok) {
      const t = await listRes.text();
      return bad(`KV list failed: ${t || listRes.status}`, 500);
    }
    const listData = await listRes.json();
    const keys = Array.isArray(listData?.result) ? listData.result : [];

    // Fetch each value
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
        // expect { judge, judgekey, scores, ts }
        entries.push({
          judge: obj.judge || '',
          judgekey: obj.judgekey || key.replace(prefix,''),
          scores: obj.scores || {},
          ts: Number(obj.ts) || 0
        });
      } catch {}
    }

    // Build judges object the frontend already expects
    const judges = {};
    for (const e of entries) {
      judges[e.judge || e.judgekey] = {
        judge: e.judge || e.judgekey,
        when: e.ts || 0,
        scores: e.scores || {}
      };
    }

    return new Response(JSON.stringify({ ok:true, count: entries.length, entries, judges }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return bad('Server error', 500);
  }
}
