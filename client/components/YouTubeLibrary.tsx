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
  inRoom?: boolean;
}

export default function YouTubeLibrary({ onAddToQueue, inRoom = true }: YouTubeLibraryProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [likedVideos, setLikedVideos] = useState<YouTubeVideo[]>([]);
  const [view, setView] = useState<string>("home");
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
    if (user && view === "home" && playlists.length === 0) {
      setLoadingPlaylists(true);
      fetchPlaylists(50)
        .then((data) => setPlaylists(data.playlists || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoadingPlaylists(false));
    }
  }, [user, view]);

  useEffect(() => {
    if (user && (view === "liked" || view === "home") && likedVideos.length === 0) {
      setLoadingLiked(true);
      fetchLikedVideos(50)
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
      const data = await fetchPlaylistVideos(playlist.id, 50);
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
    setView("home");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-card rounded-lg animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-40 h-48 bg-card rounded-xl animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-card to-card/50 border border-card-border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.837A2.25 2.25 0 0016.5 2.625l-1.32.377a1.803 1.803 0 01-.99-3.467L17.25.75M4.5 12h15" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Your Music Library</h3>
        <p className="text-sm text-muted mb-5 max-w-md mx-auto">
          Sign in with your Google account to access your YouTube playlists and liked videos.
          Browse, pick, and add songs to your room.
        </p>
        <button
          onClick={redirectToGoogleLogin}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-6 rounded-xl transition-colors text-sm border border-gray-300 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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

  const showBackButton = view === "playlist-detail" || view === "liked";

  return (
    <div className="space-y-6">
      {showBackButton && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView("home");
              setSelectedPlaylist(null);
              setError("");
            }}
            className="w-8 h-8 rounded-full bg-card border border-card-border flex items-center justify-center hover:bg-card-border transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold">{selectedPlaylist?.title || "Liked Videos"}</h2>
        </div>
      )}

      {view === "home" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Your Library</h2>
              <p className="text-xs text-muted mt-0.5">{playlists.length} playlists, {likedVideos.length} liked videos</p>
            </div>
            <div className="flex items-center gap-2">
              {user.picture && (
                <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {!inRoom && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-primary">
                Create or join a room to start adding songs from your library
              </p>
            </div>
          )}

          {playlists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted">Playlists</h3>
              </div>
              {loadingPlaylists ? (
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-40 h-48 bg-card rounded-xl animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl)}
                      className="w-40 shrink-0 bg-card border border-card-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
                    >
                      <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <svg className="w-10 h-10 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.837A2.25 2.25 0 0016.5 2.625l-1.32.377a1.803 1.803 0 01-.99-3.467L17.25.75M4.5 12h15" />
                          </svg>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium truncate">{pl.title}</p>
                        <p className="text-[10px] text-muted mt-0.5">{pl.videoCount} videos</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {likedVideos.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted">Liked Videos</h3>
                <button
                  onClick={() => setView("liked")}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  See all
                </button>
              </div>
              {loadingLiked ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {likedVideos.slice(0, 6).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-2 hover:border-primary/50 transition-all group"
                    >
                      <img src={v.thumbnail} alt="" className="w-14 h-10 object-cover rounded-lg shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{v.title}</p>
                      </div>
                      <button
                        onClick={() => onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail })}
                        className="bg-primary hover:bg-primary-hover text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 text-sm font-bold shadow-lg shadow-primary/25"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {playlists.length === 0 && likedVideos.length === 0 && !loadingPlaylists && !loadingLiked && (
            <div className="text-center py-12 text-muted">
              <p className="text-sm">No playlists or liked videos found</p>
            </div>
          )}
        </>
      )}

      {view === "liked" && (
        <>
          {loadingLiked ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : likedVideos.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p className="text-sm">No liked videos found</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => handleAddAll(likedVideos)}
                  className="text-xs bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/25"
                >
                  Add all to queue
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {likedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-2 hover:border-primary/50 transition-all group"
                  >
                    <img src={v.thumbnail} alt="" className="w-14 h-10 object-cover rounded-lg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{v.title}</p>
                    </div>
                    <button
                      onClick={() => onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail })}
                      className="bg-primary hover:bg-primary-hover text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 text-sm font-bold shadow-lg shadow-primary/25"
                    >
                      +
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedPlaylist.thumbnail && (
                <img src={selectedPlaylist.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover shadow-lg" />
              )}
              <div>
                <p className="text-xs text-muted">{selectedPlaylist.videoCount} videos</p>
              </div>
            </div>
            {playlistVideos.length > 0 && (
              <button
                onClick={() => handleAddAll(playlistVideos)}
                className="text-xs bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/25"
              >
                Add all
              </button>
            )}
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {loadingPlaylistDetail ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : playlistVideos.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p className="text-sm">No videos in this playlist</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {playlistVideos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-2 hover:border-primary/50 transition-all group"
                >
                  <img src={v.thumbnail} alt="" className="w-14 h-10 object-cover rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{v.title}</p>
                  </div>
                  <button
                    onClick={() => onAddToQueue({ id: v.id, title: v.title, thumbnail: v.thumbnail })}
                    className="bg-primary hover:bg-primary-hover text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 text-sm font-bold shadow-lg shadow-primary/25"
                  >
                    +
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
