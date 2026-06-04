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

rewardsRouter.patch('/redemptions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const existing = await prisma.redemption.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Canje no encontrado' });

    const redemption = await prisma.redemption.update({ where: { id }, data: { status } });

    if (status === 'REJECTED') {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { points: { increment: existing.points } },
      });
    }
    res.json({ redemption, message: `Canje ${status === 'APPROVED' ? 'aprobado' : 'rechazado'}` });
  } catch (error) { next(error); }
});