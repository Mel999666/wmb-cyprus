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

function safeParseValue(v) {
  if (v == null) return null;
  try { return JSON.parse(decodeURIComponent(v)); } catch {}
  try { return JSON.parse(v); } catch {}
  return null;
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
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:livedraft:${judgekey}`;
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ ok: true, found: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const g = await r.json();
    const raw = g?.result ?? g?.value ?? null;
    const obj = safeParseValue(raw);

    if (!obj) {
      return new Response(JSON.stringify({ ok: true, found: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, found: true, draft: obj }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('get-live-draft error', e);
    return bad(e?.stack || e?.message || 'Server error', 500);
  }
}
