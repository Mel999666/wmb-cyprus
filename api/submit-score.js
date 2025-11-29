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

    // Upstash credentials (write mode)
    const { url, token } = chooseKvCreds('write');
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores:${judgekey}`;
    const valueObj = { judge: judgeRaw, judgekey, scores, ts: Date.now() };
    const valueJson = JSON.stringify(valueObj);

    // Use POST with JSON body instead of putting value in the URL
    const upstashUrl = `${url}/set/${encodeURIComponent(key)}`;

    let r;
    try {
      r = await fetch(upstashUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ value: valueJson }),
      });
    } catch (err) {
      return bad(
        'KV request failed: ' + (err && err.message ? err.message : 'network error'),
        500
      );
    }

    const text = await r.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Upstash may return plain text or HTML on error; ignore JSON parse failure
    }

    if (!r.ok || (data && data.error)) {
      const msg =
        (data && data.error) ||
        `KV write failed (status ${r.status}): ${text.slice(0, 200)}`;
      return bad(msg, 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return bad(e && e.message ? e.message : 'Server error', 500);
  }
}
