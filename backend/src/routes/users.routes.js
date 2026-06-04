import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const usersRouter = Router();

usersRouter.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        purchases: { orderBy: { createdAt: 'desc' }, take: 10 },
        raffleEntries: {
          include: { raffle: { select: { title: true, status: true, prize: true } } },
          orderBy: { raffle: { createdAt: 'desc' } },
        },
        redemptions: {
          include: { reward: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    res.json({ user });
  } catch (error) { next(error); }
});