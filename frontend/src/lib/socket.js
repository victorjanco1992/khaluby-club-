import { io } from 'socket.io-client';

let socket = null;
let registeredUserId = null;

const isProduction = import.meta.env.PROD;

export const getSocket = (userId = null) => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      // En producción solo polling, en local websocket
      transports: isProduction ? ['polling'] : ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket conectado');
      if (registeredUserId) {
        socket.emit('join:user', registeredUserId);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });
  }

  if (userId && userId !== registeredUserId) {
    registeredUserId = userId;
    socket.emit('join:user', userId);
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    registeredUserId = null;
  }
};