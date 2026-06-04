import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const promotionSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  category: z.string().min(2),
  // Acepta cualquier string con http/https, o vacío
  image: z.string()
    .refine(val => val === '' || val.startsWith('http://') || val.startsWith('https://'), {
      message: 'La imagen debe ser una URL válida (http:// o https://)',
    })
    .optional()
    .or(z.literal('')),
  isVisible: z.boolean().default(true),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

export const getPromotions = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = req.user?.role === 'ADMIN' ? {} : { isVisible: true };
    if (category) where.category = category;
    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ promotions });
  } catch (error) { next(error); }
};

export const createPromotion = async (req, res, next) => {
  try {
    const data = promotionSchema.parse(req.body);
    const promotion = await prisma.promotion.create({
      data: {
        title:       data.title,
        description: data.description,
        category:    data.category,
        image:       data.image && data.image.trim() !== '' ? data.image.trim() : null,
        isVisible:   data.isVisible ?? true,
        validFrom:   data.validFrom ? new Date(data.validFrom) : null,
        validTo:     data.validTo   ? new Date(data.validTo)   : null,
      },
    });
    res.status(201).json({ promotion, message: 'Promoción creada' });
  } catch (error) { next(error); }
};

export const updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = promotionSchema.partial().parse(req.body);
    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(data.title       !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category    !== undefined && { category: data.category }),
        ...(data.isVisible   !== undefined && { isVisible: data.isVisible }),
        image:    data.image !== undefined
          ? (data.image && data.image.trim() !== '' ? data.image.trim() : null)
          : undefined,
        validFrom: data.validFrom !== undefined
          ? (data.validFrom ? new Date(data.validFrom) : null)
          : undefined,
        validTo: data.validTo !== undefined
          ? (data.validTo ? new Date(data.validTo) : null)
          : undefined,
      },
    });
    res.json({ promotion });
  } catch (error) { next(error); }
};

export const deletePromotion = async (req, res, next) => {
  try {
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ message: 'Promoción eliminada' });
  } catch (error) { next(error); }
};