import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const COOLDOWN_DAYS = 7;

const rewardSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
  pointsCost: z.number().int().positive(),
  stock: z.number().int().default(-1),
  isActive: z.boolean().default(true),
});

export const getRewards = async (req, res, next) => {
  try {
    const where = req.user?.role === 'ADMIN' ? {} : { isActive: true };
    const rewards = await prisma.reward.findMany({
      where, orderBy: { pointsCost: 'asc' },
      include: { _count: { select: { redemptions: true } } },
    });

    // Si es cliente, incluir info del cooldown
    let cooldownInfo = null;
    if (req.user?.role === 'CLIENT') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { lastRedemptionAt: true },
      });
      if (user?.lastRedemptionAt) {
        const nextAllowed = new Date(user.lastRedemptionAt);
        nextAllowed.setDate(nextAllowed.getDate() + COOLDOWN_DAYS);
        const now = new Date();
        if (now < nextAllowed) {
          cooldownInfo = {
            active: true,
            nextAllowedAt: nextAllowed.toISOString(),
            daysLeft: Math.ceil((nextAllowed - now) / (1000 * 60 * 60 * 24)),
          };
        }
      }
    }

    res.json({ rewards, cooldownInfo });
  } catch (error) { next(error); }
};

export const createReward = async (req, res, next) => {
  try {
    const data = rewardSchema.parse(req.body);
    const reward = await prisma.reward.create({ data: { ...data, image: data.image || null } });
    res.status(201).json({ reward, message: 'Recompensa creada' });
  } catch (error) { next(error); }
};

export const updateReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = rewardSchema.partial().parse(req.body);
    const reward = await prisma.reward.update({ where: { id }, data });
    res.json({ reward });
  } catch (error) { next(error); }
};

export const redeemReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [reward, user] = await Promise.all([
      prisma.reward.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!reward?.isActive) return res.status(404).json({ error: 'Recompensa no disponible' });
    if (reward.stock === 0) return res.status(400).json({ error: 'Sin stock disponible' });
    if (user.points < reward.pointsCost) {
      return res.status(400).json({ error: `Necesitás ${reward.pointsCost - user.points} puntos más` });
    }

    // Cooldown de 7 días
    if (user.lastRedemptionAt) {
      const nextAllowed = new Date(user.lastRedemptionAt);
      nextAllowed.setDate(nextAllowed.getDate() + COOLDOWN_DAYS);
      if (new Date() < nextAllowed) {
        const daysLeft = Math.ceil((nextAllowed - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(400).json({
          error: `Ya canjeaste recientemente. Podés volver a canjear en ${daysLeft} día${daysLeft > 1 ? 's' : ''}.`,
          nextAllowedAt: nextAllowed.toISOString(),
          daysLeft,
        });
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: reward.pointsCost }, lastRedemptionAt: new Date() },
      }),
      prisma.redemption.create({ data: { userId, rewardId: id, points: reward.pointsCost } }),
      ...(reward.stock > 0 ? [prisma.reward.update({ where: { id }, data: { stock: { decrement: 1 } } })] : []),
    ]);

    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    res.json({
      message: `¡"${reward.name}" canjeada exitosamente!`,
      pointsRemaining: updated.points,
      nextRedemptionAt: (() => { const d = new Date(); d.setDate(d.getDate() + COOLDOWN_DAYS); return d.toISOString(); })(),
    });
  } catch (error) { next(error); }
};

export const getRedemptions = async (req, res, next) => {
  try {
    const where = req.user.role === 'CLIENT' ? { userId: req.user.id } : {};
    const redemptions = await prisma.redemption.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, dni: true } },
        reward: { select: { name: true, image: true } },
      },
    });
    res.json({ redemptions });
  } catch (error) { next(error); }
};