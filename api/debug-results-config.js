// api/debug-results-config.js
export const config = { runtime: 'edge' };

// This does NOT reveal secrets. It only tells us if the variables exist.
export default async function handler() {
  const results = (process.env.RESULTS_PASSWORD || '').trim();
  const admin   = (process.env.ADMIN_PASSWORD   || '').trim();

  return new Response(JSON.stringify({
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    // presence + length only (no secret values)
    hasResultsPassword: !!results,
    resultsPasswordLen: results.length,
    hasAdminPassword: !!admin,
    adminPasswordLen: admin.length
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
