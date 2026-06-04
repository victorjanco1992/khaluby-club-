export const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Conectado: ${socket.id}`);

    socket.on('join:raffle', (raffleId) => {
      socket.join(`raffle:${raffleId}`);
    });

    socket.on('leave:raffle', (raffleId) => {
      socket.leave(`raffle:${raffleId}`);
    });

    socket.on('join:admin', () => {
      socket.join('admin');
    });

    // Sala personal por usuario — para notificación de ganador
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Desconectado: ${socket.id}`);
    });
  });
};

export const emitRaffleEvent = (io, raffleId, event, data) => {
  io.to(`raffle:${raffleId}`).emit(event, data);
  io.to('admin').emit(event, { raffleId, ...data });
  io.emit(event, { raffleId, ...data });
};