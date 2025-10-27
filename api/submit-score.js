// api/submit-score.js
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

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const judge = String(body?.judge || '').trim();
    const password = String(body?.password || '');
    const scores = body?.scores || {};

    if (!okJudgePass(password)) return bad('Unauthorized', 401);
    if (!judge) return bad('Missing judge name');
    if (typeof scores !== 'object') return bad('Invalid scores payload');

    // Normalize judge key (lowercase)
    const judgeKey = judge.toLowerCase();

    // Upstash REST env
    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    // Write per-judge-key
    const key = `wmb:scores:${judgeKey}`;
    const payload = { judge, judgeKey, scores, ts: Date.now() };
    const value = encodeURIComponent(JSON.stringify(payload));

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
