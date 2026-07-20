"use client";

import { useState } from "react";

interface QueueItem {
  id: string;
  title: string;
  thumbnail: string;
  addedBy: string;
  queueId: string;
}

interface QueueProps {
  queue: QueueItem[];
  onRemove: (queueId: string) => void;
  onPlay?: (item: QueueItem) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function Queue({ queue, onRemove, onPlay, onReorder }: QueueProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (queue.length === 0) {
    return (
      <div className="text-center py-6 text-muted text-sm">
        Queue is empty. Add songs to get started.
      </div>
    );
  }

  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && onReorder) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {queue.map((item, i) => (
        <div
          key={item.queueId}
          draggable={!!onReorder}
          onDragStart={() => setDragIndex(i)}
          onDragEnter={() => dragIndex !== null && setOverIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(i);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-3 bg-background rounded-lg p-2 border transition-all group ${
            overIndex === i && dragIndex !== null && dragIndex !== i
              ? "border-primary"
              : "border-card-border hover:border-primary/30"
          } ${dragIndex === i ? "opacity-40" : ""}`}
        >
          {onReorder && (
            <span
              className="text-muted/50 hover:text-muted cursor-grab active:cursor-grabbing shrink-0"
              title="Drag to reorder"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 6a2 2 0 11-4 0 2 2 0 014 0zM9 12a2 2 0 11-4 0 2 2 0 014 0zM9 18a2 2 0 11-4 0 2 2 0 014 0zM19 6a2 2 0 11-4 0 2 2 0 014 0zM19 12a2 2 0 11-4 0 2 2 0 014 0zM19 18a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          )}
          <span className="text-xs text-muted w-5 text-center shrink-0">{i + 1}</span>
          <img
            src={item.thumbnail}
            alt=""
            className="w-10 h-7 object-cover rounded shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{item.title}</p>
            <p className="text-xs text-muted">Added by {item.addedBy}</p>
          </div>
          {onPlay && (
            <button
              onClick={() => onPlay(item)}
              className="text-primary/60 hover:text-primary text-xs px-2 py-1 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              title="Play now"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onRemove(item.queueId)}
            className="text-danger/50 hover:text-danger text-sm px-2 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
