const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: '*', // For development. Should be restricted in production.
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      }
    });

    // Authentication Middleware for Sockets
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Attach user payload to socket
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`[Socket Connected] User: ${socket.user.id}, Org: ${socket.user.orgId}`);

      // Automatically join a room for their organization
      socket.join(socket.user.orgId);

      socket.on('disconnect', () => {
        console.log(`[Socket Disconnected] User: ${socket.user.id}`);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
