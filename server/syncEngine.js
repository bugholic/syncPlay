function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    isPublic: room.isPublic,
    hasPassword: !!room.password,
    host: room.host,
    hasApiKey: !!room.apiKey,
    currentVideo: room.currentVideo,
    currentTime: room.currentTime,
    isPlaying: room.isPlaying,
    queue: serializeQueue(room.queue),
    users: serializeUsers(room.users),
    messages: room.messages.slice(-50),
  };
}

function serializeUsers(users) {
  const arr = [];
  for (const [, user] of users) {
    arr.push(user.name);
  }
  return arr;
}

function serializeQueue(queue) {
  return queue.map((item) => ({
    id: item.id,
    title: item.title,
    thumbnail: item.thumbnail,
    addedBy: item.addedBy,
    queueId: item.queueId,
  }));
}

function setupSyncEngine(io, roomManager) {
  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    socket.on('create-room', ({ name, isPublic, password, apiKey, username }, callback) => {
      currentUser = username;
      const room = roomManager.createRoom({
        name,
        isPublic,
        password,
        apiKey,
        hostId: socket.id,
        hostName: username,
      });
      currentRoomId = room.id;
      socket.join(room.id);
      callback({ success: true, roomId: room.id });
      io.to(room.id).emit('room-state', serializeRoom(room));
      console.log(`Room "${name}" (${room.id}) created by ${username}`);
    });

    socket.on('join-room', ({ roomId, password, username }, callback) => {
      currentUser = username;
      const result = roomManager.joinRoom(roomId, socket.id, username, password);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      currentRoomId = roomId;
      socket.join(roomId);
      callback({ success: true, room: serializeRoom(result.room) });
      socket.to(roomId).emit('user-joined', {
        user: username,
        users: serializeUsers(result.room.users),
      });
      console.log(`${username} joined room ${roomId}`);
    });

    socket.on('leave-room', () => {
      handleLeave();
    });

    socket.on('play', ({ roomId, videoId, title, thumbnail, time }) => {
      const video = { id: videoId, title, thumbnail };
      roomManager.setPlayback(roomId, { video, time, isPlaying: true });
      socket.to(roomId).emit('play', { videoId, title, thumbnail, time });
    });

    socket.on('pause', ({ roomId, time }) => {
      roomManager.setPlayback(roomId, { time, isPlaying: false });
      socket.to(roomId).emit('pause', { time });
    });

    socket.on('seek', ({ roomId, time }) => {
      roomManager.setPlayback(roomId, { time });
      socket.to(roomId).emit('seek', { time });
    });

    socket.on('skip', ({ roomId, videoId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      // Every client in the room fires its own video-end event around the same
      // time. Only honor the first skip for a given "current" video so N
      // connected clients don't pop N songs off the queue for one song ending.
      if (videoId !== undefined && room.currentVideo?.id !== videoId) return;
      const nextVideo = roomManager.getNextFromQueue(roomId);
      if (nextVideo) {
        const video = { id: nextVideo.id, title: nextVideo.title, thumbnail: nextVideo.thumbnail };
        roomManager.setPlayback(roomId, { video, time: 0, isPlaying: true });
        const room = roomManager.getRoom(roomId);
        io.to(roomId).emit('play', {
          videoId: nextVideo.id,
          title: nextVideo.title,
          thumbnail: nextVideo.thumbnail,
          time: 0,
          queue: serializeQueue(room.queue),
        });
      } else {
        roomManager.setPlayback(roomId, { video: null, time: 0, isPlaying: false });
        io.to(roomId).emit('video-ended');
      }
    });

    socket.on('add-to-queue', ({ roomId, video }) => {
      const queue = roomManager.addToQueue(roomId, video, currentUser);
      if (queue) {
        io.to(roomId).emit('queue-updated', serializeQueue(queue));
      }
    });

    socket.on('remove-from-queue', ({ roomId, queueId }) => {
      const queue = roomManager.removeFromQueue(roomId, queueId);
      if (queue) {
        io.to(roomId).emit('queue-updated', serializeQueue(queue));
      }
    });

    socket.on('reorder-queue', ({ roomId, fromIndex, toIndex }) => {
      const queue = roomManager.reorderQueue(roomId, fromIndex, toIndex);
      if (queue) {
        io.to(roomId).emit('queue-updated', serializeQueue(queue));
      }
    });

    socket.on('chat-message', ({ roomId, user, text }) => {
      const message = roomManager.addMessage(roomId, user, text);
      if (message) {
        // Excludes the sender: their own message is already appended
        // optimistically on the client, so echoing it back would duplicate it.
        socket.to(roomId).emit('chat-message', message);
      }
    });

    socket.on('get-public-rooms', (callback) => {
      callback(roomManager.getPublicRooms());
    });

    socket.on('disconnect', () => {
      handleLeave();
    });

    function handleLeave() {
      if (!currentRoomId) return;
      const result = roomManager.leaveRoom(currentRoomId, socket.id);
      socket.leave(currentRoomId);
      if (result && !result.deleted && result.room) {
        socket.to(currentRoomId).emit('user-left', {
          user: currentUser,
          users: serializeUsers(result.room.users),
        });
      }
      console.log(`${currentUser} left room ${currentRoomId}`);
      currentRoomId = null;
      currentUser = null;
    }
  });
}

module.exports = setupSyncEngine;
