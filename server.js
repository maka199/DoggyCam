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

// Store connected devices
const devices = new Map();
// rooms: Map<roomId, { monitors: Set<socketId>, viewers: Set<socketId> }>
const rooms = new Map();

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

// Static Room ID support
const STATIC_ROOM_ID = process.env.ROOM_ID || null;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A device connected:', socket.id);

  // Register device as monitor (home device with camera)
  socket.on('register-monitor', (data) => {
    // Use static room ID if set, otherwise from data, otherwise generate
    let roomId;
    if (STATIC_ROOM_ID) {
      roomId = STATIC_ROOM_ID;
    } else if (data.roomId) {
      roomId = data.roomId;
    } else {
      // Always allow a new room if none is specified
      roomId = uuidv4();
    }
    devices.set(socket.id, { type: 'monitor', roomId, socket });

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { monitor: null, viewers: new Set() });
    }
    const room = rooms.get(roomId);
    if (room.monitor && (STATIC_ROOM_ID || data.roomId)) {
      // Only block if a monitor is already present for a specific roomId
      socket.emit('error', { message: 'A monitor is already connected to this room.' });
      return;
    }
    room.monitor = socket.id;

    socket.join(roomId);
    // Skicka tillbaka roomId och monitorId (socket.id)
    socket.emit('monitor-registered', { roomId, monitorId: socket.id });
    // Uppdatera viewers i rummet om tillgänglig monitor
    io.to(roomId).emit('monitors-updated', { monitors: [room.monitor] });
    console.log(`Monitor registered with room ID: ${roomId}, monitorId: ${socket.id}`);
  });

  // Register device as viewer (remote device)
  socket.on('register-viewer', (data) => {
    const { roomId } = data;
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    devices.set(socket.id, { type: 'viewer', roomId, socket });
    const room = rooms.get(roomId);
    room.viewers.add(socket.id);

    socket.join(roomId);
    // Skicka tillbaka roomId och monitor (om någon finns)
    socket.emit('viewer-registered', { roomId, monitors: room.monitor ? [room.monitor] : [] });
    // Skicka uppdaterad monitor-lista till alla viewers
    io.to(roomId).emit('monitors-updated', { monitors: room.monitor ? [room.monitor] : [] });
    console.log(`Viewer registered for room ID: ${roomId}`);
  });

  // Handle WebRTC signaling
  // Monitor skickar offer till EN viewer (eller flera, men explicit)
  socket.on('offer', (data) => {
    const device = devices.get(socket.id);
    if (device && device.type === 'monitor') {
      // data: { offer, to } där to är viewerId
      const { offer, to } = data;
      if (to) {
        io.to(to).emit('offer', { offer, from: socket.id });
      }
    }
  });

  socket.on('answer', (data) => {
    const device = devices.get(socket.id);
    if (device && device.type === 'viewer') {
      // data: { answer, to } där to är monitorId
      const { answer, to } = data;
      if (to) {
        io.to(to).emit('answer', { answer, from: socket.id });
      }
    }
  });

  socket.on('ice-candidate', (data) => {
    const device = devices.get(socket.id);
    if (device) {
      // data: { candidate, to }
      const { candidate, to } = data;
      if (to) {
        io.to(to).emit('ice-candidate', { candidate, from: socket.id });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
    const device = devices.get(socket.id);
    if (device) {
      const room = rooms.get(device.roomId);
      if (room) {
        if (device.type === 'monitor') {
          room.monitor = null;
          // Inform viewers att monitor försvann
          io.to(device.roomId).emit('monitors-updated', { monitors: [] });
        } else if (device.type === 'viewer') {
          room.viewers.delete(socket.id);
        }
        // Clean up empty rooms
        if (!room.monitor && room.viewers.size === 0) {
          rooms.delete(device.roomId);
        }
      }
    }
    devices.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`DoggyCam server running on port ${PORT}`);
  console.log(`Monitor device: http://localhost:${PORT}/monitor`);
  console.log(`Viewer device: http://localhost:${PORT}/view`);
});