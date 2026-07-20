const { v4: uuidv4 } = require('uuid');

const SEARCH_RATE_LIMIT = 15; // max searches per room...
const SEARCH_RATE_WINDOW_MS = 30000; // ...per this window

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom({ name, isPublic, password, apiKey, hostId, hostName }) {
    const id = uuidv4().slice(0, 8);
    const room = {
      id,
      name,
      isPublic,
      password: password || null,
      apiKey,
      host: hostId,
      currentVideo: null,
      currentTime: 0,
      isPlaying: false,
      queue: [],
      users: new Map(),
      messages: [],
      createdAt: Date.now(),
    };
    room.users.set(hostId, { name: hostName });
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id) {
    return this.rooms.get(id) || null;
  }

  deleteRoom(id) {
    this.rooms.delete(id);
  }

  joinRoom(id, socketId, username, password) {
    const room = this.rooms.get(id);
    if (!room) return { error: 'Room not found' };
    if (room.password && room.password !== password) return { error: 'Incorrect password' };
    if (room.users.size >= 50) return { error: 'Room is full (max 50 users)' };
    room.users.set(socketId, { name: username });
    return { room };
  }

  leaveRoom(id, socketId) {
    const room = this.rooms.get(id);
    if (!room) return null;
    const user = room.users.get(socketId);
    room.users.delete(socketId);
    if (room.users.size === 0) {
      if (room._emptyTimer) clearTimeout(room._emptyTimer);
      room._emptyTimer = setTimeout(() => {
        if (this.rooms.has(id) && this.rooms.get(id).users.size === 0) {
          this.deleteRoom(id);
        }
      }, 30000);
      return { room: null, deleted: false, user };
    }
    if (room.host === socketId) {
      const newHost = room.users.keys().next().value;
      room.host = newHost;
    }
    return { room, deleted: false, user };
  }

  getPublicRooms() {
    const publicRooms = [];
    for (const [id, room] of this.rooms) {
      if (room.isPublic) {
        publicRooms.push({
          id: room.id,
          name: room.name,
          userCount: room.users.size,
          currentVideo: room.currentVideo,
        });
      }
    }
    return publicRooms;
  }

  addMessage(id, user, text) {
    const room = this.rooms.get(id);
    if (!room) return null;
    const message = { user, text, timestamp: Date.now() };
    room.messages.push(message);
    if (room.messages.length > 100) room.messages.shift();
    return message;
  }

  addToQueue(id, video, addedBy) {
    const room = this.rooms.get(id);
    if (!room) return null;
    const queueItem = { ...video, addedBy, queueId: uuidv4().slice(0, 8) };
    room.queue.push(queueItem);
    return room.queue;
  }

  removeFromQueue(id, queueId) {
    const room = this.rooms.get(id);
    if (!room) return null;
    room.queue = room.queue.filter((item) => item.queueId !== queueId);
    return room.queue;
  }

  reorderQueue(id, fromIndex, toIndex) {
    const room = this.rooms.get(id);
    if (!room) return null;
    const [item] = room.queue.splice(fromIndex, 1);
    room.queue.splice(toIndex, 0, item);
    return room.queue;
  }

  getNextFromQueue(id) {
    const room = this.rooms.get(id);
    if (!room || room.queue.length === 0) return null;
    return room.queue.shift();
  }

  canSearch(id) {
    const room = this.rooms.get(id);
    if (!room) return false;
    const now = Date.now();
    if (!room._searchLog) room._searchLog = [];
    room._searchLog = room._searchLog.filter((ts) => now - ts < SEARCH_RATE_WINDOW_MS);
    if (room._searchLog.length >= SEARCH_RATE_LIMIT) return false;
    room._searchLog.push(now);
    return true;
  }

  setPlayback(id, { video, time, isPlaying }) {
    const room = this.rooms.get(id);
    if (!room) return null;
    if (video !== undefined) room.currentVideo = video;
    if (time !== undefined) room.currentTime = time;
    if (isPlaying !== undefined) room.isPlaying = isPlaying;
    return room;
  }
}

module.exports = RoomManager;
