export const config = { runtime: 'edge' };
import { chooseKvCreds, scanAll } from './_kv-helpers.js';

function bad(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code, headers: { 'content-type':'application/json' }
  });
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return bad('Use POST', 405);
    const body = await req.json();
    const password = String(body?.password || '');
    const prefix   = String(body?.prefix || 'wmb:scores:');
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token, mode } = chooseKvCreds('write'); // use same pair as submit/get
    if (!url || !token) return bad('KV not configured', 500);

    const keys = await scanAll(url, token, `${prefix}*`);
    return new Response(JSON.stringify({ ok:true, mode, urlHost:new URL(url).host, keys }), {
      status:200, headers:{'content-type':'application/json'}
    });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
