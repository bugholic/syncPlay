"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket";
import {
  getUsername,
  setUsername,
  getApiKey,
  setApiKey,
  addRecentRoom,
  setCurrentRoom,
} from "@/lib/storage";
import CreateRoom from "@/components/CreateRoom";
import JoinRoom from "@/components/JoinRoom";
import RoomList from "@/components/RoomList";
import RoomHistory from "@/components/RoomHistory";
import YouTubeLibrary from "@/components/YouTubeLibrary";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUser] = useState("");
  const [apiKey, setApiKeyState] = useState("");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    setUser(getUsername());
    setApiKeyState(getApiKey());
    connectSocket();
  }, []);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "success") {
      window.location.replace("/");
    } else if (auth === "error") {
      window.location.replace("/");
    }
  }, [searchParams]);

  const handleSave = () => {
    setUsername(username);
    setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddToQueueFromLibrary = (video: { id: string; title: string; thumbnail: string }) => {
    const socket = getSocket();
    const currentRoom = localStorage.getItem("syncplay_currentRoom");
    if (currentRoom) {
      const { roomId } = JSON.parse(currentRoom);
      socket.emit("add-to-queue", { roomId, video });
    }
  };

  const handleRoomJoined = (roomId: string, password?: string) => {
    addRecentRoom({ id: roomId, name: "Room " + roomId, lastJoined: Date.now() });
    setCurrentRoom(roomId, password || "");
    setHistoryKey((k) => k + 1);
    router.push(`/room/${roomId}`);
  };

  const handleRoomCreated = (roomId: string, password?: string) => {
    addRecentRoom({ id: roomId, name: "Room " + roomId, lastJoined: Date.now() });
    setCurrentRoom(roomId, password || "");
    setHistoryKey((k) => k + 1);
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SyncPlay
          </div>
          <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full border border-card-border">
            Listen Together
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="text-sm font-medium text-muted mb-3">Your Profile</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">
                YouTube API Key <span className="text-muted/60">(optional)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                placeholder="AIza... (for keyword search)"
                className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50 font-mono"
              />
              <p className="text-[10px] text-muted/60 mt-1">Only needed for keyword search. Paste links directly without it.</p>
            </div>
            <button
              onClick={handleSave}
              className="self-end bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors shrink-0"
            >
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
              tab === "create"
                ? "bg-primary text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
              tab === "join"
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Join Room
          </button>
        </div>

        {tab === "create" ? (
          <CreateRoom onRoomCreated={handleRoomCreated} />
        ) : (
          <JoinRoom onRoomJoined={handleRoomJoined} />
        )}

        <YouTubeLibrary onAddToQueue={handleAddToQueueFromLibrary} />

        <RoomList onRoomJoined={handleRoomJoined} />

        <RoomHistory onJoinRoom={handleRoomJoined} refreshKey={historyKey} />
      </main>

      <footer className="border-t border-card-border p-4 text-center text-xs text-muted">
        SyncPlay - Everyone controls the music
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
