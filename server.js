const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
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
      rooms[roomId] = [];
      console.log('Room created:', roomId);
    }
    
    if (rooms[roomId].length >= 2) {
      socket.emit('room_full');
      return;
    }
    
    socket.join(roomId);
    rooms[roomId].push(socket.id);
    console.log('User joined room:', roomId, 'Total users:', rooms[roomId].length);
    
    io.to(roomId).emit('user_joined');
  });
  
  socket.on('send_message', ({ roomId, message }) => {
    console.log('Message sent to room:', roomId, 'Message:', message);
    socket.to(roomId).emit('receive_message', message);
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
      const userIndex = rooms[roomId].indexOf(socket.id);
      if (userIndex !== -1) {
        rooms[roomId].splice(userIndex, 1);
        socket.to(roomId).emit('user_left');
        console.log('User left room:', roomId);
        
        if (rooms[roomId].length === 0) {
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
  console.log('Server running on port 5000');
});
