import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../lib/api.js';
import { getSocket } from '../lib/socket.js';

function launchFireworks() {
  const end = Date.now() + 4500;
  const colors = ['#8b5cf6', '#f4dca8', '#ffffff', '#fbbf24'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 }, colors });
  frame();
}

function RollingDigits({ value, isSpinning }) {
  const str = String(value || 0).padStart(4, '0');
  return (
    <div className="flex gap-3 justify-center">
      {str.split('').map((digit, i) => (
        <div
          key={i}
          className="w-16 h-20 rounded-xl flex items-center justify-center overflow-hidden relative"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={isSpinning ? `${i}-${digit}-${Math.random()}` : `${i}-${digit}`}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.09 }}
              className="font-mono font-black text-4xl text-white absolute"
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function SorteoPublico() {
  const [phase, setPhase] = useState('idle');
  const [currentNum, setCurrentNum] = useState(0);
  const [liveWinner, setLiveWinner] = useState(null);
  const spinRef = useRef(null);

  const { data, refetch } = useQuery({
    queryKey: ['last-raffle-public'],
    queryFn: () => api.get('/api/raffles/last').then(r => r.data).catch(() => null),
    retry: false,
  });

  useEffect(() => {
    const socket = getSocket();

    socket.on('raffle:spinning', (data) => {
      setPhase('spinning');
      setLiveWinner(null);
      const nums = data.numbers || [1];
      clearInterval(spinRef.current);
      spinRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);
      setTimeout(() => clearInterval(spinRef.current), data.spinDurationMs || 6000);
    });

    socket.on('raffle:winner', ({ winner: w }) => {
      clearInterval(spinRef.current);
      setCurrentNum(w.number);
      setLiveWinner(w);
      setPhase('winner');
      launchFireworks();
      setTimeout(() => refetch(), 1000);
    });

    socket.on('raffle:activated', () => {
      setPhase('idle');
      setLiveWinner(null);
      refetch();
    });

    return () => {
      socket.off('raffle:spinning');
      socket.off('raffle:winner');
      socket.off('raffle:activated');
      clearInterval(spinRef.current);
    };
  }, []);

  const raffle = data?.raffle;
  const winnerEntry = data?.winnerEntry;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#080b14' }}>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.06)' }}
      />

      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(13,17,32,0.6)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">Despensa Khaluby</h1>
            <p className="text-white/35 text-xs">Sorteos en vivo</p>
          </div>
          <Link to="/login" className="btn-secondary text-sm py-2 px-4">Ingresar</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 text-center">

        {/* SPINNING */}
        <AnimatePresence>
          {phase === 'spinning' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium animate-pulse"
                style={{ background: 'rgba(239,68,68,0.15)', color: 'rgb(252,165,165)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <span className="w-2 h-2 bg-red-400 rounded-full live-dot" />
                EN VIVO
              </div>
              <h2 className="font-display font-bold text-4xl text-white">¡Sorteo en curso!</h2>
              <RollingDigits value={currentNum} isSpinning={true} />
              <div className="flex justify-center items-end gap-1.5 h-12">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{ background: 'rgb(139,92,246)' }}
                    animate={{ height: ['16px', `${24 + Math.random() * 24}px`, '16px'] }}
                    transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.07 }}
                  />
                ))}
              </div>
              <p className="text-white/40 animate-pulse">El número ganador está siendo elegido...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WINNER EN VIVO */}
        <AnimatePresence>
          {phase === 'winner' && liveWinner && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 180, delay: 0.2 }} className="text-7xl">
                🏆
              </motion.div>
              <h2 className="font-display font-black text-5xl text-white">¡Ganador!</h2>

              {/* Imagen del premio — completa, sin recortar */}
              {liveWinner.prizeImage && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl overflow-hidden border max-w-sm mx-auto"
                  style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <img
                    src={liveWinner.prizeImage}
                    alt={liveWinner.prize}
                    className="w-full max-h-72 object-contain"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </motion.div>
              )}

              <RollingDigits value={liveWinner.number} isSpinning={false} />

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl p-6 max-w-sm mx-auto winner-glow"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)' }}
              >
                {/* Sin DNI — solo nombre */}
                <p className="font-display font-black text-3xl text-white">{liveWinner.name}</p>
                <p className="text-amber-300 font-semibold mt-2">{liveWinner.prize}</p>
              </motion.div>

              <button onClick={() => setPhase('idle')} className="btn-secondary">Ver historial</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IDLE — último sorteo */}
        {phase === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {raffle ? (
              <>
                <div>
                  <span
                    className="badge mb-4 inline-flex"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Último sorteo finalizado
                  </span>
                  <h2 className="font-display font-bold text-3xl text-white">{raffle.title}</h2>
                  <p className="text-white/50 mt-2">
                    Premio: <span className="text-amber-300 font-semibold">{raffle.prize}</span>
                  </p>
                  <p className="text-white/30 text-sm mt-1">
                    {new Date(raffle.updatedAt).toLocaleDateString('es-AR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Imagen del premio — completa, sin recortar */}
                {raffle.prizeImage && (
                  <div
                    className="rounded-2xl overflow-hidden border max-w-sm mx-auto"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <img
                      src={raffle.prizeImage}
                      alt={raffle.prize}
                      className="w-full max-h-72 object-contain"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                {/* Número ganador */}
                <div className="card p-8 max-w-sm mx-auto">
                  <p className="text-white/45 text-sm mb-3">Número ganador</p>
                  <div className="font-mono font-black text-7xl mb-4" style={{ color: '#a78bfa' }}>
                    #{raffle.winnerNumber}
                  </div>
                  {/* Solo nombre, sin DNI */}
                  {winnerEntry && (
                    <p className="font-display font-bold text-2xl text-white">{winnerEntry.user.name}</p>
                  )}
                </div>

                <div className="card p-4 max-w-sm mx-auto">
                  <p className="text-white/40 text-sm">
                    Total de participantes:{' '}
                    <span className="text-white font-semibold">{raffle._count?.entries || 0}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="py-16">
                <div className="text-6xl mb-4">🎰</div>
                <h2 className="font-display font-bold text-2xl text-white mb-2">Próximo sorteo</h2>
                <p className="text-white/45">No hay sorteos finalizados aún.</p>
                <Link to="/register" className="btn-primary mt-6 inline-block">Registrate gratis</Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
