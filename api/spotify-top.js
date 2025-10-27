export default async function handler(req, res) {
  try {
    const { url, market = "CY" } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });

    const token = await getSpotifyToken();
    const { type, id } = parseSpotifyUrl(url);

    if (!type || !id) {
      return res.status(200).json({
        embedUrl: null,
        popularity: 0,          // artist popularity (always)
        trackName: null,
        artistName: null
      });
    }

    // We will always compute ARTIST popularity, regardless of link type.
    // But for the embed we keep the previous behavior:
    // - artist link -> embed their most popular track in the given market
    // - track link  -> embed that exact track
    let artistId = null;
    let embedUrl = null;
    let trackName = null;

    if (type === "artist") {
      artistId = id;
      // Pick top track for embed
      const top = await fetchJSON(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
        token
      );
      const best = (top?.tracks || []).sort((a,b) => b.popularity - a.popularity)[0];
      if (best) {
        embedUrl = `https://open.spotify.com/embed/track/${best.id}`;
        trackName = best.name || null;
      }
    } else if (type === "track") {
      // Get the track, derive artist from it, embed this exact track
      const track = await fetchJSON(
        `https://api.spotify.com/v1/tracks/${id}`,
        token
      );
      embedUrl = `https://open.spotify.com/embed/track/${id}`;
      trackName = track?.name ?? null;
      artistId = Array.isArray(track?.artists) && track.artists[0]?.id ? track.artists[0].id : null;
    }

    // If we still don't have an artist id, return empty
    if (!artistId) {
      return res.status(200).json({
        embedUrl,
        popularity: 0,
        trackName,
        artistName: null
      });
    }

    // Fetch ARTIST popularity (0-100) — this is the number we will always return
    const artist = await fetchJSON(
      `https://api.spotify.com/v1/artists/${artistId}`,
      token
    );

    return res.status(200).json({
      embedUrl,
      popularity: Number.isFinite(artist?.popularity) ? artist.popularity : 0,
      trackName,
      artistName: artist?.name ?? null
    });

  } catch (e) {
    return res.status(200).json({
      embedUrl: null,
      popularity: 0,
      trackName: null,
      artistName: null
    });
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
    const u = new URL(raw.replace("?si","/ignore?si")); // tolerate ?si param
    const parts = u.pathname.split("/").filter(Boolean);
    return { type: parts[0], id: parts[1] };
  } catch {
    return { type: null, id: null };
  }
}
