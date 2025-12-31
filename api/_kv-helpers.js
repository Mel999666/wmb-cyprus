// /api/_kv-helpers.js

// Vercel KV / Upstash envs created by the integration:
// - UPSTASH_KV_REST_API_URL
// - UPSTASH_KV_REST_API_TOKEN            (read/write token)
// - UPSTASH_KV_REST_API_READ_ONLY_TOKEN  (read-only token)
//
// In your current setup, the active DB is also exposed as:
// - WMBTEMP_KV_REST_API_URL
// - WMBTEMP_KV_REST_API_TOKEN
// - WMBTEMP_KV_REST_API_READ_ONLY_TOKEN
//
// This helper now looks at BOTH, so you don't have to fight with Vercel envs.

/**
 * Pick the correct Upstash KV URL + token.
 * mode: 'read' or 'write'
 */
export function chooseKvCreds(mode = 'read') {
  // Try the “official” UPSTASH_KV_* names first,
  // then fall back to the WMBTEMP_* ones,
  // and finally to any legacy KV_REST_API_* / UPSTASH_KV_URL envs.
  const url =
    (process.env.UPSTASH_KV_REST_API_URL ||
      process.env.WMBTEMP_KV_REST_API_URL ||
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_KV_URL ||
      '').trim();

  const rwToken =
    (process.env.UPSTASH_KV_REST_API_TOKEN ||
      process.env.WMBTEMP_KV_REST_API_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      '').trim();

  const roToken =
    (process.env.UPSTASH_KV_REST_API_READ_ONLY_TOKEN ||
      process.env.WMBTEMP_KV_REST_API_READ_ONLY_TOKEN ||
      process.env.KV_REST_API_READ_ONLY_TOKEN ||
      '').trim();

  let token = '';

  if (mode === 'write') {
    // For writes, prefer the full access token, otherwise fall back to read-only
    token = rwToken || roToken;
  } else {
    // For reads, prefer the read-only token
    token = roToken || rwToken;
  }

  return { url, token };
}

/**
 * Robust SCAN that tolerates the various Upstash JSON shapes.
 * Returns an array of keys matching the pattern.
 */
export async function scanAll(url, token, matchPattern, count = 200) {
  const keys = [];
  let cursor = '0';
  const match = encodeURIComponent(matchPattern);

  do {
    const r = await fetch(
      `${url}/scan/${cursor}?match=${match}&count=${count}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!r.ok) {
      throw new Error((await r.text()) || `SCAN failed ${r.status}`);
    }

    let data = await r.json();

    // Upstash sometimes nests the result
    if (data && data.result) data = data.result;

    let nextCursor = '0';
    let batch = [];

    if (Array.isArray(data) && data.length >= 2) {
      nextCursor = String(data[0] ?? '0');
      batch = Array.isArray(data[1]) ? data[1] : [];
    } else {
      nextCursor = String(data.cursor ?? data.next_cursor ?? '0');
      batch = data.keys || data.results || data.result || [];
    }

    for (const k of batch) {
      if (typeof k === 'string') keys.push(k);
    }

    cursor = nextCursor;
  } while (cursor !== '0');

  return keys;
}
