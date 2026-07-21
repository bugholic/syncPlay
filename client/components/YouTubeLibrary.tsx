"use client";

import { useState, useEffect } from "react";
import {
  getAuthUser,
  redirectToGoogleLogin,
  logout,
  fetchPlaylists,
  fetchPlaylistVideos,
  fetchLikedVideos,
  AuthUser,
  YouTubePlaylist,
  YouTubeVideo,
} from "@/lib/auth";

interface YouTubeLibraryProps {
  onAddToQueue: (video: { id: string; title: string; thumbnail: string }) => void;
}

export default function YouTubeLibrary({ onAddToQueue }: YouTubeLibraryProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [likedVideos, setLikedVideos] = useState<YouTubeVideo[]>([]);
  const [view, setView] = useState<string>("playlists");
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingPlaylistDetail, setLoadingPlaylistDetail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAuthUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && view === "playlists" && playlists.length === 0) {
      setLoadingPlaylists(true);
      fetchPlaylists(25)
        .then((data) => setPlaylists(data.playlists || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoadingPlaylists(false));
    }
  }, [user, view]);

  useEffect(() => {
    if (user && view === "liked" && likedVideos.length === 0) {
      setLoadingLiked(true);
      fetchLikedVideos(25)
        .then((data) => setLikedVideos(data.videos || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoadingLiked(false));
    }
  }, [user, view]);

  const handleSelectPlaylist = async (playlist: YouTubePlaylist) => {
    setSelectedPlaylist(playlist);
    setView("playlist-detail");
    setLoadingPlaylistDetail(true);
    setPlaylistVideos([]);
    setError("");
    try {
      const data = await fetchPlaylistVideos(playlist.id);
      setPlaylistVideos(data.videos || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoadingPlaylistDetail(false);
  };

  const handleAddAll = (videos: YouTubeVideo[]) => {
    for (const v of videos) {
      onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail });
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setPlaylists([]);
    setLikedVideos([]);
    setSelectedPlaylist(null);
    setView("playlists");
  };

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted mb-3">YouTube Library</h3>
        <p className="text-xs text-muted mb-3">
          Sign in with your Google account to access your playlists and liked videos.
        </p>
        <button
          onClick={redirectToGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm border border-gray-300"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  const showSubTabs = view === "playlists" || view === "liked";

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted">YouTube Library</h3>
        <div className="flex items-center gap-2">
          {view !== "playlists" && (
            <button
              onClick={() => {
                setView("playlists");
                setSelectedPlaylist(null);
                setError("");
              }}
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-danger hover:text-danger/80 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {user.picture && (
          <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
        )}
        <span className="text-xs text-muted truncate">{user.name}</span>
      </div>

      {showSubTabs && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setView("playlists")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === "playlists"
                ? "bg-primary text-white"
                : "bg-background border border-card-border text-muted"
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setView("liked")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === "liked"
                ? "bg-primary text-white"
                : "bg-background border border-card-border text-muted"
            }`}
          >
            Liked
          </button>
        </div>
      )}

      {error && <p className="text-danger text-xs mb-2">{error}</p>}

      {view === "playlists" && (
        <>
          {loadingPlaylists ? (
            <div className="text-muted text-xs py-4 text-center">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="text-muted text-xs py-4 text-center">No playlists found</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl)}
                  className="w-full flex items-center gap-2 bg-background rounded-lg p-2 border border-card-border hover:border-primary/50 transition-all text-left group"
                >
                  {pl.thumbnail ? (
                    <img src={pl.thumbnail} alt="" className="w-12 h-9 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-12 h-9 bg-card-border rounded shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{pl.title}</p>
                    <p className="text-[10px] text-muted">{pl.videoCount} videos</p>
                  </div>
                  <svg className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === "liked" && (
        <>
          {loadingLiked ? (
            <div className="text-muted text-xs py-4 text-center">Loading liked videos...</div>
          ) : likedVideos.length === 0 ? (
            <div className="text-muted text-xs py-4 text-center">No liked videos found</div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleAddAll(likedVideos)}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors"
                >
                  Add all to queue
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {likedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 bg-background rounded-lg p-2 border border-card-border hover:border-primary/50 transition-all group"
                  >
                    <img src={v.thumbnail} alt="" className="w-16 h-12 object-cover rounded shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{v.title}</p>
                    </div>
                    <button
                      onClick={() => onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail })}
                      className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded text-[10px] font-medium transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "playlist-detail" && selectedPlaylist && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium truncate">{selectedPlaylist.title}</p>
            {playlistVideos.length > 0 && (
              <button
                onClick={() => handleAddAll(playlistVideos)}
                className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors shrink-0"
              >
                Add all
              </button>
            )}
          </div>
          {loadingPlaylistDetail ? (
            <div className="text-muted text-xs py-4 text-center">Loading videos...</div>
          ) : playlistVideos.length === 0 ? (
            <div className="text-muted text-xs py-4 text-center">No videos in this playlist</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {playlistVideos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 bg-background rounded-lg p-2 border border-card-border hover:border-primary/50 transition-all group"
                >
                  <img src={v.thumbnail} alt="" className="w-16 h-12 object-cover rounded shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{v.title}</p>
                  </div>
                  <button
                    onClick={() => onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail })}
                    className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded text-[10px] font-medium transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
