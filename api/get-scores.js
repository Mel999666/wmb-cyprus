// api/get-scores.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  try {
    const { password } = req.query || {};
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const judges = await redis.smembers("judges"); // array of judge names
    const data = [];
    for (const j of judges) {
      const raw = await redis.get(`scores:${j}`);
      if (!raw) continue;
      data.push({ judge: j, scores: JSON.parse(raw) });
    }
    return res.status(200).json({ ok: true, judges, data });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}
