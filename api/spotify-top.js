export default async function handler(req, res) {
  try {
    const { url, market = "CY" } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });

    const token = await getSpotifyToken();
    const { type, id } = parseSpotifyUrl(url);

    if (!type || !id) return res.status(200).json({ embedUrl: null, popularity: 0, trackName: null });

    if (type === "track") {
      const track = await fetchJSON(`https://api.spotify.com/v1/tracks/${id}`, token);
      return res.status(200).json({
        embedUrl: `https://open.spotify.com/embed/track/${id}`,
        popularity: track?.popularity ?? 0,
        trackName: track?.name ?? null
      });
    }

    if (type === "artist") {
      const top = await fetchJSON(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=${market}`, token);
      const best = (top?.tracks || []).sort((a,b) => b.popularity - a.popularity)[0];
      if (!best) return res.status(200).json({ embedUrl: null, popularity: 0, trackName: null });
      return res.status(200).json({
        embedUrl: `https://open.spotify.com/embed/track/${best.id}`,
        popularity: best.popularity,
        trackName: best.name
      });
    }

    return res.status(200).json({ embedUrl: null, popularity: 0, trackName: null });
  } catch (e) {
    return res.status(200).json({ embedUrl: null, popularity: 0, trackName: null });
  }
}

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const j = await r.json();
  return j.access_token;
}

async function fetchJSON(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
  return r.json();
}

function parseSpotifyUrl(raw) {
  try {
    const u = new URL(raw.replace("?si","/ignore?si"));
    const parts = u.pathname.split("/").filter(Boolean);
    return { type: parts[0], id: parts[1] };
  } catch {
    return { type: null, id: null };
  }
}
