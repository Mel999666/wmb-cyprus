// /api/_kv-helpers.js
export function chooseKvCreds(prefer = "write") {
  // prefer "write" -> use KV_REST_API_URL + KV_REST_API_TOKEN if present
  // else fall back to read-only pair; else legacy names if you had them.
  const writeUrl   = (process.env.KV_REST_API_URL || '').trim();
  const writeToken = (process.env.KV_REST_API_TOKEN || '').trim();

  const roUrl      = (process.env.KV_URL || '').trim();
  const roToken    = (process.env.KV_REST_API_READ_ONLY_TOKEN || '').trim();

  let url = "", token = "", mode = "";
  if (prefer === "write" && writeUrl && writeToken) {
    url = writeUrl; token = writeToken; mode = "write";
  } else if (roUrl && roToken) {
    url = roUrl; token = roToken; mode = "read_only";
  } else if (writeUrl && writeToken) {
    url = writeUrl; token = writeToken; mode = "write";
  }
  return { url, token, mode };
}

// Robust SCAN that tolerates the various Upstash JSON shapes.
export async function scanAll(url, token, matchPattern, count = 200) {
  const keys = [];
  let cursor = "0";
  const match = encodeURIComponent(matchPattern);

  do {
    const r = await fetch(`${url}/scan/${cursor}?match=${match}&count=${count}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(await r.text() || `SCAN failed ${r.status}`);
    const data = await r.json();

    let nextCursor = "0";
    let batch = [];

    if (Array.isArray(data) && data.length >= 2) {
      nextCursor = String(data[0] ?? "0");
      batch = Array.isArray(data[1]) ? data[1] : [];
    } else {
      nextCursor = String(data.cursor ?? data.next_cursor ?? "0");
      batch = data.keys || data.results || data.result || [];
    }

    for (const k of batch) if (typeof k === 'string') keys.push(k);
    cursor = nextCursor;
  } while (cursor !== "0");

  return keys;
}
