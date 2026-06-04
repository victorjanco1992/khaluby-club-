import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const registerSchema = z.object({
  name: z.string().min(2),
  dni: z.string().min(7).max(10),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
});

const loginSchema = z.object({
  dni: z.string().min(1),
  password: z.string().min(1),
});

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateQR = (code) =>
  QRCode.toDataURL(code, { errorCorrectionLevel: 'H', width: 300, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } });

export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ dni: data.dni }, ...(data.email ? [{ email: data.email }] : [])] },
    });
    if (existing) return res.status(409).json({ error: 'Ya existe un usuario con ese DNI o email' });

    const password = await bcrypt.hash(data.password, 12);
    const qrCode = uuidv4();

    const user = await prisma.user.create({
      data: { name: data.name, dni: data.dni, phone: data.phone, email: data.email || null, password, qrCode, role: 'CLIENT' },
      select: { id: true, name: true, dni: true, phone: true, email: true, role: true, qrCode: true, points: true },
    });

    const token = generateToken(user.id);
    const qrDataUrl = await generateQR(qrCode);

    res.status(201).json({ message: '¡Bienvenido a Despensa Khaluby!', token, user, qrDataUrl });
  } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { dni: data.dni } });

    if (!user || !user.isActive) return res.status(401).json({ error: 'DNI o contraseña incorrectos' });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: 'DNI o contraseña incorrectos' });

    const token = generateToken(user.id);
    const qrDataUrl = await generateQR(user.qrCode);

    res.json({
      message: `¡Bienvenido, ${user.name}!`,
      token,
      user: { id: user.id, name: user.name, dni: user.dni, phone: user.phone, email: user.email, role: user.role, qrCode: user.qrCode, points: user.points, totalSpent: user.totalSpent },
      qrDataUrl,
    });
  } catch (error) { next(error); }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, dni: true, phone: true, email: true, role: true,
        qrCode: true, points: true, totalSpent: true, createdAt: true,
        purchases: { orderBy: { createdAt: 'desc' }, take: 10 },
        redemptions: { orderBy: { createdAt: 'desc' }, take: 5, include: { reward: { select: { name: true } } } },
      },
    });
    const qrDataUrl = await generateQR(user.qrCode);
    res.json({ user, qrDataUrl });
  } catch (error) { next(error); }
};