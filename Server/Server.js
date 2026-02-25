const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const connectDB = require('./Config/db.js');
const { validateEnv } = require('./Config/env.js');
const User = require('./Models/User');

validateEnv();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const onlineUsers = new Map(); // userId -> Set(socketId)
const postViewers = new Map(); // postKey -> Set(userId)
app.locals.io = io;
app.locals.onlineUsers = onlineUsers;
app.locals.postViewers = postViewers;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Routes
app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/posts', require('./Controllers/postControllers.js'));
app.use('/api/upload', require('./Routes/UploadRoutes'));
app.use('/api/chat', require('./Routes/chatRoutes'));
app.use('/api/users', require('./Routes/userRoutes'));
app.use('/api/profile', require('./Routes/MyprofileRoutes'));
app.use('/api/admin', require('./Routes/adminRoutes'));

const emitPresence = (userId, status) => {
  io.emit('presence:update', {
    userId: String(userId),
    status,
    lastSeenAt: status === 'offline' ? new Date().toISOString() : null,
  });
};

const addOnlineUser = (userId, socketId) => {
  const key = String(userId);
  if (!onlineUsers.has(key)) {
    onlineUsers.set(key, new Set());
  }
  onlineUsers.get(key).add(socketId);
  emitPresence(key, 'online');
};

const removeOnlineUser = async (userId, socketId) => {
  const key = String(userId);
  if (!onlineUsers.has(key)) return;

  const sockets = onlineUsers.get(key);
  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(key);
    await User.findByIdAndUpdate(userId, { lastSeenAt: new Date() }).catch(() => null);
    emitPresence(key, 'offline');
  }
};

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    socket.user = {
      id: String(decoded.id),
      email: decoded.email,
    };
    return next();
  } catch (error) {
    return next(new Error('Invalid socket token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);
  addOnlineUser(userId, socket.id);
  console.log('User connected:', userId, socket.id);

  socket.on('conversation:join', (conversationId) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('post:join', ({ postType, postId }) => {
    if (!postType || !postId) return;
    const key = `${postType}:${postId}`;
    socket.join(`post:${key}`);
    if (!postViewers.has(key)) postViewers.set(key, new Set());
    postViewers.get(key).add(String(userId));
    io.to(`post:${key}`).emit('post:readers-count', {
      postType,
      postId,
      readers: postViewers.get(key).size,
    });
  });

  socket.on('post:leave', ({ postType, postId }) => {
    if (!postType || !postId) return;
    const key = `${postType}:${postId}`;
    socket.leave(`post:${key}`);
    if (!postViewers.has(key)) return;
    postViewers.get(key).delete(String(userId));
    if (postViewers.get(key).size === 0) postViewers.delete(key);
    io.to(`post:${key}`).emit('post:readers-count', {
      postType,
      postId,
      readers: postViewers.get(key)?.size || 0,
    });
  });

  socket.on('conversation:leave', (conversationId) => {
    if (!conversationId) return;
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('chat:typing', ({ conversationId, username }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('chat:typing', {
      conversationId,
      userId,
      username,
    });
  });

  socket.on('chat:stop-typing', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('chat:stop-typing', {
      conversationId,
      userId,
    });
  });

  socket.on('disconnect', async () => {
    for (const [key, readers] of postViewers.entries()) {
      if (readers.has(String(userId))) {
        readers.delete(String(userId));
        const [postType, postId] = key.split(':');
        io.to(`post:${key}`).emit('post:readers-count', {
          postType,
          postId,
          readers: readers.size,
        });
        if (readers.size === 0) postViewers.delete(key);
      }
    }
    await removeOnlineUser(userId, socket.id);
    console.log('User disconnected:', userId, socket.id);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
