import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getConfig, calculatePoints, calculateRaffleNumbers } from '../lib/config.js';

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

    // Buscar sorteo activo
    let raffleId = data.raffleId;
    if (!raffleId) {
      const active = await prisma.raffle.findFirst({ where: { status: 'ACTIVE' } });
      raffleId = active?.id;
    }

    // Actualizar puntos
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        points:     { increment: pointsEarned },
        totalSpent: { increment: data.amount },
      },
    });

    // Asignar números de sorteo
    let assignedNumbers = [];
    if (raffleId && numbersCount > 0) {
      const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
      if (raffle?.status === 'ACTIVE') {
        for (let i = 0; i < numbersCount; i++) {
          const last = await prisma.raffleEntry.findFirst({
            where: { raffleId },
            orderBy: { number: 'desc' },
          });
          const nextNumber = (last?.number || 0) + 1;
          try {
            await prisma.raffleEntry.create({
              data: { raffleId, userId: data.userId, number: nextNumber },
            });
            assignedNumbers.push(nextNumber);
          } catch (err) {
            if (err.code === 'P2002') { i--; continue; }
            throw err;
          }
        }
        await prisma.raffle.update({
          where: { id: raffleId },
          data: { totalNumbers: { increment: assignedNumbers.length } },
        });
      }
    }

    // Registrar compra
    await prisma.purchase.create({
      data: {
        userId:        data.userId,
        amount:        data.amount,
        points:        pointsEarned,
        numbers:       assignedNumbers,
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

    res.status(201).json({
      message: [
        `✅ +${pointsEarned} puntos`,
        isCash ? '💵 efectivo' : '📲 transfer',
        hasMultiplier ? `🔥 x${data.multiplier}` : '',
        `· ${assignedNumbers.length} número(s) de sorteo`,
      ].filter(Boolean).join(' '),
      assignedNumbers,
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