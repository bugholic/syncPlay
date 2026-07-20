"use client";

import { useEffect, useState } from "react";
import { getRecentRooms, removeRecentRoom, type RecentRoom } from "@/lib/storage";

interface RoomHistoryProps {
  onJoinRoom: (roomId: string) => void;
  refreshKey?: number;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function RoomHistory({ onJoinRoom, refreshKey }: RoomHistoryProps) {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    const recent = getRecentRooms();
    setRooms(recent);

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        recent.map(async (room) => {
          try {
            const res = await fetch(`${SERVER_URL}/api/rooms/${room.id}/exists`);
            const data = await res.json();
            return { id: room.id, exists: !!data.exists };
          } catch {
            return { id: room.id, exists: true };
          }
        })
      );
      if (cancelled) return;
      const closedIds = results.filter((r) => !r.exists).map((r) => r.id);
      if (closedIds.length > 0) {
        closedIds.forEach(removeRecentRoom);
        setRooms(getRecentRooms());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRemove = (id: string) => {
    removeRecentRoom(id);
    setRooms(getRecentRooms());
  };

  if (rooms.length === 0) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 text-muted">Recent Rooms</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-card-border hover:border-muted/50 transition-all"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{room.name}</div>
              <div className="text-xs text-muted font-mono">ID: {room.id}</div>
              <div className="text-xs text-muted">
                Last joined: {new Date(room.lastJoined).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={() => onJoinRoom(room.id)}
                className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Rejoin
              </button>
              <button
                onClick={() => handleRemove(room.id)}
                className="text-danger/50 hover:text-danger px-2 py-1 text-xs transition-colors"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
