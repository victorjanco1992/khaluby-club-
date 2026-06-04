import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { rafflesRouter } from './routes/raffles.routes.js';
import { purchasesRouter } from './routes/purchases.routes.js';
import { rewardsRouter } from './routes/rewards.routes.js';
import { promotionsRouter } from './routes/promotions.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { setupSocketIO } from './lib/socket.js';

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

export const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // En producción (Vercel) solo polling — en local también WebSocket
  transports: isProduction ? ['polling'] : ['websocket', 'polling'],
  // Vercel tiene timeout de 30s — reducir heartbeat
  pingTimeout: 20000,
  pingInterval: 10000,
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Saltear aviso de ngrok/cloudflare
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Despensa Khaluby API', env: process.env.NODE_ENV });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/raffles', rafflesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use(errorHandler);

setupSocketIO(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🛒 Despensa Khaluby API → http://localhost:${PORT}`);
  console.log(`📡 Socket.io modo: ${isProduction ? 'polling' : 'websocket'}`);
});