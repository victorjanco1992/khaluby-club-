import { Router } from 'express';
import { createPurchase, getPurchases, getUserByQR } from '../controllers/purchases.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const purchasesRouter = Router();

purchasesRouter.get('/scan/:qrCode', authenticate, requireAdmin, getUserByQR);
purchasesRouter.get('/', authenticate, requireAdmin, getPurchases);
purchasesRouter.post('/', authenticate, requireAdmin, createPurchase);