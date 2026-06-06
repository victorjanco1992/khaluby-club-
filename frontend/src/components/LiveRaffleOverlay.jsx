import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getSocket } from '../lib/socket.js';
import { useAuthStore } from '../stores/authStore.js';

function launchFireworks() {
  const end = Date.now() + 4000;
  const colors = ['#5cb516', '#9de360', '#fbbf24', '#fff'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  confetti({ particleCount: 200, spread: 130, origin: { y: 0.4 }, colors });
  frame();
}

export default function LiveRaffleOverlay() {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [phase, setPhase] = useState(null); // null | spinning | winner
  const [currentNum, setCurrentNum] = useState(null);
  const [winner, setWinner] = useState(null);
  const spinIntervalRef = useRef(null);

  useEffect(() => {
    // Solo para clientes autenticados
    if (!isAuthenticated() || isAdmin()) return;

    const socket = getSocket();

    socket.on('raffle:spinning', (data) => {
      setPhase('spinning');
      setWinner(null);
      const nums = data.numbers || [1];

      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);

      setTimeout(() => {
        clearInterval(spinIntervalRef.current);
      }, data.spinDurationMs || 6000);
    });

    socket.on('raffle:winner', ({ winner: w }) => {
      clearInterval(spinIntervalRef.current);
      setCurrentNum(w.number);
      setWinner(w);
      setPhase('winner');
      launchFireworks();
    });

    socket.on('raffle:finished', () => {
      // Si no recibimos raffle:winner (polling delay), igual mostramos algo
      setTimeout(() => {
        if (phase === 'spinning') setPhase(null);
      }, 8000);
    });

    return () => {
      socket.off('raffle:spinning');
      socket.off('raffle:winner');
      socket.off('raffle:finished');
      clearInterval(spinIntervalRef.current);
    };
  }, [isAuthenticated(), isAdmin()]);

  if (!phase) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col items-center justify-center p-6"
        style={{ background: 'rgba(8,13,5,0.97)', backdropFilter: 'blur(16px)' }}
      >
        {/* SPINNING */}
        {phase === 'spinning' && (
          <div className="text-center space-y-6 w-full max-w-sm">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 live-dot" />
              🎰 SORTEO EN VIVO
            </motion.div>

            <div>
              <h2 className="font-display font-bold text-4xl text-white mb-2">¡Sorteando!</h2>
              <p style={{ color: 'rgba(240,244,236,0.50)' }}>El número ganador está siendo elegido...</p>
            </div>

            {/* Número girando */}
            <div
              className="font-mono font-black text-9xl"
              style={{ color: '#9de360', textShadow: '0 0 40px rgba(92,181,22,0.5)' }}
            >
              {currentNum ?? '??'}
            </div>

            {/* Barras animadas */}
            <div className="flex justify-center items-end gap-2 h-14">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 rounded-full"
                  style={{ background: '#5cb516' }}
                  animate={{ height: ['16px', `${20 + Math.random() * 32}px`, '16px'] }}
                  transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.07 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* WINNER */}
        {phase === 'winner' && winner && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160 }}
            className="text-center space-y-5 w-full max-w-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="text-7xl"
            >
              🏆
            </motion.div>

            <div>
              <h2 className="font-display font-black text-4xl mb-1" style={{ color: '#9de360' }}>
                ¡Ganador!
              </h2>
              <p style={{ color: 'rgba(240,244,236,0.55)' }}>{winner.prize}</p>
            </div>

            {/* Imagen del premio */}
            {winner.prizeImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(92,181,22,0.30)' }}
              >
                <img
                  src={winner.prizeImage}
                  alt="Premio"
                  className="w-full h-44 object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </motion.div>
            )}

            {/* Número ganador */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, delay: 0.25 }}
              className="font-mono font-black text-8xl"
              style={{ color: '#fde68a', textShadow: '0 0 40px rgba(251,191,36,0.4)' }}
            >
              #{winner.number}
            </motion.div>

            {/* Card del ganador */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="winner-glow rounded-2xl p-5"
              style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'rgba(240,244,236,0.50)' }}>Ganador</p>
              <p className="font-display font-black text-2xl text-white">{winner.name}</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => { setPhase(null); setWinner(null); }}
              className="btn-secondary w-full py-4 text-base"
            >
              Cerrar
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
