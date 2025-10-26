export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });

    const id = extractYouTubeId(url);
    if (!id) return res.status(200).json({ videoId: null, views: 0 });

    const key = process.env.YOUTUBE_API_KEY;
    const api = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${key}`;
    const r = await fetch(api);
    const j = await r.json();
    const views = Number(j?.items?.[0]?.statistics?.viewCount || 0);
    return res.status(200).json({ videoId: id, views });
  } catch (e) {
    return res.status(200).json({ videoId: null, views: 0 });
  }
}

function extractYouTubeId(raw) {
  try {
    const u = new URL(raw.replace("music.youtube.com","www.youtube.com"));
    const v = u.searchParams.get("v");
    if (v) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("shorts");
    if (i !== -1 && parts[i+1]) return parts[i+1];
  } catch {}
  return null;
}
