"use client";

import { useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

interface SearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { default: { url: string }; medium: { url: string } };
    channelTitle: string;
  };
}

interface SearchBarProps {
  roomId: string;
  onAddToQueue: (video: { id: string; title: string; thumbnail: string }) => void;
  serverUrl?: string;
}

const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function SearchBar({ roomId, onAddToQueue, serverUrl = DEFAULT_SERVER_URL }: SearchBarProps) {
  const [tab, setTab] = useState<"search" | "link">("search");
  const [searchInput, setSearchInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState("");

  const addFromUrl = async (url: string) => {
    setLoadingUrl(true);
    setError("");
    try {
      const parsed = parseYouTubeUrl(url);

      if (parsed.type === "video" && parsed.videoId) {
        const res = await fetch(`${serverUrl}/api/video/${parsed.videoId}`);
        const data = await res.json();
        onAddToQueue({ id: data.id, title: data.title, thumbnail: data.thumbnail });
        setLinkInput("");
      } else if (parsed.type === "playlist" && parsed.playlistId) {
        const res = await fetch(`${serverUrl}/api/playlist/${parsed.playlistId}`);
        const data = await res.json();
        if (data.videos && data.videos.length > 0) {
          for (const video of data.videos) {
            onAddToQueue({ id: video.id, title: video.title, thumbnail: video.thumbnail });
          }
        } else {
          setError(data.message || "No videos found in playlist");
        }
        setLinkInput("");
      } else {
        setError("Could not parse YouTube URL");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load from URL");
    }
    setLoadingUrl(false);
  };

  const search = async () => {
    if (!searchInput.trim()) return;

    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `${serverUrl}/api/rooms/${roomId}/search?q=${encodeURIComponent(searchInput)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }
      setResults(data.items || []);
    } catch (err: any) {
      setError(err.message || "Search failed");
    }
    setSearching(false);
  };

  const handleAdd = (item: SearchResult) => {
    onAddToQueue({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
    });
    setResults(results.filter((r) => r.id.videoId !== item.id.videoId));
  };

  const handleLinkSubmit = () => {
    if (!linkInput.trim()) return;
    addFromUrl(linkInput);
  };

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-background rounded-lg p-1 border border-card-border">
        <button
          onClick={() => { setTab("search"); setError(""); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "search"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Search
        </button>
        <button
          onClick={() => { setTab("link"); setError(""); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "link"
              ? "bg-success text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Paste Link
        </button>
      </div>

      {tab === "search" ? (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search YouTube by keyword..."
              className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              onKeyDown={(e) => e.key === "Enter" && !searching && search()}
            />
            <button
              onClick={search}
              disabled={searching || !searchInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 disabled:opacity-50 bg-primary hover:bg-primary-hover text-white"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((item) => (
                <div
                  key={item.id.videoId}
                  className="flex items-center gap-3 bg-background rounded-lg p-2 border border-card-border hover:border-primary/50 transition-all group"
                >
                  <img
                    src={item.snippet.thumbnails.default.url}
                    alt=""
                    className="w-16 h-12 object-cover rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.snippet.title}</p>
                    <p className="text-xs text-muted truncate">{item.snippet.channelTitle}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste YouTube video or playlist URL..."
              className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              onKeyDown={(e) => e.key === "Enter" && !loadingUrl && handleLinkSubmit()}
            />
            <button
              onClick={handleLinkSubmit}
              disabled={loadingUrl || !linkInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 disabled:opacity-50 bg-success hover:bg-success/80 text-white"
            >
              {loadingUrl ? "Loading..." : "Add"}
            </button>
          </div>

          <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 mb-3 text-xs text-success">
            Paste any YouTube video or playlist link — no API key needed
          </div>
        </>
      )}

      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}
