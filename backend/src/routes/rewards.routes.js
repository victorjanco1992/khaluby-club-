import { Router } from 'express';
import { getRewards, createReward, updateReward, deleteReward, redeemReward, getRedemptions } from '../controllers/rewards.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { io } from '../index.js';

export const rewardsRouter = Router();

rewardsRouter.get('/redemptions', authenticate, getRedemptions);
rewardsRouter.get('/', authenticate, getRewards);
rewardsRouter.post('/:id/redeem', authenticate, redeemReward);
rewardsRouter.post('/', authenticate, requireAdmin, createReward);
rewardsRouter.put('/:id', authenticate, requireAdmin, updateReward);
rewardsRouter.delete('/:id', authenticate, requireAdmin, deleteReward);

// Aprobar / rechazar canje
rewardsRouter.patch('/redemptions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const existing = await prisma.redemption.findUnique({
      where: { id },
      include: { user: true, reward: true },
    });

    if (!existing) return res.status(404).json({ error: 'Canje no encontrado' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Este canje ya fue procesado' });
    }

    if (status === 'REJECTED') {
      await prisma.$transaction([
        prisma.redemption.update({ where: { id }, data: { status: 'REJECTED' } }),
        prisma.user.update({
          where: { id: existing.userId },
          data: { points: { increment: existing.points }, lastRedemptionAt: null },
        }),
        ...(existing.reward.stock >= 0 ? [
          prisma.reward.update({
            where: { id: existing.rewardId },
            data: { stock: { increment: 1 } },
          }),
        ] : []),
      ]);

      try {
        io.to(`user:${existing.userId}`).emit('points:updated', {
          points: existing.user.points + existing.points,
          cooldownReset: true,
        });
      } catch {}

      return res.json({
        message: `Canje rechazado — ${existing.points} puntos devueltos a ${existing.user.name}`,
        pointsReturned: existing.points,
        cooldownReset: true,
      });
    }

    await prisma.redemption.update({ where: { id }, data: { status: 'APPROVED' } });

    try {
      io.to(`user:${existing.userId}`).emit('points:updated', { cooldownReset: false });
    } catch {}

    res.json({ message: `Canje aprobado para ${existing.user.name}` });
  } catch (error) { next(error); }
});
