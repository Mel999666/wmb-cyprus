// /api/save-live-draft.js
export const config = { runtime: 'edge' };

import { chooseKvCreds } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

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
    const scores = body?.scores || {};

    if (!judgeRaw) return bad('Missing judge name');
    if (typeof scores !== 'object' || !scores) return bad('Invalid scores payload');

    const judgekey = normalizeJudge(judgeRaw);
    if (!judgekey) return bad('Invalid judge name');

    const { url, token } = chooseKvCreds('write');
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    const key = `wmb:live_draft:${judgekey}`;
    const valueObj = {
      judge: judgeRaw,
      judgekey,
      scores,
      ts: Date.now(),
      draft: true,
    };

    const json = JSON.stringify(valueObj);
    const encodedValue = encodeURIComponent(json);
    const setUrl = `${url}/set/${encodeURIComponent(key)}/${encodedValue}`;

    const upstashRes = await fetch(setUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await upstashRes.text();

    let data;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!upstashRes.ok || (data && data.error)) {
      return bad(`KV write failed (status ${upstashRes.status}): ${text || '[no body]'}`, 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('save-live-draft handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
