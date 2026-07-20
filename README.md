# SyncPlay - Listen Together

Real-time synchronized music listening with friends. Create rooms, search YouTube, share playlists, and chat.

## Quick Start

### 1. Start the Server
```bash
cd server
npm install
npm start
```
Server runs on `http://localhost:3001`

### 2. Start the Client
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:3000`

## Features

- **Create Rooms** - Public or private (with password)
- **Join Rooms** - Browse public rooms or enter a room ID
- **YouTube Search** - Search and add songs to queue using your own API key
- **Synced Playback** - Everyone hears the same thing at the same time
- **Song Queue** - Anyone can add songs, queue visible to all
- **Real-time Chat** - Message other users in the room
- **No Login Required** - Just pick a username
- **Room History** - Previously joined rooms saved in localStorage

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `PORT` | server | Port the server listens on (default `3001`) |
| `CLIENT_ORIGIN` | server | Comma-separated list of allowed client origins for Socket.IO CORS (default `http://localhost:3000,http://localhost:3001`) |
| `NEXT_PUBLIC_SOCKET_URL` | client | URL of the deployed server, e.g. `https://api.example.com` (default `http://localhost:3001`) |

## YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **YouTube Data API v3**
4. Create an API key under Credentials
5. Enter it on the SyncPlay home page

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Backend  | Node.js + Socket.IO |
| Video    | YouTube IFrame API |
| State    | In-memory (server) + localStorage (client) |

## How It Works

1. One user creates a room (they become the host)
2. Others join via room ID or by browsing public rooms
3. Anyone can search YouTube and add songs to the queue
4. Play/pause/seek/skip actions are synced to all users in real-time
5. Chat messages are broadcast to everyone in the room
6. When a video ends, the next song in queue plays automatically
