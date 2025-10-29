// /api/delete-score.js
export const config = { runtime: 'edge' };

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

// same normalization used when the score was saved
function normalizeJudge(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]+/g, '')
    .replace(/\s+/g, ' ');
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');
    const judgeRaw = String(body?.judge || '').trim();

    const ok = !!(process.env.RESULTS_PASSWORD) && password === process.env.RESULTS_PASSWORD;
    if (!ok) return bad('Unauthorized', 401);

    const judgekey = normalizeJudge(judgeRaw);
    if (!judgekey) return bad('Invalid judge name');

    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores/${judgekey}`; // Upstash KV also accepts slash; keep colon variant too
    const keyColon = `wmb:scores:${judgekey}`;

    // Try colon key first (how submit stored it)
    let r = await fetch(`${url}/del/${encodeURIComponent(keyColon)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      // try slash key variant just in case
      r = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!r.ok) {
      const t = await r.text();
      return bad(t || 'Delete failed', 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return bad('Server error', 500);
  }
}
