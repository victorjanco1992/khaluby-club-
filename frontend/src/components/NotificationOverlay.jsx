import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useNotifications } from '../hooks/useNotifications.js';

function launchFireworks() {
  const end = Date.now() + 5500;
  const colors = ['#8b5cf6', '#a78bfa', '#fbbf24', '#ffffff', '#f472b6'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  confetti({ particleCount: 350, spread: 160, origin: { y: 0.4 }, colors });
  frame();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Pantalla de ganador — diseñada para mostrar presencialmente en caja
function WinnerOverlay({ notification, onClose }) {
  const d = notification.data || {};
  const [showVoucher, setShowVoucher] = useState(false);

  useEffect(() => {
    launchFireworks();
  }, []);

  if (showVoucher) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6"
        style={{ background: '#080b14' }}
      >
        {/* Voucher para mostrar en caja */}
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Comprobante de ganador</p>
            <h2 className="font-display font-bold text-2xl text-white">Despensa Khaluby</h2>
          </div>

          {/* Card del voucher */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1))',
              border: '1px solid rgba(139,92,246,0.4)',
            }}
          >
            {/* Imagen del premio */}
            {d.prizeImage && (
              <img
                src={d.prizeImage}
                alt={d.prize}
                className="w-full h-48 object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            {!d.prizeImage && (
              <div className="w-full h-32 flex items-center justify-center text-6xl"
                style={{ background: 'rgba(139,92,246,0.15)' }}>
                🏆
              </div>
            )}

            <div className="p-6">
              {/* Badge ganador */}
              <div className="flex items-center justify-center mb-4">
                <span className="text-3xl mr-2">🏆</span>
                <span
                  className="font-bold text-lg px-4 py-1 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd' }}
                >
                  ¡GANADOR!
                </span>
              </div>

              {/* Premio */}
              <div className="text-center mb-5">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Premio</p>
                <p className="font-display font-bold text-2xl text-amber-300">{d.prize}</p>
              </div>

              {/* Datos */}
              <div className="space-y-3 rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Sorteo</span>
                  <span className="text-white font-medium text-sm text-right max-w-[60%]">{d.raffleTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Número ganador</span>
                  <span className="font-mono font-bold text-violet-300 text-lg">#{d.number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Fecha y hora</span>
                  <span className="text-white/80 text-xs text-right max-w-[55%]">{formatDate(d.date)}</span>
                </div>
              </div>

              {/* Instrucción */}
              <p className="text-center text-white/40 text-xs mt-4">
                Mostrá esta pantalla en caja para reclamar tu premio
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowVoucher(false)}
              className="btn-secondary flex-1 py-3"
            >
              ← Volver
            </button>
            <button
              onClick={onClose}
              className="btn-primary flex-1 py-3"
            >
              Cerrar 🎊
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Pantalla de celebración inicial
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden"
      style={{ background: 'rgba(4,6,13,0.97)' }}
    >
      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.12)' }}
        />
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, delay: 0.1 }}
        className="text-8xl mb-4 relative z-10"
      >
        🏆
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 max-w-sm w-full"
      >
        <h2 className="font-display font-black text-5xl mb-3">
          <span className="gradient-text">¡Ganaste!</span>
        </h2>

        <p className="text-white/65 text-base mb-2">
          Tu número{' '}
          <span className="font-mono font-bold text-violet-300 text-2xl">#{d.number}</span>{' '}
          fue el ganador
        </p>
        <p className="text-white/45 text-sm mb-5">{d.raffleTitle}</p>

        {/* Imagen del premio */}
        {d.prizeImage && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-4 rounded-2xl overflow-hidden border border-white/10"
          >
            <img
              src={d.prizeImage}
              alt={d.prize}
              className="w-full h-40 object-cover"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </motion.div>
        )}

        {/* Premio */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="winner-glow rounded-2xl p-4 mb-5"
          style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.35)',
          }}
        >
          <p className="text-white/50 text-xs mb-1">Tu premio</p>
          <p className="font-display font-bold text-2xl text-amber-300">{d.prize}</p>
          {d.date && (
            <p className="text-white/35 text-xs mt-2">{formatDate(d.date)}</p>
          )}
        </motion.div>

        {/* Botones */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowVoucher(true)}
            className="btn-primary w-full py-4 text-base"
          >
            📱 Ver comprobante para caja
          </button>
          <button
            onClick={onClose}
            className="btn-secondary w-full py-3"
          >
            Cerrar por ahora
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Notificación de perdedor — discreta, abajo a la derecha
function LoserOverlay({ notification, onClose }) {
  const d = notification.data || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-end justify-end p-4 pointer-events-none"
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="pointer-events-auto w-full max-w-sm"
        style={{
          background: 'rgba(13,17,32,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          padding: '16px',
        }}
      >
        {/* Imagen pequeña del premio si existe */}
        {d.prizeImage && (
          <img
            src={d.prizeImage}
            alt={d.prize}
            className="w-full h-24 object-cover rounded-xl mb-3"
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}

        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🎰</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">Resultado del sorteo</p>
            <p className="text-white/55 text-xs mt-1 leading-relaxed">
              El sorteo{' '}
              <span className="text-white/75 font-medium">"{d.raffleTitle}"</span>{' '}
              ya tiene un ganador.
            </p>
            <p className="text-white/55 text-xs mt-1">
              ¡Seguí comprando para sumar números y ganar el próximo! 💪
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 flex-shrink-0 p-1 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(139,92,246,0.2)', color: 'rgb(196,181,253)' }}
        >
          ¡A por el próximo! 🚀
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function NotificationOverlay() {
  const { notifications, markRead } = useNotifications();
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [processed, setProcessed] = useState(new Set());

  useEffect(() => {
    const unread = notifications.filter(
      n => !n.read && !processed.has(n.id) && (n.type === 'WINNER' || n.type === 'RAFFLE_RESULT')
    );
    if (unread.length === 0) return;

    const sorted = [
      ...unread.filter(n => n.type === 'WINNER'),
      ...unread.filter(n => n.type === 'RAFFLE_RESULT'),
    ];

    setQueue(prev => {
      const toAdd = sorted.filter(n => !prev.find(p => p.id === n.id));
      return [...prev, ...toAdd];
    });
  }, [notifications]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const handleClose = useCallback(async () => {
    if (!current) return;
    setProcessed(prev => new Set([...prev, current.id]));
    await markRead(current.id);
    setCurrent(null);
  }, [current, markRead]);

  return (
    <AnimatePresence mode="wait">
      {current?.type === 'WINNER' && (
        <WinnerOverlay key={current.id} notification={current} onClose={handleClose} />
      )}
      {current?.type === 'RAFFLE_RESULT' && (
        <LoserOverlay key={current.id} notification={current} onClose={handleClose} />
      )}
    </AnimatePresence>
  );
}