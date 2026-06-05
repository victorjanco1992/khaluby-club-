export const performDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const raffle = await prisma.raffle.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            user: { select: { id: true, name: true, dni: true, phone: true } },
          },
        },
      },
    });

    if (!raffle) return res.status(404).json({ error: 'Sorteo no encontrado' });
    if (raffle.entries.length === 0) return res.status(400).json({ error: 'No hay participantes' });
    if (raffle.status === 'FINISHED') return res.status(400).json({ error: 'Sorteo ya finalizado' });

    // Elegir ganador inmediatamente
    const winnerEntry = raffle.entries[Math.floor(Math.random() * raffle.entries.length)];
    const losers = raffle.entries.filter(e => e.userId !== winnerEntry.userId);
    const uniqueLoserIds = [...new Set(losers.map(e => e.userId))];

    // Guardar resultado en DB
    await prisma.raffle.update({
      where: { id },
      data: {
        status: 'FINISHED',
        winnerId: winnerEntry.userId,
        winnerNumber: winnerEntry.number,
      },
    });

    const winner = {
      userId: winnerEntry.userId,
      number: winnerEntry.number,
      name: winnerEntry.user.name,
      dni: winnerEntry.user.dni,
      phone: winnerEntry.user.phone,
      prize: raffle.prize,
      prizeImage: raffle.prizeImage,
      raffleTitle: raffle.title,
      raffleId: id,
      date: new Date().toISOString(),
    };

    // Emitir por socket (funciona en local, en Vercel es best-effort con polling)
    try {
      emitRaffleEvent(io, id, 'raffle:winner', {
        winner: { ...winner, dni: winner.dni.slice(0, -3) + '***' },
      });
      io.emit('raffle:finished', {
        raffleId: id,
        winner: { name: winner.name, number: winner.number, prize: winner.prize, prizeImage: winner.prizeImage },
      });
      io.to(`user:${winnerEntry.userId}`).emit('user:won', {
        number: winner.number,
        prize: raffle.prize,
        prizeImage: raffle.prizeImage,
        raffleTitle: raffle.title,
        raffleId: id,
        date: winner.date,
      });
      uniqueLoserIds.forEach(userId => {
        io.to(`user:${userId}`).emit('user:lost', {
          raffleTitle: raffle.title,
          prize: raffle.prize,
          prizeImage: raffle.prizeImage,
          raffleId: id,
        });
      });
    } catch (socketErr) {
      console.warn('Socket emit error:', socketErr.message);
    }

    // Guardar notificaciones persistentes
    await prisma.notification.create({
      data: {
        userId: winnerEntry.userId,
        type: 'WINNER',
        title: '🏆 ¡Ganaste el sorteo!',
        message: `Tu número #${winnerEntry.number} ganó "${raffle.title}". Premio: ${raffle.prize}`,
        data: {
          number: winnerEntry.number,
          prize: raffle.prize,
          prizeImage: raffle.prizeImage,
          raffleTitle: raffle.title,
          raffleId: id,
          date: winner.date,
        },
        read: false,
      },
    });

    if (uniqueLoserIds.length > 0) {
      await prisma.notification.createMany({
        data: uniqueLoserIds.map(userId => ({
          userId,
          type: 'RAFFLE_RESULT',
          title: '🎰 Resultado del sorteo',
          message: `El sorteo "${raffle.title}" ya tiene ganador. ¡Suerte la próxima!`,
          data: {
            raffleTitle: raffle.title,
            prize: raffle.prize,
            prizeImage: raffle.prizeImage,
            raffleId: id,
          },
          read: false,
        })),
        skipDuplicates: true,
      });
    }

    // Responder con el ganador completo — el frontend maneja la animación
    res.json({ message: '¡Sorteo realizado!', winner });
  } catch (error) { next(error); }
};
