import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

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

// Actualizar teléfono
usersRouter.put('/me', authenticate, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone?.trim()) return res.status(400).json({ error: 'Teléfono requerido' });
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { phone: phone.trim() },
      select: { id: true, name: true, phone: true, email: true, points: true, dni: true },
    });
    res.json({ message: 'Teléfono actualizado', user: updated });
  } catch (error) { next(error); }
});

// Cambiar contraseña
usersRouter.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });
    res.json({ message: 'Contraseña actualizada' });
  } catch (error) { next(error); }
});
