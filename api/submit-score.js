// /api/submit-score.js
export const config = { runtime: 'edge' };
import { chooseKvCreds } from './_kv-helpers.js';

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

    // Use the same Upstash creds as get-scores (write pair preferred)
    const { url, token } = chooseKvCreds('write');
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores:${judgekey}`;
    const valueObj = { judge: judgeRaw, judgekey, scores, ts: Date.now() };
    const value = encodeURIComponent(JSON.stringify(valueObj));

    const r = await fetch(
      `${url}/set/${encodeURIComponent(key)}/${value}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // Upstash often returns plain text ("OK"). Don't assume JSON.
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }

    if (!r.ok || (data && data.error)) {
      // Prefer any error coming back from Upstash, otherwise fall back to text.
      return bad(data?.error || text || 'KV write failed', 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return bad('Server error', 500);
  }
}
