export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const body = await req.json();
    const password = (body && body.password) || '';
    const ok = !!process.env.JUDGE_PASSWORD && password === process.env.JUDGE_PASSWORD;
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 401,
      headers: { 'content-type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
}
