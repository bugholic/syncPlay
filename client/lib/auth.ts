const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/auth/me`, { credentials: "include" });
    const data = await res.json();
    if (data.authenticated && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export function redirectToGoogleLogin() {
  window.location.href = `${SERVER_URL}/api/auth/google`;
}

export async function logout(): Promise<void> {
  await fetch(`${SERVER_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
}

export async function fetchPlaylists(maxResults?: number): Promise<{ playlists: YouTubePlaylist[]; nextPageToken: string | null }> {
  const params = new URLSearchParams();
  if (maxResults) params.set("maxResults", String(maxResults));
  const res = await fetch(`${SERVER_URL}/api/youtube/playlists?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch playlists");
  return res.json();
}

export async function fetchPlaylistVideos(playlistId: string, maxResults?: number, pageToken?: string): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  const params = new URLSearchParams();
  if (maxResults) params.set("maxResults", String(maxResults));
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${SERVER_URL}/api/youtube/playlists/${playlistId}/videos?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch playlist videos");
  return res.json();
}

export async function fetchLikedVideos(maxResults?: number, pageToken?: string): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  const params = new URLSearchParams();
  if (maxResults) params.set("maxResults", String(maxResults));
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${SERVER_URL}/api/youtube/liked?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch liked videos");
  return res.json();
}
