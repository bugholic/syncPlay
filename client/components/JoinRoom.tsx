"use client";

import { useState } from "react";
import { getUsername } from "@/lib/storage";

interface JoinRoomProps {
  onRoomJoined: (roomId: string, password?: string) => void;
}

export default function JoinRoom({ onRoomJoined }: JoinRoomProps) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    const uname = getUsername();
    if (!uname) {
      setError("Please save your username first on the home page");
      return;
    }

    setError("");
    onRoomJoined(roomId.trim(), password);
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
          className="w-full bg-accent hover:bg-accent/80 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
