export default async function handler(req, res) {
  try {
    const { pageId } = req.query;
    if (!pageId) return res.status(400).json({ error: "pageId required" });

    const token = process.env.FB_PAGE_ACCESS_TOKEN; // token for a Page you manage
    const api = `https://graph.facebook.com/v19.0/${pageId}?fields=followers_count,about,bio&access_token=${token}`;
    const j = await (await fetch(api)).json();
    const followers = Number(j?.followers_count || 0);
    const about = [j?.bio, j?.about].filter(Boolean).sort((a,b)=> b.length - a.length)[0] || null;
    return res.status(200).json({ followers, about });
  } catch (e) {
    return res.status(200).json({ followers: 0, about: null });
  }
}
