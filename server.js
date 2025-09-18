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
    const roomId = STATIC_ROOM_ID || data.roomId || uuidv4();
    devices.set(socket.id, { type: 'monitor', roomId, socket });
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { monitor: socket.id, viewers: [] });
    } else {
      rooms.get(roomId).monitor = socket.id;
    }
    
    socket.join(roomId);
    socket.emit('monitor-registered', { roomId });
    console.log(`Monitor registered with room ID: ${roomId}`);
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
    room.viewers.push(socket.id);
    
    socket.join(roomId);
    socket.emit('viewer-registered', { roomId });
    
    // Notify monitor that viewer has joined
    if (room.monitor) {
      io.to(room.monitor).emit('viewer-joined', { viewerId: socket.id });
    }
    
    console.log(`Viewer registered for room ID: ${roomId}`);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    const device = devices.get(socket.id);
    if (device && device.type === 'monitor') {
      // Forward offer to all viewers in the room
      const room = rooms.get(device.roomId);
      if (room) {
        room.viewers.forEach(viewerId => {
          io.to(viewerId).emit('offer', {
            offer: data.offer,
            from: socket.id
          });
        });
      }
    }
  });

  socket.on('answer', (data) => {
    const device = devices.get(socket.id);
    if (device && device.type === 'viewer') {
      // Forward answer to monitor
      const room = rooms.get(device.roomId);
      if (room && room.monitor) {
        io.to(room.monitor).emit('answer', {
          answer: data.answer,
          from: socket.id
        });
      }
    }
  });

  socket.on('ice-candidate', (data) => {
    const device = devices.get(socket.id);
    if (device) {
      const room = rooms.get(device.roomId);
      if (room) {
        // Forward ICE candidate to all other devices in the room
        socket.to(device.roomId).emit('ice-candidate', {
          candidate: data.candidate,
          from: socket.id
        });
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
          // Notify all viewers that monitor disconnected
          room.viewers.forEach(viewerId => {
            io.to(viewerId).emit('monitor-disconnected');
          });
          room.monitor = null;
        } else if (device.type === 'viewer') {
          // Remove viewer from room
          room.viewers = room.viewers.filter(id => id !== socket.id);
          // Notify monitor that viewer left
          if (room.monitor) {
            io.to(room.monitor).emit('viewer-left', { viewerId: socket.id });
          }
        }
        
        // Clean up empty rooms
        if (!room.monitor && room.viewers.length === 0) {
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