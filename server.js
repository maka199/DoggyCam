const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store monitor and viewer per room
const rooms = new Map(); // roomId -> { monitor: socketId, viewer: socketId }

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

const STATIC_ROOM_ID = process.env.ROOM_ID || null;

io.on('connection', (socket) => {
  console.log('A device connected:', socket.id);

  socket.on('register-monitor', (data) => {
    const roomId = STATIC_ROOM_ID || data.roomId || uuidv4();
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { monitor: null, viewer: null });
    }
    const room = rooms.get(roomId);
    if (room.monitor) {
      socket.emit('error', { message: 'A monitor is already connected to this room.' });
      return;
    }
    room.monitor = socket.id;
    socket.join(roomId);
    socket.emit('monitor-registered', { roomId, monitorId: socket.id });
    console.log(`Monitor registered with room ID: ${roomId}, monitorId: ${socket.id}`);
  });

  socket.on('register-viewer', (data) => {
    const { roomId } = data;
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    const room = rooms.get(roomId);
    if (room.viewer) {
      socket.emit('error', { message: 'A viewer is already connected to this room.' });
      return;
    }
    room.viewer = socket.id;
    socket.join(roomId);
    socket.emit('viewer-registered', { roomId, monitorId: room.monitor });
    console.log(`Viewer registered for room ID: ${roomId}`);
  });

  // WebRTC signaling: always between monitor and viewer in the same room
  socket.on('offer', (data) => {
    const { roomId, offer } = data;
    const room = rooms.get(roomId);
    if (room && room.viewer) {
      io.to(room.viewer).emit('offer', { offer, from: room.monitor });
    }
  });

  socket.on('answer', (data) => {
    const { roomId, answer } = data;
    const room = rooms.get(roomId);
    if (room && room.monitor) {
      io.to(room.monitor).emit('answer', { answer, from: room.viewer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { roomId, candidate, sender } = data;
    const room = rooms.get(roomId);
    if (!room) return;
    if (sender === 'monitor' && room.viewer) {
      io.to(room.viewer).emit('ice-candidate', { candidate, from: room.monitor });
    } else if (sender === 'viewer' && room.monitor) {
      io.to(room.monitor).emit('ice-candidate', { candidate, from: room.viewer });
    }
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.monitor === socket.id) {
        room.monitor = null;
        if (!room.viewer) rooms.delete(roomId);
      }
      if (room.viewer === socket.id) {
        room.viewer = null;
        if (!room.monitor) rooms.delete(roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`DoggyCam server running on port ${PORT}`);
  console.log(`Monitor device: http://localhost:${PORT}/monitor`);
  console.log(`Viewer device: http://localhost:${PORT}/view`);
});