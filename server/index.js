const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const RoomManager = require('./roomManager');
const setupSyncEngine = require('./syncEngine');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function fetchJsonPost(url, body) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function extractVideosFromPage(html) {
  const videos = [];
  try {
    const match = html.match(/var\s+ytInitialData\s*=\s*({.*?});\s*<\/script>/s);
    if (!match) return videos;
    const data = JSON.parse(match[1]);
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs) return videos;
    for (const tab of tabs) {
      const content = tab?.tabRenderer?.content;
      const items = content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
      if (items) {
        for (const item of items) {
          const v = item.playlistVideoRenderer;
          if (v && v.videoId) {
            const thumb = v.thumbnail?.thumbnails;
            videos.push({
              id: v.videoId,
              title: v.title?.runs?.[0]?.text || 'Unknown',
              thumbnail: thumb && thumb.length > 0 ? thumb[thumb.length - 1].url : '',
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  return videos;
}

const CLIENT_ORIGINS = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001','https://sync-play-gamma.vercel.app'];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: CLIENT_ORIGINS,
  credentials: true,
}));
app.use(express.json());
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

app.use(session({
  secret: process.env.SESSION_SECRET || 'syncplay-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

const roomManager = new RoomManager();

// ─── Google OAuth ───────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function getRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server' });
  }
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${CLIENT_URL}?auth=error`);
  }
  try {
    const tokenRes = await fetchJsonPost('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(req),
      grant_type: 'authorization_code',
    });
    if (tokenRes.error) {
      console.error('Token exchange failed:', tokenRes);
      return res.redirect(`${CLIENT_URL}?auth=error`);
    }
    const userInfo = await fetchJson(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenRes.access_token}`);
    req.session.user = {
      id: userInfo.body.id,
      email: userInfo.body.email,
      name: userInfo.body.name,
      picture: userInfo.body.picture,
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token,
      tokenExpiry: Date.now() + (tokenRes.expires_in || 3600) * 1000,
    };
    res.redirect(`${CLIENT_URL}?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.redirect(`${CLIENT_URL}?auth=error`);
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ authenticated: false });
  }
  const { accessToken, refreshToken, tokenExpiry, ...safe } = req.session.user;
  res.json({ authenticated: true, user: safe });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ─── YouTube Library (authenticated) ──────────────────────────────────────────

async function ensureAccessToken(req) {
  const user = req.session.user;
  if (!user) return null;
  if (user.tokenExpiry && Date.now() < user.tokenExpiry - 60000) {
    return user.accessToken;
  }
  if (!user.refreshToken) return null;
  try {
    const tokenRes = await fetchJsonPost('https://oauth2.googleapis.com/token', {
      refresh_token: user.refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    });
    if (tokenRes.access_token) {
      user.accessToken = tokenRes.access_token;
      user.tokenExpiry = Date.now() + (tokenRes.expires_in || 3600) * 1000;
      return user.accessToken;
    }
  } catch (err) {
    console.error('Token refresh failed:', err.message);
  }
  return null;
}

app.get('/api/youtube/playlists', requireAuth, async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    if (!token) return res.status(401).json({ error: 'YouTube access expired, please re-login' });
    const maxResults = Math.min(parseInt(req.query.maxResults) || 25, 50);
    const { status, body } = await fetchJson(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=${maxResults}&access_token=${token}`
    );
    if (status >= 400) {
      return res.status(status).json({ error: body.error?.message || 'Failed to fetch playlists' });
    }
    const playlists = (body.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      videoCount: item.contentDetails?.itemCount || 0,
    }));
    res.json({ playlists, nextPageToken: body.nextPageToken || null });
  } catch (err) {
    console.error('YouTube playlists error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.get('/api/youtube/playlists/:playlistId/videos', requireAuth, async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    if (!token) return res.status(401).json({ error: 'YouTube access expired, please re-login' });
    const { playlistId } = req.params;
    const maxResults = Math.min(parseInt(req.query.maxResults) || 25, 50);
    const pageToken = req.query.pageToken || '';
    const { status, body } = await fetchJson(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ''}&access_token=${token}`
    );
    if (status >= 400) {
      return res.status(status).json({ error: body.error?.message || 'Failed to fetch playlist videos' });
    }
    const videos = (body.items || []).map((item) => ({
      id: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    })).filter((v) => v.id);
    res.json({ videos, nextPageToken: body.nextPageToken || null });
  } catch (err) {
    console.error('YouTube playlist videos error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlist videos' });
  }
});

app.get('/api/youtube/liked', requireAuth, async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    if (!token) return res.status(401).json({ error: 'YouTube access expired, please re-login' });
    const maxResults = Math.min(parseInt(req.query.maxResults) || 25, 50);
    const pageToken = req.query.pageToken || '';
    const { status, body } = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ''}&access_token=${token}`
    );
    if (status >= 400) {
      return res.status(status).json({ error: body.error?.message || 'Failed to fetch liked videos' });
    }
    const videos = (body.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    }));
    res.json({ videos, nextPageToken: body.nextPageToken || null });
  } catch (err) {
    console.error('YouTube liked videos error:', err.message);
    res.status(500).json({ error: 'Failed to fetch liked videos' });
  }
});

// ─── Existing routes ──────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getPublicRooms().length });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getPublicRooms());
});

app.get('/api/rooms/:id/exists', (req, res) => {
  res.json({ exists: !!roomManager.getRoom(req.params.id) });
});

app.get('/api/playlist/:playlistId', async (req, res) => {
  const { playlistId } = req.params;
  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const html = await fetchPage(url);
    const videos = extractVideosFromPage(html);
    if (videos.length === 0) {
      return res.json({ videos: [], message: 'No videos found or playlist is private' });
    }
    res.json({ videos });
  } catch (err) {
    console.error('Playlist fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

app.get('/api/rooms/:id/search', async (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  const apiKey = room.apiKey || process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'No YouTube API key is set for this room. Use the Link tab to paste URLs instead.' });

  if (!roomManager.canSearch(room.id)) {
    return res.status(429).json({ error: 'This room has hit the search rate limit. Try again in a bit.' });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=8&key=${apiKey}`;
    const { status, body } = await fetchJson(url);
    if (status >= 400) {
      return res.status(status).json({ error: body.error?.message || 'Search failed' });
    }
    res.json({ items: body.items || [] });
  } catch (err) {
    console.error('Search proxy error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/video/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const html = await fetchPage(url);
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown';
    const thumbMatch = html.match(/"thumbnail":\s*\{"thumbnails":\s*\[(\{[^}]+\})/);
    let thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    if (thumbMatch) {
      try {
        const thumbData = JSON.parse(`[${thumbMatch[1]}]`);
        if (thumbData[0]?.url) thumbnail = thumbData[0].url;
      } catch {}
    }
    res.json({ id: videoId, title, thumbnail });
  } catch (err) {
    console.error('Video fetch error:', err.message);
    res.json({ id: videoId, title: 'Unknown Video', thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` });
  }
});

setupSyncEngine(io, roomManager);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SyncPlay server running on port ${PORT}`);
});
