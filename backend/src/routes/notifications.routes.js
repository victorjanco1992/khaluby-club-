import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const notificationsRouter = Router();

// Obtener notificaciones no leídas del usuario
notificationsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});

// Marcar una notificación como leída
notificationsRouter.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Marcar todas como leídas
notificationsRouter.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});