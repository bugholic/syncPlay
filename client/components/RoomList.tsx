"use client";

import { useState, useEffect, useCallback } from "react";
import { connectSocket, getSocket } from "@/lib/socket";
import { getUsername, getApiKey } from "@/lib/storage";

interface PublicRoom {
  id: string;
  name: string;
  userCount: number;
  currentVideo: { id: string; title: string } | null;
}

interface RoomListProps {
  onRoomJoined: (roomId: string) => void;
}

export default function RoomList({ onRoomJoined }: RoomListProps) {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const fetchRooms = useCallback(() => {
    const socket = connectSocket();
    socket.emit("get-public-rooms", (publicRooms: PublicRoom[]) => {
      setRooms(publicRooms);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleJoin = (roomId: string, needsPassword: boolean) => {
    if (needsPassword) {
      setPasswordPrompt(roomId);
      setPassword("");
      setError("");
      return;
    }
    joinRoom(roomId, "");
  };

  const joinRoom = (roomId: string, pwd: string) => {
    setJoiningId(roomId);
    setError("");
    const socket = connectSocket();
    socket.emit(
      "join-room",
      {
        roomId,
        password: pwd,
        username: getUsername(),
      },
      (response: { success: boolean; room?: { id: string }; error?: string }) => {
        setJoiningId(null);
        if (response.success) {
          onRoomJoined(roomId);
        } else {
          setError(response.error || "Failed to join");
          setJoiningId(null);
        }
      }
    );
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-success">Public Rooms</h2>
        <button
          onClick={fetchRooms}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-8 text-muted">No public rooms yet. Create one!</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-card-border hover:border-success/50 transition-all group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{room.name}</span>
                  <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full">
                    {room.userCount} {room.userCount === 1 ? "user" : "users"}
                  </span>
                </div>
                <div className="text-xs text-muted mt-0.5 font-mono">ID: {room.id}</div>
                {room.currentVideo && (
                  <div className="text-xs text-accent mt-0.5 truncate">
                    Now playing: {room.currentVideo.title}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleJoin(room.id, false)}
                disabled={joiningId === room.id}
                className="ml-4 bg-success/20 hover:bg-success/30 text-success px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
              >
                {joiningId === room.id ? "Joining..." : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}

      {passwordPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-card-border rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4">Enter Room Password</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  joinRoom(passwordPrompt, password);
                  setPasswordPrompt(null);
                }
              }}
              autoFocus
            />
            {error && <p className="text-danger text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setPasswordPrompt(null)}
                className="flex-1 bg-background border border-card-border text-muted py-2 rounded-lg hover:border-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  joinRoom(passwordPrompt, password);
                  setPasswordPrompt(null);
                }}
                className="flex-1 bg-primary hover:bg-primary-hover text-white py-2 rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
