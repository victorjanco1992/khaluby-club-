import { Router } from 'express';
import { getRewards, createReward, updateReward, redeemReward, getRedemptions } from '../controllers/rewards.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

export const rewardsRouter = Router();

rewardsRouter.get('/redemptions', authenticate, getRedemptions);
rewardsRouter.get('/', authenticate, getRewards);
rewardsRouter.post('/:id/redeem', authenticate, redeemReward);

rewardsRouter.post('/', authenticate, requireAdmin, createReward);
rewardsRouter.put('/:id', authenticate, requireAdmin, updateReward);

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
      // ✅ Devolver puntos Y resetear el cooldown
      await prisma.$transaction([
        // Actualizar estado del canje
        prisma.redemption.update({
          where: { id },
          data: { status: 'REJECTED' },
        }),
        // Devolver los puntos al usuario
        prisma.user.update({
          where: { id: existing.userId },
          data: {
            points: { increment: existing.points },
            // Resetear cooldown — null significa que puede canjear de nuevo
            lastRedemptionAt: null,
          },
        }),
        // Si el reward tenía stock limitado, devolvérselo también
        ...(existing.reward.stock >= 0 ? [
          prisma.reward.update({
            where: { id: existing.rewardId },
            data: { stock: { increment: 1 } },
          }),
        ] : []),
      ]);

      return res.json({
        message: `Canje rechazado — ${existing.points} puntos devueltos a ${existing.user.name}`,
        pointsReturned: existing.points,
        cooldownReset: true,
      });
    }

    // APPROVED — solo actualizar estado
    await prisma.redemption.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    res.json({
      message: `Canje aprobado para ${existing.user.name}`,
    });
  } catch (error) { next(error); }
});
