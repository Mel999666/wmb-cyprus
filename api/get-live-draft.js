// /api/get-live-draft.js
export const config = { runtime: 'edge' };

import { chooseKvCreds } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' },
  });
}

function safeParseValue(v) {
  if (v == null) return null;
  try { return JSON.parse(decodeURIComponent(v)); } catch {}
  try { return JSON.parse(v); } catch {}
  return null;
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
    if (!judgeRaw) return bad('Missing judge name');

    const judgekey = normalizeJudge(judgeRaw);
    if (!judgekey) return bad('Invalid judge name');

    const { url, token } = chooseKvCreds('read');
    if (!url || !token) {
      return bad(`KV not configured. url="${url}", tokenPresent=${!!token}`, 500);
    }

    const key = `wmb:livedraft:${judgekey}`;
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) return bad('KV read failed', 500);

    const g = await r.json();
    const raw = g?.result ?? g?.value ?? null;
    const obj = safeParseValue(raw);

    if (!obj) {
      return new Response(JSON.stringify({ ok: true, found: false, judge: judgeRaw, judgekey }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      found: true,
      judge: obj.judge || judgeRaw,
      judgekey: obj.judgekey || judgekey,
      scores: obj.scores || {},
      ts: Number(obj.ts) || 0
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  } catch (e) {
    console.error('get-live-draft handler error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
