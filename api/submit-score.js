// api/submit-score.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // uses UPSTASH_REDIS_REST_URL + TOKEN

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readJSON(req);
    const { password, judge, scores } = body || {};

    if (!password || password !== process.env.JUDGE_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!judge || typeof judge !== "string" || !scores || typeof scores !== "object") {
      return res.status(400).json({ error: "Missing judge or scores" });
    }

    const name = judge.trim();

    // Store one JSON blob per judge and keep an index of judges
    await redis.set(`scores:${name}`, JSON.stringify(scores));
    await redis.sadd("judges", name);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function readJSON(req) {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}
