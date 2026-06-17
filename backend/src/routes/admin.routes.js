import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { getConfig, setConfig, calculatePoints, calculateRaffleNumbers } from '../lib/config.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// Stats
adminRouter.get('/stats', async (req, res, next) => {
  try {
    const [totalClients, purchasesAgg, activeRaffle, totalRedemptions, recentPurchases] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.purchase.aggregate({ _sum: { amount: true, points: true }, _count: true }),
      prisma.raffle.findFirst({
        where: { status: 'ACTIVE' },
        include: { _count: { select: { entries: true } } },
      }),
      prisma.redemption.count(),
      prisma.purchase.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, dni: true } } },
      }),
    ]);
    res.json({
      totalClients,
      totalRevenue: purchasesAgg._sum.amount || 0,
      totalPoints: purchasesAgg._sum.points || 0,
      totalPurchasesCount: purchasesAgg._count,
      totalRedemptions,
      activeRaffle,
      recentPurchases,
    });
  } catch (error) { next(error); }
});

// GET config
adminRouter.get('/config', async (req, res, next) => {
  try {
    const config = await getConfig();
    res.json({ config });
  } catch (error) { next(error); }
});

// PUT config — actualizar uno o varios valores
adminRouter.put('/config', async (req, res, next) => {
  try {
    const allowed = [
      'points_transfer_amount', 'points_transfer_per',
      'points_cash_amount', 'points_cash_per',
      'raffle_amount_per_number', 'raffle_cash_bonus',
    ];

    const updates = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const val = parseFloat(req.body[key]);
        if (isNaN(val) || val < 0) continue;
        updates.push(setConfig(key, val));
      }
    }

    await Promise.all(updates);
    const config = await getConfig();
    res.json({ config, message: 'Configuración actualizada' });
  } catch (error) { next(error); }
});

// Preview de cálculo — para mostrar antes de confirmar
adminRouter.post('/config/preview', async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'TRANSFER' } = req.body;
    const config = await getConfig();
    const points = calculatePoints(parseFloat(amount), paymentMethod, config);
    const numbers = calculateRaffleNumbers(parseFloat(amount), paymentMethod, config);
    res.json({ points, numbers, config });
  } catch (error) { next(error); }
});

// Clientes
adminRouter.get('/clients', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { role: 'CLIENT' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, name: true, dni: true, phone: true, email: true,
          points: true, totalSpent: true, isActive: true, createdAt: true,
          lastRedemptionAt: true,
          _count: { select: { purchases: true, raffleEntries: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

// Crear cliente manualmente (admin) — contraseña por defecto = DNI
adminRouter.post('/clients', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2, 'Nombre muy corto'),
      dni: z.string().min(6, 'DNI inválido').max(10, 'DNI inválido'),
      phone: z.string().min(8, 'Teléfono inválido'),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { dni: data.dni } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
    }

    const hashed = await bcrypt.hash(data.dni, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        dni: data.dni,
        phone: data.phone,
        password: hashed,
        role: 'CLIENT',
        qrCode: uuidv4(),
      },
      select: {
        id: true, name: true, dni: true, phone: true, email: true,
        points: true, totalSpent: true, isActive: true, createdAt: true,
      },
    });

    res.status(201).json({ user, message: `Cliente creado. Contraseña inicial: ${data.dni}` });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

adminRouter.patch('/clients/:id/toggle', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Cliente no encontrado' });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
    res.json({ user: updated });
  } catch (error) { next(error); }
});

adminRouter.put('/clients/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().min(8).optional(),
      email: z.string().email().optional().or(z.literal('')),
      points: z.number().int().min(0).optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email || undefined },
      select: { id: true, name: true, dni: true, phone: true, email: true, points: true, totalSpent: true, isActive: true },
    });
    res.json({ user: updated, message: 'Cliente actualizado' });
  } catch (error) { next(error); }
});

adminRouter.post('/clients/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Cliente no encontrado' });
    const password = newPassword || user.dni;
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
    res.json({ message: newPassword ? 'Contraseña actualizada' : `Contraseña reseteada al DNI: ${user.dni}` });
  } catch (error) { next(error); }
});

adminRouter.delete('/clients/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.redemption.deleteMany({ where: { userId: id } });
    await prisma.raffleEntry.deleteMany({ where: { userId: id } });
    await prisma.purchase.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) { next(error); }
});

// Obtener categorías de promociones
adminRouter.get('/promotion-categories', async (req, res, next) => {
  try {
    const row = await prisma.storeConfig.findUnique({ where: { key: 'promotion_categories' } });
    const defaults = ['Ofertas', 'Combos', 'Puntos', 'Limpieza', 'Bebidas', 'Alimentos', 'General'];
    const categories = row ? JSON.parse(row.value) : defaults;
    res.json({ categories });
  } catch (error) { next(error); }
});

// Guardar categorías
adminRouter.put('/promotion-categories', async (req, res, next) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Debe haber al menos una categoría' });
    }
    const clean = categories.map(c => c.trim()).filter(Boolean);
    await prisma.storeConfig.upsert({
      where: { key: 'promotion_categories' },
      update: { value: JSON.stringify(clean) },
      create: { key: 'promotion_categories', value: JSON.stringify(clean) },
    });
    res.json({ categories: clean, message: 'Categorías guardadas' });
  } catch (error) { next(error); }
});
