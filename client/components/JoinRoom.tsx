"use client";

import { useState } from "react";
import { connectSocket } from "@/lib/socket";
import { getUsername, getApiKey } from "@/lib/storage";

interface JoinRoomProps {
  onRoomJoined: (roomId: string) => void;
}

export default function JoinRoom({ onRoomJoined }: JoinRoomProps) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const socket = connectSocket();
      socket.emit(
        "join-room",
        {
          roomId: roomId.trim(),
          password,
          username: getUsername(),
        },
        (response: { success: boolean; room?: { id: string }; error?: string }) => {
          setLoading(false);
          if (response.success) {
            onRoomJoined(roomId.trim());
          } else {
            setError(response.error || "Failed to join room");
          }
        }
      );
    } catch {
      setLoading(false);
      setError("Failed to connect to server");
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 text-accent">Join Room</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Room ID</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
            className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50 font-mono"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1">Password (if private)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}
