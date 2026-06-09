import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { io } from '../index.js';
import { emitRaffleEvent } from '../lib/socket.js';

const raffleSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  prize: z.string().min(3),
  prizeImage: z.string().url().optional().or(z.literal('')),
  drawDate: z.string().optional(),
  isPublic: z.boolean().default(true),
});

export const getRaffles = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (status) where.status = status;
    if (req.user?.role !== 'ADMIN') where.isPublic = true;

    const [raffles, total] = await Promise.all([
      prisma.raffle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: { _count: { select: { entries: true } } },
      }),
      prisma.raffle.count({ where }),
    ]);

    res.json({ raffles, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
};

export const getRaffle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    const raffle = await prisma.raffle.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                ...(isAdmin ? { dni: true } : {}),
              },
            },
          },
          orderBy: { number: 'asc' },
        },
        _count: { select: { entries: true } },
      },
    });

    if (!raffle) return res.status(404).json({ error: 'Sorteo no encontrado' });
    res.json({ raffle });
  } catch (error) { next(error); }
};

export const getLastRaffle = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';

    const raffle = await prisma.raffle.findFirst({
      where: { status: 'FINISHED', isPublic: true },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    });

    if (!raffle) return res.status(404).json({ error: 'No hay sorteos finalizados' });

    let winnerEntry = null;
    if (raffle.winnerNumber) {
      const entry = await prisma.raffleEntry.findFirst({
        where: { raffleId: raffle.id, number: raffle.winnerNumber },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
              ...(isAdmin ? { dni: true } : {}),
            },
          },
        },
      });

      if (entry) {
        winnerEntry = {
          number: entry.number,
          user: {
            name: entry.user.name,
            phone: isAdmin ? entry.user.phone : undefined,
            ...(isAdmin ? { dni: entry.user.dni } : {}),
          },
        };
      }
    }

    res.json({ raffle, winnerEntry });
  } catch (error) { next(error); }
};

export const getMyWin = async (req, res, next) => {
  try {
    const raffle = await prisma.raffle.findFirst({
      where: { status: 'FINISHED', winnerId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!raffle) return res.json({ win: null });

    res.json({
      win: {
        raffleTitle: raffle.title,
        prize: raffle.prize,
        prizeImage: raffle.prizeImage,
        number: raffle.winnerNumber,
        date: raffle.updatedAt,
      },
    });
  } catch (error) { next(error); }
};

export const createRaffle = async (req, res, next) => {
  try {
    const data = raffleSchema.parse(req.body);
    const raffle = await prisma.raffle.create({
      data: {
        ...data,
        drawDate: data.drawDate ? new Date(data.drawDate) : null,
        prizeImage: data.prizeImage || null,
      },
    });
    res.status(201).json({ raffle, message: 'Sorteo creado' });
  } catch (error) { next(error); }
};

export const updateRaffle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = raffleSchema.partial().parse(req.body);
    const raffle = await prisma.raffle.update({
      where: { id },
      data: {
        ...data,
        drawDate: data.drawDate ? new Date(data.drawDate) : undefined,
        prizeImage: data.prizeImage === '' ? null : data.prizeImage,
      },
    });
    res.json({ raffle, message: 'Sorteo actualizado' });
  } catch (error) { next(error); }
};

export const deleteRaffle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.raffleEntry.deleteMany({ where: { raffleId: id } });
    await prisma.raffle.delete({ where: { id } });
    res.json({ message: 'Sorteo eliminado' });
  } catch (error) { next(error); }
};

export const activateRaffle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.raffle.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'PENDING' } });
    const raffle = await prisma.raffle.update({ where: { id }, data: { status: 'ACTIVE' } });
    io.emit('raffle:activated', { raffle });
    res.json({ raffle, message: 'Sorteo activado' });
  } catch (error) { next(error); }
};

// Paso 1: iniciar sorteo — solo guarda DRAWING y elige ganador
export const startDraw = async (req, res, next) => {
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
    if (raffle.status === 'FINISHED') return res.status(400).json({ error: 'Ya finalizado' });

    // Elegir ganador
    const winnerEntry = raffle.entries[Math.floor(Math.random() * raffle.entries.length)];

    // Guardar en DB como DRAWING con el ganador ya decidido
    // (el ganador está en DB pero no se revela todavía)
    await prisma.raffle.update({
      where: { id },
      data: {
        status: 'DRAWING',
        winnerId: winnerEntry.userId,
        winnerNumber: winnerEntry.number,
      },
    });

    // Guardar broadcast de spinning
    const broadcastData = {
      raffleId: id,
      raffleTitle: raffle.title,
      prize: raffle.prize,
      prizeImage: raffle.prizeImage,
      numbers: raffle.entries.map(e => e.number),
      spinDurationMs: 5000,
    };

    await prisma.raffleBroadcast.create({
      data: { type: 'spinning', data: broadcastData },
    });

    try {
      io.emit('raffle:spinning', broadcastData);
    } catch (e) { console.warn('socket spinning:', e.message); }

    // Responder con el ganador al admin para que lo muestre
    // después de su animación local
    res.json({
      message: 'Sorteo iniciado',
      winner: {
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
      },
    });
  } catch (error) { next(error); }
};

// Paso 2: confirmar ganador — llamado por el admin DESPUÉS de su animación
export const confirmWinner = async (req, res, next) => {
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
    if (!raffle.winnerId) return res.status(400).json({ error: 'No hay ganador definido' });

    const winnerEntry = raffle.entries.find(e => e.userId === raffle.winnerId);
    const losers = raffle.entries.filter(e => e.userId !== raffle.winnerId);
    const uniqueLoserIds = [...new Set(losers.map(e => e.userId))];

    // Ahora sí marcar como FINISHED
    await prisma.raffle.update({
      where: { id },
      data: { status: 'FINISHED' },
    });

    const winner = {
      number: raffle.winnerNumber,
      name: winnerEntry?.user?.name || 'Ganador',
      prize: raffle.prize,
      prizeImage: raffle.prizeImage,
      raffleTitle: raffle.title,
    };

    // Guardar broadcast del ganador
    await prisma.raffleBroadcast.create({
      data: {
        type: 'winner',
        data: { raffleId: id, winner },
      },
    });

    // Emitir por socket
    try {
      io.emit('raffle:winner', { raffleId: id, winner });
      io.emit('raffle:finished', { raffleId: id });
      if (winnerEntry) {
        io.to(`user:${winnerEntry.userId}`).emit('user:won', {
          number: raffle.winnerNumber,
          prize: raffle.prize,
          prizeImage: raffle.prizeImage,
          raffleTitle: raffle.title,
          raffleId: id,
          date: new Date().toISOString(),
        });
      }
      uniqueLoserIds.forEach(userId => {
        io.to(`user:${userId}`).emit('user:lost', {
          raffleTitle: raffle.title,
          prize: raffle.prize,
          raffleId: id,
        });
      });
    } catch (e) { console.warn('socket winner:', e.message); }

    // Notificaciones persistentes
    if (winnerEntry) {
      await prisma.notification.create({
        data: {
          userId: winnerEntry.userId,
          type: 'WINNER',
          title: '🏆 ¡Ganaste el sorteo!',
          message: `Tu número #${raffle.winnerNumber} ganó "${raffle.title}". Premio: ${raffle.prize}`,
          data: {
            number: raffle.winnerNumber,
            prize: raffle.prize,
            prizeImage: raffle.prizeImage,
            raffleTitle: raffle.title,
            raffleId: id,
            date: new Date().toISOString(),
          },
          read: false,
        },
      });
    }

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
            raffleId: id,
          },
          read: false,
        })),
        skipDuplicates: true,
      });
    }

    res.json({ message: '¡Ganador confirmado!', winner });
  } catch (error) { next(error); }
};

/*
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

    // ✅ Paso 1: marcar como DRAWING en DB — los clientes lo detectan por polling
    await prisma.raffle.update({
      where: { id },
      data: { status: 'DRAWING' },
    });

    // ✅ Paso 2: emitir spinning por socket (llega rápido si el socket funciona)
    try {
      io.emit('raffle:spinning', {
        raffleId: id,
        raffleTitle: raffle.title,
        prize: raffle.prize,
        prizeImage: raffle.prizeImage,
        numbers: raffle.entries.map(e => e.number),
        spinDurationMs: 5000,
      });
    } catch (e) { console.warn('socket spinning emit:', e.message); }

    // Elegir ganador
    const winnerEntry = raffle.entries[Math.floor(Math.random() * raffle.entries.length)];
    const losers = raffle.entries.filter(e => e.userId !== winnerEntry.userId);
    const uniqueLoserIds = [...new Set(losers.map(e => e.userId))];

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

    // ✅ Paso 3: guardar FINISHED en DB
    await prisma.raffle.update({
      where: { id },
      data: {
        status: 'FINISHED',
        winnerId: winnerEntry.userId,
        winnerNumber: winnerEntry.number,
      },
    });

    // ✅ Paso 4: emitir ganador por socket
    try {
      io.emit('raffle:winner', {
        raffleId: id,
        winner: {
          number: winner.number,
          name: winner.name,
          prize: raffle.prize,
          prizeImage: raffle.prizeImage,
          raffleTitle: raffle.title,
        },
      });
      io.emit('raffle:finished', { raffleId: id });
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
    } catch (e) { console.warn('socket winner emit:', e.message); }

    // ✅ Paso 5: notificaciones persistentes en DB
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

    res.json({ message: '¡Sorteo realizado!', winner });
  } catch (error) { next(error); }
};*/

export const resetRaffle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.raffleEntry.deleteMany({ where: { raffleId: id } });
    const raffle = await prisma.raffle.update({
      where: { id },
      data: { status: 'PENDING', winnerId: null, winnerNumber: null, totalNumbers: 0 },
    });
    res.json({ raffle, message: 'Participaciones reseteadas' });
  } catch (error) { next(error); }
};

export const getUserRaffleNumbers = async (req, res, next) => {
  try {
    const entries = await prisma.raffleEntry.findMany({
      where: { userId: req.user.id },
      include: { raffle: { select: { id: true, title: true, status: true, prize: true, prizeImage: true } } },
      orderBy: { raffle: { createdAt: 'desc' } },
    });
    res.json({ entries });
  } catch (error) { next(error); }
};

// Estado del sorteo en curso — para polling del cliente
export const getLiveStatus = async (req, res, next) => {
  try {
    // Buscar sorteo en DRAWING
    const drawing = await prisma.raffle.findFirst({
      where: { status: 'DRAWING' },
      select: {
        id: true,
        title: true,
        prize: true,
        prizeImage: true,
        status: true,
        updatedAt: true,
        entries: { select: { number: true } },
      },
    });

    if (drawing) {
      return res.json({
        phase: 'drawing',
        raffle: {
          id: drawing.id,
          title: drawing.title,
          prize: drawing.prize,
          prizeImage: drawing.prizeImage,
          numbers: drawing.entries.map(e => e.number),
        },
      });
    }

    // Buscar sorteo recién finalizado (últimos 60 segundos)
    const recentFinished = await prisma.raffle.findFirst({
      where: {
        status: 'FINISHED',
        updatedAt: { gte: new Date(Date.now() - 60000) },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        entries: {
          where: { number: { gt: 0 } },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (recentFinished?.winnerNumber) {
      const winnerEntry = recentFinished.entries.find(
        e => e.number === recentFinished.winnerNumber
      );
      return res.json({
        phase: 'finished',
        raffle: {
          id: recentFinished.id,
          title: recentFinished.title,
          prize: recentFinished.prize,
          prizeImage: recentFinished.prizeImage,
          winnerNumber: recentFinished.winnerNumber,
          winnerName: winnerEntry?.user?.name || 'Ganador',
          finishedAt: recentFinished.updatedAt,
        },
      });
    }

    res.json({ phase: 'idle' });
  } catch (error) { next(error); }
};
export const notifyRaffleStarting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { secondsUntilStart = 30 } = req.body;

    const raffle = await prisma.raffle.findUnique({ where: { id } });
    if (!raffle) return res.status(404).json({ error: 'Sorteo no encontrado' });

    const broadcastData = {
      raffleId: id,
      raffleTitle: raffle.title,
      prize: raffle.prize,
      prizeImage: raffle.prizeImage,
      secondsUntilStart,
      startsAt: new Date(Date.now() + secondsUntilStart * 1000).toISOString(),
    };

    // Guardar en DB para que el polling lo detecte
    await prisma.raffleBroadcast.create({
      data: {
        type: 'starting-soon',
        data: broadcastData,
      },
    });

    // También intentar por socket (best-effort)
    try {
      io.emit('raffle:starting-soon', broadcastData);
    } catch (e) { console.warn('socket starting-soon:', e.message); }

    res.json({ message: `Aviso guardado — sorteo en ${secondsUntilStart}s` });
  } catch (error) { next(error); }
};

// Avisar a clientes que los números están girando
export const notifyRaffleSpinning = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numbers = [], spinDurationMs = 5000 } = req.body;

    const raffle = await prisma.raffle.findUnique({ where: { id } });
    if (!raffle) return res.status(404).json({ error: 'Sorteo no encontrado' });

    // Emitir a TODOS los clientes
    io.emit('raffle:spinning', {
      raffleId: id,
      raffleTitle: raffle.title,
      prize: raffle.prize,
      prizeImage: raffle.prizeImage,
      numbers,
      spinDurationMs,
    });

    res.json({ message: 'Spinning notificado' });
  } catch (error) { next(error); }
};
// Último broadcast para polling del cliente
export const getBroadcast = async (req, res, next) => {
  try {
    // Broadcasts de los últimos 3 minutos
    const cutoff = new Date(Date.now() - 3 * 60 * 1000);
    const broadcast = await prisma.raffleBroadcast.findFirst({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
    });

    if (!broadcast) return res.json({ broadcast: null });
    res.json({ broadcast });
  } catch (error) { next(error); }
};


