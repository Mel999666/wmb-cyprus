// /api/_kv-helpers.js

// Vercel KV / Upstash envs:
// - UPSTASH_KV_REST_API_URL
// - UPSTASH_KV_REST_API_TOKEN            (read/write)
// - UPSTASH_KV_REST_API_READ_ONLY_TOKEN  (read-only)

export function chooseKvCreds(mode = 'read') {
  const url = (process.env.UPSTASH_KV_REST_API_URL || '').trim();

  const rwToken = (process.env.UPSTASH_KV_REST_API_TOKEN || '').trim();
  const roToken = (process.env.UPSTASH_KV_REST_API_READ_ONLY_TOKEN || '').trim();

  // for writes: prefer rw token, else fall back to ro (still works for Upstash)
  // for reads: prefer ro token, else use rw
  let token = '';
  if (mode === 'write') {
    token = rwToken || roToken;
  } else {
    token = roToken || rwToken;
  }

  return { url, token };
}
