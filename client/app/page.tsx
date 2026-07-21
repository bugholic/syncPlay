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
  getCurrentRoom,
} from "@/lib/storage";
import CreateRoom from "@/components/CreateRoom";
import JoinRoom from "@/components/JoinRoom";
import RoomList from "@/components/RoomList";
import RoomHistory from "@/components/RoomHistory";
import YouTubeLibrary from "@/components/YouTubeLibrary";
import { useToast } from "@/components/Toast";
import { getAuthUser, redirectToGoogleLogin, logout, AuthUser } from "@/lib/auth";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [username, setUser] = useState("");
  const [apiKey, setApiKeyState] = useState("");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [historyKey, setHistoryKey] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRoomPanel, setShowRoomPanel] = useState(false);

  useEffect(() => {
    setUser(getUsername());
    setApiKeyState(getApiKey());
    connectSocket();
    getAuthUser().then((u) => {
      setAuthUser(u);
      setAuthLoading(false);
    });
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
    const currentRoom = getCurrentRoom();
    if (currentRoom) {
      const socket = getSocket();
      socket.emit("add-to-queue", { roomId: currentRoom.roomId, video });
      toast(`Added "${video.title}" to queue`);
    } else {
      setShowRoomPanel(true);
      toast("Create or join a room first, then add songs");
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

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
  };

  const currentRoom = getCurrentRoom();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SyncPlay
            </div>
            {currentRoom && (
              <button
                onClick={() => router.push(`/room/${currentRoom.roomId}`)}
                className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full hover:bg-primary/30 transition-colors"
              >
                Back to Room
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-card-border animate-pulse" />
            ) : authUser ? (
              <div className="flex items-center gap-2">
                {authUser.picture && (
                  <img src={authUser.picture} alt="" className="w-8 h-8 rounded-full border border-card-border" />
                )}
                <span className="text-xs text-muted hidden sm:block">{authUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted hover:text-danger transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={redirectToGoogleLogin}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors border border-gray-300"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in
              </button>
            )}

            <div className="w-px h-6 bg-card-border" />

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Your name"
                className="w-28 sm:w-36 bg-background border border-card-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/50"
              />
              <button
                onClick={handleSave}
                className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            <button
              onClick={() => setShowRoomPanel(!showRoomPanel)}
              className={`text-xs font-medium py-1.5 px-3 rounded-lg transition-colors ${
                showRoomPanel
                  ? "bg-primary text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {showRoomPanel ? "Close" : "Rooms"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6">
        {showRoomPanel && (
          <div className="space-y-4 bg-card border border-card-border rounded-xl p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("create")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "create"
                    ? "bg-primary text-white"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setTab("join")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "join"
                    ? "bg-accent text-white"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
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
          </div>
        )}

        <YouTubeLibrary onAddToQueue={handleAddToQueueFromLibrary} inRoom={!!currentRoom} />

        {!showRoomPanel && (
          <div className="space-y-4">
            <RoomHistory onJoinRoom={handleRoomJoined} refreshKey={historyKey} />
            <RoomList onRoomJoined={handleRoomJoined} />
          </div>
        )}
      </main>
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
