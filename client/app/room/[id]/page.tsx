"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket";
import { getUsername, getApiKey, addRecentRoom } from "@/lib/storage";
import YouTubePlayer from "@/components/YouTubePlayer";
import SearchBar from "@/components/SearchBar";
import Queue from "@/components/Queue";
import Chat from "@/components/Chat";
import UserList from "@/components/UserList";

interface QueueItem {
  id: string;
  title: string;
  thumbnail: string;
  addedBy: string;
  queueId: string;
}

interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [currentVideo, setCurrentVideo] = useState<{ id: string; title: string; thumbnail: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncTime, setSyncTime] = useState(0);
  const [shouldSync, setShouldSync] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<"player" | "search" | "chat">("player");

  const ignoreNextPlay = useRef(false);
  const ignoreNextPause = useRef(false);
  const navigatingAway = useRef(false);

  useEffect(() => {
    const uname = getUsername();
    const key = getApiKey();
    if (!uname) {
      router.push("/");
      return;
    }
    setUsername(uname);
    setApiKey(key);

    const socket = connectSocket();

    socket.emit(
      "join-room",
      { roomId, password: "", username: uname },
      (response: { success: boolean; room?: any; error?: string }) => {
        if (response.success && response.room) {
          const r = response.room;
          setRoomName(r.name);
          setCurrentVideo(r.currentVideo);
          setIsPlaying(r.isPlaying);
          setSyncTime(r.currentTime);
          setShouldSync(true);
          setQueue(r.queue || []);
          setMessages(r.messages || []);
          setUsers(r.users || []);
          setHost(r.host);
          if (r.apiKey) setApiKey(r.apiKey);
          addRecentRoom({ id: roomId, name: r.name, lastJoined: Date.now() });
          setConnected(true);
        } else {
          setError(response.error || "Failed to join room");
        }
      }
    );

    socket.on("room-state", (r: any) => {
      setCurrentVideo(r.currentVideo);
      setIsPlaying(r.isPlaying);
      setSyncTime(r.currentTime);
      setShouldSync(true);
      setQueue(r.queue || []);
      setUsers(r.users || []);
      setHost(r.host);
      setRoomName(r.name);
    });

    socket.on("play", ({ videoId, title, thumbnail, time, queue: q }: any) => {
      ignoreNextPlay.current = true;
      setCurrentVideo({ id: videoId, title, thumbnail });
      setIsPlaying(true);
      setSyncTime(time);
      setShouldSync(true);
      if (q) setQueue(q);
    });

    socket.on("pause", ({ time }: any) => {
      ignoreNextPause.current = true;
      setIsPlaying(false);
      setSyncTime(time);
      setShouldSync(true);
    });

    socket.on("seek", ({ time }: any) => {
      setSyncTime(time);
      setShouldSync(true);
    });

    socket.on("video-ended", () => {
      setIsPlaying(false);
      setCurrentVideo(null);
    });

    socket.on("queue-updated", (q: QueueItem[]) => {
      setQueue(q);
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-joined", ({ user, users: u }: any) => {
      setUsers(u);
    });

    socket.on("user-left", ({ user, users: u }: any) => {
      setUsers(u);
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      if (navigatingAway.current) {
        socket.emit("leave-room");
      }
      socket.off("room-state");
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("video-ended");
      socket.off("queue-updated");
      socket.off("chat-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [roomId, router]);

  const handlePlay = useCallback(
    (time: number) => {
      if (ignoreNextPlay.current) {
        ignoreNextPlay.current = false;
        return;
      }
      setIsPlaying(true);
      if (currentVideo) {
        getSocket().emit("play", {
          roomId,
          videoId: currentVideo.id,
          title: currentVideo.title,
          thumbnail: currentVideo.thumbnail,
          time,
        });
      }
    },
    [roomId, currentVideo]
  );

  const handlePause = useCallback(
    (time: number) => {
      if (ignoreNextPause.current) {
        ignoreNextPause.current = false;
        return;
      }
      setIsPlaying(false);
      getSocket().emit("pause", { roomId, time });
    },
    [roomId]
  );

  const handleSeek = useCallback(
    (time: number) => {
      getSocket().emit("seek", { roomId, time });
    },
    [roomId]
  );

  const handleVideoEnd = useCallback(() => {
    getSocket().emit("skip", { roomId });
  }, [roomId]);

  const handleAddToQueue = useCallback(
    (video: { id: string; title: string; thumbnail: string }) => {
      getSocket().emit("add-to-queue", { roomId, video });
    },
    [roomId]
  );

  const handleRemoveFromQueue = useCallback(
    (queueId: string) => {
      getSocket().emit("remove-from-queue", { roomId, queueId });
    },
    [roomId]
  );

  const handleSendChat = useCallback(
    (text: string) => {
      getSocket().emit("chat-message", { roomId, user: username, text });
      setMessages((prev) => [...prev, { user: username, text, timestamp: Date.now() }]);
    },
    [roomId, username]
  );

  const handlePlayFromQueue = useCallback(
    (item: QueueItem) => {
      getSocket().emit("play", {
        roomId,
        videoId: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        time: 0,
      });
      setCurrentVideo({ id: item.id, title: item.title, thumbnail: item.thumbnail });
      setIsPlaying(true);
      getSocket().emit("remove-from-queue", { roomId, queueId: item.queueId });
    },
    [roomId]
  );

  const handleLeave = () => {
    navigatingAway.current = true;
    router.push("/");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleLeave}
              className="text-muted hover:text-foreground transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{roomName || "Room"}</h1>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-mono">{roomId}</span>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-danger"}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted bg-card px-2 py-1 rounded-full border border-card-border">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
            <button
              onClick={handleLeave}
              className="text-danger hover:text-danger/80 text-sm px-3 py-1 rounded-lg border border-danger/30 hover:bg-danger/10 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-3">
        <div className="hidden md:grid md:grid-cols-[1fr,340px] gap-4 h-[calc(100vh-80px)]">
          <div className="space-y-4 overflow-y-auto pr-2">
            <YouTubePlayer
              videoId={currentVideo?.id || null}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onVideoEnd={handleVideoEnd}
              syncTime={syncTime}
              shouldSync={shouldSync}
            />
            {currentVideo && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="font-medium">{currentVideo.title}</h3>
              </div>
            )}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-muted mb-3">Add to Queue</h3>
              <SearchBar apiKey={apiKey} onAddToQueue={handleAddToQueue} />
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-muted mb-3">
                Queue ({queue.length} {queue.length === 1 ? "song" : "songs"})
              </h3>
              <Queue queue={queue} onRemove={handleRemoveFromQueue} />
              {queue.length > 0 && (
                <div className="mt-3 space-y-1">
                  {queue.map((item) => (
                    <button
                      key={item.queueId}
                      onClick={() => handlePlayFromQueue(item)}
                      className="w-full text-left bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Play now: {item.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-muted mb-3">In this room</h3>
              <UserList users={users} host={host} username={username} />
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-card-border">
              <h3 className="text-sm font-medium text-muted">Chat</h3>
            </div>
            <div className="flex-1 min-h-0">
              <Chat messages={messages} onSend={handleSendChat} username={username} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex flex-col h-[calc(100vh-80px)]">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMobileTab("player")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mobileTab === "player" ? "bg-primary text-white" : "bg-card border border-card-border text-muted"
              }`}
            >
              Player
            </button>
            <button
              onClick={() => setMobileTab("search")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mobileTab === "search" ? "bg-primary text-white" : "bg-card border border-card-border text-muted"
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setMobileTab("chat")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mobileTab === "chat" ? "bg-primary text-white" : "bg-card border border-card-border text-muted"
              }`}
            >
              Chat
            </button>
          </div>

          {mobileTab === "player" && (
            <div className="flex-1 overflow-y-auto space-y-3">
              <YouTubePlayer
                videoId={currentVideo?.id || null}
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onVideoEnd={handleVideoEnd}
                syncTime={syncTime}
                shouldSync={shouldSync}
              />
              {currentVideo && (
                <div className="bg-card border border-card-border rounded-xl p-3">
                  <h3 className="font-medium text-sm truncate">{currentVideo.title}</h3>
                </div>
              )}
              <div className="bg-card border border-card-border rounded-xl p-3">
                <h3 className="text-sm font-medium text-muted mb-2">Queue ({queue.length})</h3>
                <Queue queue={queue} onRemove={handleRemoveFromQueue} />
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3">
                <h3 className="text-sm font-medium text-muted mb-2">Users</h3>
                <UserList users={users} host={host} username={username} />
              </div>
            </div>
          )}

          {mobileTab === "search" && (
            <div className="bg-card border border-card-border rounded-xl p-4 flex-1 overflow-y-auto">
              <SearchBar apiKey={apiKey} onAddToQueue={handleAddToQueue} />
            </div>
          )}

          {mobileTab === "chat" && (
            <div className="bg-card border border-card-border rounded-xl flex-1 overflow-hidden">
              <Chat messages={messages} onSend={handleSendChat} username={username} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
