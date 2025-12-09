// /api/delete-score.js
export const config = { runtime: 'edge' };

import { chooseKvCreds } from './_kv-helpers.js';

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
    const judgekey = String(body?.judgekey || '');

    // Same admin password check as results / kv tools
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }
    if (!judgekey) return bad('Missing judgekey');

    // Use the SAME KV creds as submit-score / get-scores
    const { url, token } = chooseKvCreds('write');
    if (!url || !token) {
      return bad(
        `KV not configured. url="${url}", tokenPresent=${!!token}`,
        500
      );
    }

    const key = `wmb:scores:${judgekey}`;
    const fullUrl = `${url}/del/${encodeURIComponent(key)}`;

    let r;
    let text;

    try {
      r = await fetch(fullUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      text = await r.text();
    } catch (err) {
      console.error('delete-score Upstash fetch error', err);
      return bad(
        `KV request failed for URL "${fullUrl}": ${err.message || String(err)}`,
        500
      );
    }

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON body is fine; we just keep raw text in case of error
    }

    if (!r.ok || (data && data.error)) {
      console.error('delete-score Upstash error', {
        status: r.status,
        body: text,
      });
      return bad(
        `KV delete failed (status ${r.status}): ${text || '[no body]'}`,
        500
      );
    }

    // Success
    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-score handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
