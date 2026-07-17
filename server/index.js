const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getPublicRooms().length });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getPublicRooms());
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
