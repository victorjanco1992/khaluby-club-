import { prisma } from '../lib/prisma.js';

export const getVapidKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

export const subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    const userId = req.user.id;
    const subString = JSON.stringify(subscription);

    // Evitar duplicados por endpoint
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId, subscription: subString },
      });
    } else {
      await prisma.pushSubscription.create({
        data: { userId, endpoint: subscription.endpoint, subscription: subString },
      });
    }

    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (error) { next(error); }
};

export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user.id },
    });

    res.json({ message: 'Suscripción eliminada' });
  } catch (error) { next(error); }
};
