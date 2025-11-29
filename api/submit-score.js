// /api/submit-score.js
export const config = { runtime: 'edge' };

// Use the same KV creds logic as kv-scan (this is known-working)
function pickKvCreds() {
  const url =
    (process.env.KV_REST_API_URL || '').trim() ||
    (process.env.KV_URL || '').trim();
  const token =
    (process.env.KV_REST_API_TOKEN || '').trim() ||
    (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();

  return { url, token };
}

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

// Normalize judge name -> stable key
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

    const { url, token } = pickKvCreds();
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores:${judgekey}`;
    const valueObj = { judge: judgeRaw, judgekey, scores, ts: Date.now() };
    const value = encodeURIComponent(JSON.stringify(valueObj));

    const kvUrl = `${url}/set/${encodeURIComponent(key)}/${value}`;
    const r = await fetch(kvUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!r.ok || data?.error) {
      return bad(data?.error || `KV write failed: ${text || 'unknown error'}`, 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
