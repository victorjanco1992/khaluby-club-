import { Router } from 'express';
import { getVapidKey, subscribe, unsubscribe } from '../controllers/push.controller.js';
import { authenticate } from '../middleware/auth.js'; // ajustar al nombre real de tu middleware

const router = Router();

// Pública: el frontend necesita la VAPID key antes de loguearse el SW
router.get('/vapid-key', getVapidKey);

// Requieren usuario autenticado
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);

export default router;
