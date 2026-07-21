# SyncPlay - Knowledge Transfer Document

## 1. Project Overview

SyncPlay is a real-time synchronized music/video listening app. Users create rooms, share a room ID, and everyone in the room hears/sees the same YouTube video at the same time. Includes chat, queue management, and YouTube Library integration via Google OAuth.

**Live URLs:**
- Client: `https://sync-play-gamma.vercel.app`
- Server: `https://syncplay-pez5.onrender.com`

---

## 2. Architecture

```
┌─────────────────────────────────┐     Socket.IO (WebSocket)     ┌──────────────────────────┐
│          CLIENT (Vercel)        │ ◄────────────────────────────► │     SERVER (Render)      │
│                                 │                                │                          │
│  Next.js 16 + React 19         │     REST API (fetch)           │  Express + Socket.IO     │
│  Tailwind CSS v4               │ ◄────────────────────────────► │  express-session         │
│  YouTube IFrame API            │                                │  In-memory room state    │
│  Socket.IO Client              │                                │  YouTube Data API proxy  │
└─────────────────────────────────┘                                └──────────────────────────┘
                                                                            │
                                                                     Google OAuth 2.0
                                                                     YouTube Data API v3
```

**State management:**
- Server: All room state lives in memory (`RoomManager.rooms` Map). No database. Rooms auto-delete 30s after the last user leaves.
- Client: React state + localStorage for username, API key, room history, current room.

---

## 3. File Structure

```
syncplay/
├── server/
│   ├── index.js              # Express server, HTTP routes, OAuth, YouTube proxy
│   ├── syncEngine.js         # Socket.IO event handlers (join/leave/play/pause/seek/skip/queue/chat)
│   ├── roomManager.js        # In-memory room CRUD, playback state, queue, rate limiting
│   └── package.json          # Dependencies: express, socket.io, cors, uuid, express-session
│
└── client/
    ├── app/
    │   ├── page.tsx           # Home page: profile, create/join room, YouTube Library, room list
    │   ├── layout.tsx         # Root layout with Geist fonts
    │   ├── globals.css        # Dark theme CSS variables, Tailwind v4
    │   └── room/[id]/page.tsx # Room page: player, queue, search, library, chat, user list
    │
    ├── components/
    │   ├── YouTubePlayer.tsx  # YouTube IFrame API wrapper with sync logic
    │   ├── YouTubeLibrary.tsx # Google login, playlists, liked videos, add-to-queue
    │   ├── SearchBar.tsx      # YouTube keyword search + paste URL link input
    │   ├── Queue.tsx          # Drag-to-reorder song queue
    │   ├── Chat.tsx           # Real-time chat with auto-scroll
    │   ├── UserList.tsx       # Users in room with host badge
    │   ├── CreateRoom.tsx     # Room creation form
    │   ├── JoinRoom.tsx       # Room join form (ID + password)
    │   ├── RoomList.tsx       # Live public room list (polls every 5s)
    │   └── RoomHistory.tsx    # Recently joined rooms from localStorage
    │
    └── lib/
        ├── auth.ts            # Google OAuth helpers, YouTube Library API calls
        ├── socket.ts          # Socket.IO client singleton (connect/disconnect)
        ├── storage.ts         # localStorage helpers (username, API key, rooms)
        └── youtube.ts         # YouTube URL/video/playlist parsing
```

---

## 4. Key Concepts

### 4.1 Sync Mechanism

The server is the single source of truth for playback state (`currentVideo`, `currentTime`, `isPlaying`).

**Flow:**
1. User A clicks play/pause/seeks -> client emits `play`/`pause`/`seek` socket event
2. Server updates `roomManager.setPlayback()` and broadcasts to other clients
3. Other clients receive event -> set `syncTime` + `shouldSync = true`
4. `YouTubePlayer` sync effect compares local time vs `syncTime`. If drift > 2 seconds, seeks. Always re-applies play/pause state.
5. `ignoreEvents` ref prevents the programmatic state change from echoing back to the server (500ms cooldown).

**Key design decision:** When a user joins or leaves, the server does NOT broadcast `room-state` to existing clients. This prevents playback from resetting. The joining client gets full state via the join callback. Existing users only receive `user-joined`/`user-left` (user list update only).

### 4.2 Room Lifecycle

1. **Create:** Creator becomes host. Room stored in `RoomManager.rooms` Map with 8-char UUID.
2. **Join:** Password check, max 50 users. New user gets full room state in callback.
3. **Leave:** User removed. If host leaves, host transfers to next user. If room empties, 30s timer starts; if still empty, room is deleted.
4. **Reconnection:** On socket reconnect, client calls `doJoin()` again with stored credentials.

### 4.3 Skip Deduplication

Every client fires `video-ended` independently when the YouTube player reaches the end. The server guards against this:
```js
if (videoId !== undefined && room.currentVideo?.id !== videoId) return;
```
Only the first skip for the current video is honored.

### 4.4 YouTube Search Rate Limiting

15 searches per 30-second window per room. Tracked via `_searchLog` array on the room object.

---

## 5. Socket.IO Events

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ name, isPublic, password, apiKey, username }` | Create a new room |
| `join-room` | `{ roomId, password, username }` | Join existing room |
| `leave-room` | (none) | Leave current room |
| `play` | `{ roomId, videoId, title, thumbnail, time }` | Start/resume playback |
| `pause` | `{ roomId, time }` | Pause playback |
| `seek` | `{ roomId, time }` | Seek to position |
| `skip` | `{ roomId, videoId }` | Skip to next in queue |
| `add-to-queue` | `{ roomId, video }` | Add video to queue |
| `remove-from-queue` | `{ roomId, queueId }` | Remove from queue |
| `reorder-queue` | `{ roomId, fromIndex, toIndex }` | Reorder queue |
| `chat-message` | `{ roomId, user, text }` | Send chat message |
| `get-public-rooms` | (callback) | Get list of public rooms |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-state` | Full room object | Full state sync (on create only) |
| `user-joined` | `{ user, users }` | New user joined (user list update) |
| `user-left` | `{ user, users }` | User left (user list update) |
| `play` | `{ videoId, title, thumbnail, time, queue? }` | Playback started |
| `pause` | `{ time }` | Playback paused |
| `seek` | `{ time }` | Playback seeked |
| `video-ended` | (none) | Video ended, no next in queue |
| `queue-updated` | `QueueItem[]` | Queue changed |
| `chat-message` | `{ user, text, timestamp }` | New chat message |

---

## 6. HTTP API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Server health check |
| GET | `/api/rooms` | No | List public rooms |
| GET | `/api/rooms/:id/exists` | No | Check if room exists |
| GET | `/api/rooms/:id/search?q=...` | No | YouTube search proxy (uses room API key or `YOUTUBE_API_KEY` env) |
| GET | `/api/playlist/:playlistId` | No | Scrape YouTube playlist page for videos |
| GET | `/api/video/:videoId` | No | Scrape YouTube page for title/thumbnail |
| GET | `/api/auth/google` | No | Redirect to Google OAuth consent screen |
| GET | `/api/auth/google/callback` | No | OAuth callback, exchange code, store session |
| GET | `/api/auth/me` | Session | Get current authenticated user |
| POST | `/api/auth/logout` | Session | Destroy session |
| GET | `/api/youtube/playlists` | Session | Get user's YouTube playlists |
| GET | `/api/youtube/playlists/:id/videos` | Session | Get videos in a playlist |
| GET | `/api/youtube/liked` | Session | Get user's liked videos |

---

## 7. Environment Variables

### Server (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3001`) |
| `CLIENT_ORIGIN` | No | Comma-separated allowed origins for CORS (default: localhost + Vercel) |
| `CLIENT_URL` | Yes | Client URL for OAuth redirect (e.g. `https://sync-play-gamma.vercel.app`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL (e.g. `https://syncplay-pez5.onrender.com/api/auth/google/callback`) |
| `SESSION_SECRET` | Yes | Random string for session signing |
| `YOUTUBE_API_KEY` | No | Fallback YouTube Data API v3 key for rooms without their own key |
| `NODE_ENV` | No | Set to `production` for secure cookies |

### Client (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Server URL (e.g. `https://syncplay-pez5.onrender.com`) |

---

## 8. Deployment Checklist

### Google Cloud Console Setup
1. Create project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **YouTube Data API v3**
3. Create OAuth 2.0 Client ID (type: Web Application)
4. Add Authorized redirect URI: `https://syncplay-pez5.onrender.com/api/auth/google/callback`
5. Create API key for YouTube search (optional if using `YOUTUBE_API_KEY` env)

### Render (Server)
1. Connect GitHub repo, set root directory to `server`
2. Build command: `npm install`
3. Start command: `npm start`
4. Add all server environment variables

### Vercel (Client)
1. Connect GitHub repo, framework preset: Next.js, root directory: `client`
2. Add `NEXT_PUBLIC_SOCKET_URL` environment variable

---

## 9. Known Issues & Fixes Applied

### Song resets when user joins
**Root cause:** Server was broadcasting `room-state` to all clients when someone joined, which triggered `setShouldSync(true)` on every client, causing them to seek to the server's stale `currentTime`.

**Fix:** Removed `room-state` broadcast from join handler. New user gets state via join callback. Existing users only get `user-joined` (user list update).

### YouTube search 403
**Root cause:** Room created without YouTube API key. Server returned 400.

**Fix:** Added fallback `YOUTUBE_API_KEY` env var. Now: `room.apiKey || process.env.YOUTUBE_API_KEY`.

### OAuth redirect_uri_mismatch
**Root cause:** Server dynamically built redirect URI from `req.protocol`/`req.get('host')`, which could be wrong behind Render's proxy.

**Fix:** Added `GOOGLE_REDIRECT_URI` env var and `app.set('trust proxy', 1)`.

### Session cookie not sent cross-origin
**Root cause:** `sameSite: 'lax'` prevented the session cookie from being sent on cross-origin requests (Vercel -> Render).

**Fix:** In production: `sameSite: 'none'`, `secure: true`. Also added `trust proxy` so Express correctly detects HTTPS behind Render's proxy.

### OAuth success but UI doesn't update
**Root cause:** `router.replace` does soft navigation; `YouTubeLibrary` component stays mounted and never re-checks auth.

**Fix:** Changed to `window.location.replace("/")` for a full page reload, so `YouTubeLibrary` mounts fresh and calls `/api/auth/me`.

---

## 10. Key Implementation Details

### YouTubePlayer Sync Effect (`YouTubePlayer.tsx:100-118`)
```js
useEffect(() => {
  // Only runs when syncTime, shouldSync, ready, or isPlaying changes
  // Compares local player time vs server syncTime
  // Seeks if drift > 2 seconds
  // Always re-applies play/pause state
  // Sets ignoreEvents for 500ms to prevent echo loops
}, [syncTime, shouldSync, ready, isPlaying]);
```

### Token Refresh (`server/index.js:224-247`)
The `ensureAccessToken` function checks if the OAuth token is expired (with 60s buffer). If expired and a refresh token exists, it refreshes automatically. This runs before every YouTube Library API call.

### Session Config for Cross-Origin (`server/index.js:124-136`)
```js
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
cookie: {
  secure: isProduction,          // Required for SameSite=None
  sameSite: isProduction ? 'none' : 'lax',  // 'none' for cross-origin
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
}
```

---

## 11. Future Improvements

- **Persistent state:** Move room state to Redis/PostgreSQL so rooms survive server restarts
- **Host controls:** Restrict play/pause/seek to host only (optional)
- **User avatars:** Use Google profile picture in user list
- **Room creation from library:** Allow creating a room pre-loaded with a YouTube playlist
- **Spotify integration:** Add Spotify OAuth for playlist import
- **Mobile PWA:** Add service worker for offline room history
- **Reconnection resilience:** Better handling of network drops with exponential backoff
