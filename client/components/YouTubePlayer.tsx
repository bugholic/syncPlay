"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onVideoEnd: () => void;
  syncTime?: number;
  shouldSync: boolean;
}

export default function YouTubePlayer({
  videoId,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onVideoEnd,
  syncTime,
  shouldSync,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const ignoreEvents = useRef(false);
  const currentVideoRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    if (window.YT) {
      setApiLoaded(true);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setApiLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiLoaded || !containerRef.current) return;

    if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
      if (videoId && videoId !== currentVideoRef.current) {
        currentVideoRef.current = videoId;
        playerRef.current.loadVideoById(videoId);
      }
      return;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: videoId || "",
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
      },
      events: {
        onReady: () => {
          setReady(true);
          if (videoId) currentVideoRef.current = videoId;
        },
        onStateChange: (event: any) => {
          const YT = window.YT;
          setPlaying(event.data === YT.PlayerState.PLAYING);
          if (ignoreEvents.current) return;
          if (event.data === YT.PlayerState.PLAYING) {
            onPlay(event.target.getCurrentTime());
          } else if (event.data === YT.PlayerState.PAUSED) {
            onPause(event.target.getCurrentTime());
          } else if (event.data === YT.PlayerState.ENDED) {
            currentVideoRef.current = null;
            onVideoEnd();
          }
        },
      },
    });
  }, [apiLoaded, videoId]);

  useEffect(() => {
    if (!ready || !playerRef.current || !shouldSync || syncTime === undefined) return;
    const player = playerRef.current;
    if (typeof player.getCurrentTime !== "function") return;
    const currentTime = player.getCurrentTime();
    ignoreEvents.current = true;
    if (Math.abs(currentTime - syncTime) > 2) {
      player.seekTo(syncTime, true);
    }
    if (isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
    setTimeout(() => { ignoreEvents.current = false; }, 500);
  }, [syncTime, shouldSync, ready, isPlaying]);

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || seeking) return;
      if (typeof player.getCurrentTime === "function") setCurrentTime(player.getCurrentTime());
      if (typeof player.getDuration === "function") setDuration(player.getDuration());
    }, 500);
    return () => clearInterval(interval);
  }, [ready, seeking]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const skip = (seconds: number) => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== "function") return;
    const time = Math.max(0, Math.min(duration, player.getCurrentTime() + seconds));
    player.seekTo(time, true);
    setCurrentTime(time);
    onSeek(time);
  };

  const handleSeekCommit = (time: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(time, true);
    setCurrentTime(time);
    setSeeking(false);
    onSeek(time);
  };

  useEffect(() => {
    if (!ready || !playerRef.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;
      if (isPlaying) {
        ignoreEvents.current = true;
        player.playVideo();
        setTimeout(() => { ignoreEvents.current = false; }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [ready, isPlaying]);

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  const formatTime = (t: number) => {
    if (!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-card-border relative">
        <div ref={containerRef} className="w-full h-full" />
        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="text-center text-muted">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              <p className="text-lg">No video playing</p>
              <p className="text-sm">Search and add a song to get started</p>
            </div>
          </div>
        )}
      </div>

      {videoId && (
      <div className="bg-card border border-card-border rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-10 text-right shrink-0">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => {
              setSeeking(true);
              setCurrentTime(parseFloat(e.target.value));
            }}
            onMouseUp={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
            disabled={!ready}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted w-10 shrink-0">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => skip(-10)}
            disabled={!ready}
            className="text-muted hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Rewind 10 seconds"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            disabled={!ready}
            className="bg-primary hover:bg-primary-hover text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => skip(10)}
            disabled={!ready}
            className="text-muted hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Forward 10 seconds"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>

          <button
            onClick={toggleMute}
            disabled={!ready}
            className="text-muted hover:text-foreground transition-colors disabled:opacity-40 ml-2"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14L21 10M21 14L17 10M11 5L6 9H3v6h3l5 4V5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
              </svg>
            )}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
