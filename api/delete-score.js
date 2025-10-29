export const config = { runtime: 'edge' };

function bad(msg, code = 400){
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req){
  try{
    if (req.method !== 'POST') return bad('Use POST', 405);

    const body = await req.json();
    const password = String(body?.password || '');
    const judgekey = String(body?.judgekey || '');

    const ok = !!(process.env.RESULTS_PASSWORD) && password === process.env.RESULTS_PASSWORD;
    if (!ok) return bad('Unauthorized', 401);
    if (!judgekey) return bad('Missing judgekey');

    const url = (process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) return bad('KV not configured', 500);

    const key = `wmb:scores:${judgekey}`;
    const r = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method:'POST',
      headers:{ Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!r.ok || data?.error) return bad(data?.error || 'KV delete failed', 500);

    return new Response(JSON.stringify({ ok:true }), { status:200, headers:{'content-type':'application/json'} });
  }catch{
    return bad('Server error', 500);
  }
}
