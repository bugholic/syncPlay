"use client";

const STORAGE_KEYS = {
  USERNAME: "syncplay_username",
  API_KEY: "syncplay_apiKey",
  RECENT: "syncplay_recent",
} as const;

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || "";
}

export function setUsername(name: string) {
  localStorage.setItem(STORAGE_KEYS.USERNAME, name);
}

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

export function setApiKey(key: string) {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}

export interface RecentRoom {
  id: string;
  name: string;
  lastJoined: number;
}

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT) || "[]");
  } catch {
    return [];
  }
}

export function addRecentRoom(room: RecentRoom) {
  const rooms = getRecentRooms().filter((r) => r.id !== room.id);
  rooms.unshift(room);
  if (rooms.length > 10) rooms.pop();
  localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(rooms));
}

export function removeRecentRoom(id: string) {
  const rooms = getRecentRooms().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(rooms));
}
