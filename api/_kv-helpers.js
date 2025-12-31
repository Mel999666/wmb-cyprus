// /api/_kv-helpers.js

// Vercel KV / Upstash envs created by the integration:
// - UPSTASH_KV_REST_API_URL
// - UPSTASH_KV_REST_API_TOKEN            (read/write token)
// - UPSTASH_KV_REST_API_READ_ONLY_TOKEN  (read-only token)

/**
 * Pick the correct Upstash KV URL + token.
 * mode: 'read' or 'write'
 */
export function chooseKvCreds(mode = 'read') {
  // NOTE: for the new DB we are using the WMBTEMP_* vars which Vercel created
  // when you reconnected "wmb-kv-active" to the project.
  //
  // If you ever want to switch back to the plain UPSTASH_* names, just
  // change these lines, but right now this is correct.
  const url =
    (process.env.WMBTEMP_KV_REST_API_URL || '').trim() ||
    (process.env.UPSTASH_KV_REST_API_URL || '').trim();

  const rwToken =
    (process.env.WMBTEMP_KV_REST_API_TOKEN || '').trim() ||
    (process.env.UPSTASH_KV_REST_API_TOKEN || '').trim();

  const roToken =
    (process.env.WMBTEMP_KV_REST_API_READ_ONLY_TOKEN || '').trim() ||
    (process.env.UPSTASH_KV_REST_API_READ_ONLY_TOKEN || '').trim();

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
 * Returns an array of keys.
 *
 * IMPORTANT: to avoid the "internal error" from Upstash, we **only**
 * call GET <url>/scan/<cursor> now – no extra query parameters.
 */
export async function scanAll(url, token, matchPattern, count = 200) {
  const keys = [];
  let cursor = '0';

  do {
    const r = await fetch(`${url}/scan/${cursor}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      throw new Error((await r.text()) || `SCAN failed ${r.status}`);
    }

    let data = await r.json();

    // Upstash sometimes nests the result
    if (data && data.result) data = data.result;

    let nextCursor = '0';
    let batch = [];

    if (Array.isArray(data) && data.length >= 2) {
      // Shape: [cursor, [keys...]]
      nextCursor = String(data[0] ?? '0');
      batch = Array.isArray(data[1]) ? data[1] : [];
    } else {
      // Shape: { cursor, keys } or similar
      nextCursor = String(data.cursor ?? data.next_cursor ?? '0');
      batch = data.keys || data.results || data.result || [];
    }

    for (const k of batch) {
      if (typeof k === 'string') {
        keys.push(k);
      }
    }

    cursor = nextCursor;
  } while (cursor !== '0');

  return keys;
}
