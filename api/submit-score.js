// /api/submit-score.js
export const config = { runtime: 'edge' };

import { chooseKvCreds } from './_kv-helpers.js';

// Judge password check
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

    const { url, token } = chooseKvCreds('write');
    if (!url || !token) {
      return bad(
        `KV not configured. url="${url}", tokenPresent=${!!token}`,
        500
      );
    }

    const key = `wmb:scores:${judgekey}`;
    const valueObj = { judge: judgeRaw, judgekey, scores, ts: Date.now() };
    const json = JSON.stringify(valueObj);
    const encodedValue = encodeURIComponent(json);

    const fullUrl = `${url}/set/${encodeURIComponent(key)}/${encodedValue}`;

    let upstashRes;
    let text;

    try {
      upstashRes = await fetch(fullUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      text = await upstashRes.text();
    } catch (err) {
      console.error('submit-score Upstash fetch error', err);
      return bad(
        `KV request failed for URL "${fullUrl}": ${err.message || String(err)}`,
        500
      );
    }

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body – keep raw text in error if needed
    }

    if (!upstashRes.ok || (data && data.error)) {
      return bad(
        `KV write failed (status ${upstashRes.status}): ${text || '[no body]'}`,
        500
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('submit-score handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
