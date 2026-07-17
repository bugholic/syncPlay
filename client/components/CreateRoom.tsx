"use client";

import { useState } from "react";
import { connectSocket } from "@/lib/socket";
import { setUsername as saveUsername, setApiKey as saveApiKey, getUsername, getApiKey } from "@/lib/storage";

interface CreateRoomProps {
  onRoomCreated: (roomId: string, password?: string) => void;
}

export default function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Room name is required");
      return;
    }

    const uname = getUsername();
    if (!uname) {
      setError("Please save your username first on the home page");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const socket = connectSocket();
      socket.emit(
        "create-room",
        {
          name: name.trim(),
          isPublic,
          password: isPublic ? null : password,
          apiKey: getApiKey(),
          username: uname,
        },
        (response: { success: boolean; roomId?: string; error?: string }) => {
          setLoading(false);
          if (response.success && response.roomId) {
            onRoomCreated(response.roomId, isPublic ? "" : password);
          } else {
            setError(response.error || "Failed to create room");
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
      <h2 className="text-xl font-bold mb-4 text-primary">Create Room</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Room Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Music Session"
            className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPublic(true)}
            className={`flex-1 py-2 rounded-lg border transition-all ${
              isPublic
                ? "bg-primary/20 border-primary text-primary"
                : "bg-background border-card-border text-muted hover:border-muted"
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setIsPublic(false)}
            className={`flex-1 py-2 rounded-lg border transition-all ${
              !isPublic
                ? "bg-primary/20 border-primary text-primary"
                : "bg-background border-card-border text-muted hover:border-muted"
            }`}
          >
            Private
          </button>
        </div>

        {!isPublic && (
          <div>
            <label className="block text-sm text-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Room password"
              className="w-full bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted/50"
            />
          </div>
        )}

        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
      </div>
    </div>
  );
}
