export const config = { runtime: 'edge' };

function okJudgePass(pw) {
  const judge = (process.env.JUDGE_PASSWORD || '').trim();
  return !!pw && !!judge && pw === judge;
}

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

// Normalize: lowercase, trim, collapse spaces, strip non-letters/numbers/spaces
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
    const judgeRaw = String(body?.judge || '').trim();
    const password = String(body?.password || '');
    const scores = body?.scores || {};

    if (!okJudgePass(password)) return bad('Unauthorized', 401);
    if (!judgeRaw) return bad('Missing judge name');
    if (typeof scores !== 'object') return bad('Invalid scores payload');

    const judgekey = normalizeJudge(judgeRaw);
    if (!judgekey) return bad('Invalid judge name');

    // Upstash REST
    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores:${judgekey}`;
    const valueObj = { judge: judgeRaw, judgekey, scores, ts: Date.now() };
    const value = encodeURIComponent(JSON.stringify(valueObj));

    const r = await fetch(`${url}/set/${encodeURIComponent(key)}/${value}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok || data?.error) return bad(data?.error || 'KV write failed', 500);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  } catch {
    return bad('Server error', 500);
  }
}
