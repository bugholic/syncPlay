"use client";

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
}

export default function Queue({ queue, onRemove, onPlay }: QueueProps) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-6 text-muted text-sm">
        Queue is empty. Add songs to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((item, i) => (
        <div
          key={item.queueId}
          className="flex items-center gap-3 bg-background rounded-lg p-2 border border-card-border hover:border-primary/30 transition-all group"
        >
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
