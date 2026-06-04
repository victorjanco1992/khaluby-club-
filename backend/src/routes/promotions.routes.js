import { Router } from 'express';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../controllers/promotions.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const promotionsRouter = Router();

promotionsRouter.get('/', authenticate, getPromotions);
promotionsRouter.post('/', authenticate, requireAdmin, createPromotion);
promotionsRouter.put('/:id', authenticate, requireAdmin, updatePromotion);
promotionsRouter.delete('/:id', authenticate, requireAdmin, deletePromotion);