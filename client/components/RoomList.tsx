"use client";

import { useState, useEffect, useCallback } from "react";
import { connectSocket } from "@/lib/socket";

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
                onClick={() => onRoomJoined(room.id)}
                className="ml-4 bg-success/20 hover:bg-success/30 text-success px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
