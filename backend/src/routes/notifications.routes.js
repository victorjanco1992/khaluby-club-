import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const notificationsRouter = Router();

// ─── NOTIFICACIONES IN-APP ────────────────────────────────────────────────────

// Obtener notificaciones del usuario
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

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

// Exponer la clave pública VAPID al frontend (sin autenticación)
notificationsRouter.get('/push/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Guardar la suscripción push del dispositivo del usuario
notificationsRouter.post('/push/subscribe', authenticate, async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    // ✅ Buscar por endpoint dentro del JSON almacenado
    const existing = await prisma.pushSubscription.findFirst({
      where: {
        userId: req.user.id,
        subscription: { contains: subscription.endpoint },
      },
    });

    if (existing) {
      // Actualizar — las keys pueden rotar aunque el endpoint sea el mismo
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { subscription: JSON.stringify(subscription) },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: req.user.id,
          subscription: JSON.stringify(subscription),
        },
      });
    }

    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Eliminar suscripción push (cuando el usuario desactiva notificaciones)
notificationsRouter.delete('/push/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint requerido' });
    }

    // ✅ Buscar por endpoint dentro del JSON almacenado
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: req.user.id,
        subscription: { contains: endpoint },
      },
    });

    res.json({ ok: true });
  } catch (error) { next(error); }
});
