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
          if (ignoreEvents.current) return;
          const YT = window.YT;
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
    if (Math.abs(currentTime - syncTime) > 2) {
      ignoreEvents.current = true;
      player.seekTo(syncTime, true);
      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
      setTimeout(() => { ignoreEvents.current = false; }, 500);
    }
  }, [syncTime, shouldSync, ready, isPlaying]);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-card border border-card-border rounded-xl flex items-center justify-center">
        <div className="text-center text-muted">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
          <p className="text-lg">No video playing</p>
          <p className="text-sm">Search and add a song to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-card-border">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
