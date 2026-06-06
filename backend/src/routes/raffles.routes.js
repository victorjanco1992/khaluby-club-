import { Router } from 'express';
import {
  getRaffles, getRaffle, getLastRaffle, createRaffle,
  activateRaffle, performDraw, resetRaffle, getUserRaffleNumbers,
  updateRaffle, deleteRaffle, getMyWin, notifyRaffleStarting,
} from '../controllers/raffles.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const rafflesRouter = Router();

rafflesRouter.get('/last', getLastRaffle);
rafflesRouter.get('/my-numbers', authenticate, getUserRaffleNumbers);
rafflesRouter.get('/my-win', authenticate, getMyWin);
rafflesRouter.get('/', authenticate, getRaffles);
rafflesRouter.get('/:id', authenticate, getRaffle);

rafflesRouter.post('/', authenticate, requireAdmin, createRaffle);
rafflesRouter.put('/:id', authenticate, requireAdmin, updateRaffle);
rafflesRouter.delete('/:id', authenticate, requireAdmin, deleteRaffle);
rafflesRouter.patch('/:id/activate', authenticate, requireAdmin, activateRaffle);
rafflesRouter.post('/:id/draw', authenticate, requireAdmin, performDraw);
rafflesRouter.post('/:id/reset', authenticate, requireAdmin, resetRaffle);

// Aviso de que el sorteo está por empezar
rafflesRouter.post('/:id/notify-starting', authenticate, requireAdmin, notifyRaffleStarting);
