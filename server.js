const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('join_room', ({ roomId }) => {
    console.log('Join room request for:', roomId, 'from socket:', socket.id);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: [],
        ghostMode: false,
        ghostTimer: null
      };
      console.log('Room created:', roomId);
    }
    
    if (rooms[roomId].users.length >= 2) {
      socket.emit('room_full');
      return;
    }
    
    socket.join(roomId);
    rooms[roomId].users.push(socket.id);
    console.log('User joined room:', roomId, 'Total users:', rooms[roomId].users.length);
    
    io.to(roomId).emit('user_joined');
  });
  
  socket.on('send_message', ({ roomId, message }) => {
    console.log('Message sent to room:', roomId, 'Message:', message);
    
    // Send plain text message
    socket.to(roomId).emit('receive_message', message);
  });
  
  socket.on('toggle_ghost_mode', ({ roomId, enabled, timer }) => {
    console.log('Toggle ghost mode:', roomId, enabled, timer);
    const room = rooms[roomId];
    
    if (room) {
      room.ghostMode = enabled;
      room.ghostTimer = timer;
      console.log('Room updated:', room);
      
      // Notify all users in the room
      io.to(roomId).emit('ghost_mode_updated', {
        enabled,
        timer
      });
      console.log('Ghost mode update sent to room:', roomId);
    } else {
      console.log('Room not found:', roomId);
    }
  });
  
  socket.on('clear_chat', ({ roomId }) => {
    console.log('Clear chat request for room:', roomId);
    // Notify all users in the room to clear their chat
    io.to(roomId).emit('clear_chat');
    console.log('Clear chat sent to room:', roomId);
  });
  
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('typing');
  });
  
  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('stop_typing');
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
    
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.indexOf(socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        socket.to(roomId).emit('user_left');
        console.log('User left room:', roomId);
        
        if (room.users.length === 0) {
          delete rooms[roomId];
          console.log('Room deleted:', roomId);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
