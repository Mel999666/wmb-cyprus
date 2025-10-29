// /api/kv-scan.js
export const config = { runtime: 'edge' };

// Uses the READ-ONLY pair (KV_URL + KV_REST_API_READ_ONLY_TOKEN)
export default async function handler(req) {
  try {
    const body = await req.json();
    const password = String(body?.password || '');
    const prefix = String(body?.prefix || 'wmb:scores:');

    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const url = (process.env.KV_URL || '').trim();
    const token = (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();
    if (!url || !token) {
      return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });
    }

    let cursor = '0';
    const match = encodeURIComponent(`${prefix}*`);
    const found = [];
    do {
      const res = await fetch(`${url}/scan/${cursor}?match=${match}&count=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      let next = '0', arr = [];
      if (Array.isArray(data)) { next = String(data[0] ?? '0'); arr = data[1] || []; }
      else { next = String(data.cursor ?? data.next_cursor ?? '0'); arr = data.keys || data
