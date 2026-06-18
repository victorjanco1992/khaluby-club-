import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getConfig, calculatePoints, calculateRaffleNumbers } from '../lib/config.js';
import { sendPushToUser } from '../lib/pushNotifications.js';

const createPurchaseSchema = z.object({
  userId:        z.string().uuid(),
  amount:        z.number().positive(),
  paymentMethod: z.enum(['CASH', 'TRANSFER']).default('TRANSFER'),
  multiplier:    z.number().min(1).max(10).default(1),
  notes:         z.string().optional(),
  raffleId:      z.string().uuid().optional(),
});

export const createPurchase = async (req, res, next) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const config = await getConfig();

    // Puntos base según medio de pago
    const basePoints = calculatePoints(data.amount, data.paymentMethod, config);

    // Aplicar multiplicador y redondear
    const pointsEarned = Math.floor(basePoints * data.multiplier);

    const numbersCount = calculateRaffleNumbers(data.amount, data.paymentMethod, config);

    // ✅ Buscar TODOS los sorteos activos (no solo el primero)
    let activeRaffles = [];
    if (data.raffleId) {
      // Si se especificó un sorteo concreto, usar solo ese
      const raffle = await prisma.raffle.findUnique({ where: { id: data.raffleId } });
      if (raffle?.status === 'ACTIVE') activeRaffles = [raffle];
    } else {
      activeRaffles = await prisma.raffle.findMany({ where: { status: 'ACTIVE' } });
    }

    // Actualizar puntos del usuario
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        points:     { increment: pointsEarned },
        totalSpent: { increment: data.amount },
      },
    });

    // ✅ Asignar números en CADA sorteo activo
    let totalAssignedNumbers = 0;
    const assignedPerRaffle = []; // [{ raffleId, raffleTitile, numbers: [] }]

    if (numbersCount > 0 && activeRaffles.length > 0) {
      for (const raffle of activeRaffles) {
        const assignedNumbers = [];

        for (let i = 0; i < numbersCount; i++) {
          const last = await prisma.raffleEntry.findFirst({
            where: { raffleId: raffle.id },
            orderBy: { number: 'desc' },
          });
          const nextNumber = (last?.number || 0) + 1;
          try {
            await prisma.raffleEntry.create({
              data: { raffleId: raffle.id, userId: data.userId, number: nextNumber },
            });
            assignedNumbers.push(nextNumber);
          } catch (err) {
            if (err.code === 'P2002') { i--; continue; }
            throw err;
          }
        }

        if (assignedNumbers.length > 0) {
          await prisma.raffle.update({
            where: { id: raffle.id },
            data: { totalNumbers: { increment: assignedNumbers.length } },
          });
          assignedPerRaffle.push({
            raffleId: raffle.id,
            raffleTitle: raffle.title,
            numbers: assignedNumbers,
          });
          totalAssignedNumbers += assignedNumbers.length;
        }
      }
    }

    // Para la compra guardamos todos los números asignados (de todos los sorteos)
    const allAssignedNumbers = assignedPerRaffle.flatMap(r => r.numbers);

    // Registrar compra
    await prisma.purchase.create({
      data: {
        userId:        data.userId,
        amount:        data.amount,
        points:        pointsEarned,
        numbers:       allAssignedNumbers,
        paymentMethod: data.paymentMethod,
        notes:         data.notes
          ? `${data.multiplier > 1 ? `[x${data.multiplier}pts] ` : ''}${data.notes}`
          : data.multiplier > 1 ? `[x${data.multiplier}pts]` : null,
        createdBy: req.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true, points: true, totalSpent: true },
    });

    const isCash = data.paymentMethod === 'CASH';
    const hasMultiplier = data.multiplier > 1;

    // Push — armar mensaje según cuántos sorteos activos hay
    let pushBody;
    if (assignedPerRaffle.length === 0) {
      pushBody = `Sumaste ${pointsEarned} puntos. ¡Seguí comprando!`;
    } else if (assignedPerRaffle.length === 1) {
      pushBody = `Sumaste ${pointsEarned} pts y participás en "${assignedPerRaffle[0].raffleTitle}" 🎰`;
    } else {
      const titles = assignedPerRaffle.map(r => `"${r.raffleTitle}"`).join(' y ');
      pushBody = `Sumaste ${pointsEarned} pts y participás en ${titles} 🎰`;
    }

    await sendPushToUser(data.userId, {
      title: '🛒 ¡Compra registrada!',
      body: pushBody,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/dashboard' },
    });

    // Armar mensaje de respuesta
    const raffleInfo = assignedPerRaffle.length === 0
      ? 'sin sorteo activo'
      : assignedPerRaffle.length === 1
        ? `${allAssignedNumbers.length} número(s) en "${assignedPerRaffle[0].raffleTitle}"`
        : `${allAssignedNumbers.length} números en ${assignedPerRaffle.length} sorteos`;

    res.status(201).json({
      message: [
        `✅ +${pointsEarned} puntos`,
        isCash ? '💵 efectivo' : '📲 transfer',
        hasMultiplier ? `🔥 x${data.multiplier}` : '',
        `· ${raffleInfo}`,
      ].filter(Boolean).join(' '),
      assignedNumbers: allAssignedNumbers,
      assignedPerRaffle,
      pointsEarned,
      multiplier: data.multiplier,
      user,
    });
  } catch (error) { next(error); }
};

export const getPurchases = async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (userId) where.userId = userId;
    if (req.user.role === 'CLIENT') where.userId = req.user.id;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: { user: { select: { name: true, dni: true } } },
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({ purchases, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
};

export const getUserByQR = async (req, res, next) => {
  try {
    const { qrCode } = req.params;
    const user = await prisma.user.findUnique({
      where: { qrCode },
      select: {
        id: true, name: true, dni: true, phone: true,
        points: true, totalSpent: true, createdAt: true,
        _count: { select: { purchases: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ user });
  } catch (error) { next(error); }
};
