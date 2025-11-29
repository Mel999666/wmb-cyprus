// /api/get-scores.js
export const config = { runtime: 'edge' };

// Same KV helper as kv-scan and submit-score
function pickKvCreds() {
  const url =
    (process.env.KV_REST_API_URL || '').trim() ||
    (process.env.KV_URL || '').trim();
  const token =
    (process.env.KV_REST_API_TOKEN || '').trim() ||
    (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();

  return { url, token };
}

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
    if (!process.env.RESULTS_PASSWORD || password !== process.env.RESULTS_PASSWORD) {
      return bad('Unauthorized', 401);
    }

    const { url, token } = pickKvCreds();
    if (!url || !token) return bad('KV not configured', 500);

    const prefix = 'wmb:scores:';
    const scanUrl = `${url}/scan/0?match=${encodeURIComponent(prefix + '*')}&count=500`;
    const scanRes = await fetch(scanUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!scanRes.ok) {
      const text = await scanRes.text();
      return bad(`KV scan failed: ${text || scanRes.statusText}`, 500);
    }

    const scanData = await scanRes.json();
    let keys = [];

    if (Array.isArray(scanData) && scanData.length >= 2) {
      keys = Array.isArray(scanData[1]) ? scanData[1] : [];
    } else {
      keys = scanData.keys || scanData.results || scanData.result || [];
    }

    if (!Array.isArray(keys)) keys = [];

    const judges = {};
    const entries = [];

    // Fetch each key one by one (small N, keeps it simple)
    for (const key of keys) {
      const getUrl = `${url}/get/${encodeURIComponent(key)}`;
      const r = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) continue;

      let text;
      try {
        text = await r.text();
      } catch {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { result: text };
      }

      let raw = parsed?.result ?? parsed?.value ?? null;
      if (typeof raw !== 'string') continue;

      let obj;
      try {
        obj = JSON.parse(decodeURIComponent(raw));
      } catch {
        continue;
      }

      if (!obj || typeof obj !== 'object') continue;

      const { judge, judgekey, scores, ts } = obj;
      if (!judgekey) continue;

      judges[judgekey] = { judge, judgekey, scores, ts };
      entries.push({ judge, judgekey, scores, ts });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        count: entries.length,
        judges,
        entries,
        scannedPrefix: prefix,
        scannedCount: keys.length,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}
