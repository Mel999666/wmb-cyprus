export default async function handler(req, res) {
  try {
    const { igUserId } = req.query;
    if (!igUserId) return res.status(400).json({ error: "igUserId required" });

    const token = process.env.IG_ACCESS_TOKEN; // must be for a managed Business/Creator account
    const api = `https://graph.facebook.com/v19.0/${igUserId}?fields=followers_count,biography&access_token=${token}`;
    const j = await (await fetch(api)).json();
    const followers = Number(j?.followers_count || 0);
    const biography = j?.biography || null;
    return res.status(200).json({ followers, biography });
  } catch (e) {
    return res.status(200).json({ followers: 0, biography: null });
  }
}
