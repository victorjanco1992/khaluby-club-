import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { getSocket } from '../lib/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import api from '../lib/api.js';

function launchFireworks() {
  const end = Date.now() + 4500;
  const colors = ['#5cb516', '#9de360', '#fbbf24', '#fff', '#f472b6'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  confetti({ particleCount: 250, spread: 140, origin: { y: 0.4 }, colors });
  frame();
}

function StartingSoonBanner({ data, onDismiss, onWatch }) {
  const [remaining, setRemaining] = useState(data.secondsUntilStart);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      className="fixed bottom-24 left-3 right-3 z-[95] rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(10,20,8,0.97)',
        border: '1px solid rgba(92,181,22,0.45)',
        boxShadow: '0 8px 40px rgba(92,181,22,0.25)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <motion.div
        className="h-1.5" style={{ background: 'linear-gradient(90deg, #5cb516, #9de360)' }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: data.secondsUntilStart, ease: 'linear' }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              className="text-2xl">🎰</motion.span>
            <div>
              <p className="font-bold text-white text-sm">¡El sorteo está por empezar!</p>
              <p className="text-xs" style={{ color: 'rgba(240,244,236,0.55)' }}>{data.raffleTitle}</p>
            </div>
          </div>
          <button onClick={onDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.50)' }}>✕</button>
        </div>
        {data.prizeImage && (
          <img src={data.prizeImage} alt={data.prize}
            className="w-full h-28 object-cover rounded-xl mb-3"
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio</p>
            <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {data.prize}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono font-black text-3xl" style={{ color: '#9de360' }}>{remaining}</p>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>seg</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.60)' }}>
            Ahora no
          </button>
          <button onClick={onWatch}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #5cb516, #459110)', color: '#fff' }}>
            👁 Ver en vivo →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LiveScreen({ phase, currentNum, winner, raffleInfo, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(8,13,5,0.97)', backdropFilter: 'blur(16px)' }}
    >
      {phase === 'spinning' && (
        <div className="text-center space-y-5 w-full max-w-sm">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 live-dot" />
            🎰 SORTEO EN VIVO
          </motion.div>

          {/* Info del sorteo */}
          {raffleInfo && (
            <div>
              <p className="font-display font-bold text-2xl text-white">{raffleInfo.raffleTitle}</p>
              <p className="text-sm mt-0.5" style={{ color: '#fde68a' }}>🏆 {raffleInfo.prize}</p>
            </div>
          )}

          {/* Imagen del premio */}
          {raffleInfo?.prizeImage && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(92,181,22,0.20)' }}>
              <img src={raffleInfo.prizeImage} alt="Premio"
                className="w-full h-36 object-cover"
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}

          {/* Número girando */}
          <div className="font-mono font-black"
            style={{
              fontSize: 'clamp(4rem, 20vw, 7rem)',
              color: '#9de360',
              textShadow: '0 0 40px rgba(92,181,22,0.6)',
              letterSpacing: '0.1em',
            }}>
            {String(currentNum ?? 0).padStart(4, '0')}
          </div>

          {/* Barras */}
          <div className="flex justify-center items-end gap-2 h-12">
            {[...Array(9)].map((_, i) => (
              <motion.div key={i} className="w-2 rounded-full" style={{ background: '#5cb516' }}
                animate={{ height: ['16px', `${20 + Math.random() * 32}px`, '16px'] }}
                transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.07 }} />
            ))}
          </div>

          <p style={{ color: 'rgba(240,244,236,0.50)' }}>El número ganador está siendo elegido...</p>

          <button onClick={onClose}
            className="text-xs py-2 px-5 rounded-full"
            style={{ color: 'rgba(240,244,236,0.35)', background: 'rgba(255,255,255,0.05)' }}>
            Minimizar
          </button>
        </div>
      )}

      {phase === 'winner' && winner && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160 }}
          className="text-center space-y-4 w-full max-w-sm"
        >
          <motion.div
            initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="text-7xl">🏆</motion.div>

          <div>
            <h2 className="font-display font-black text-4xl mb-1" style={{ color: '#9de360' }}>¡Ganador!</h2>
            <p style={{ color: 'rgba(240,244,236,0.55)' }}>{winner.prize}</p>
          </div>

          {winner.prizeImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(92,181,22,0.30)' }}>
              <img src={winner.prizeImage} alt="Premio"
                className="w-full h-44 object-cover"
                onError={e => { e.target.style.display = 'none'; }} />
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, delay: 0.25 }}
            className="font-mono font-black text-8xl"
            style={{ color: '#fde68a', textShadow: '0 0 40px rgba(251,191,36,0.4)' }}>
            #{winner.number}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="winner-glow rounded-2xl p-5"
            style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}>
            <p className="text-xs mb-1" style={{ color: 'rgba(240,244,236,0.50)' }}>Ganador</p>
            <p className="font-display font-black text-2xl text-white">{winner.name}</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            onClick={onClose} className="btn-secondary w-full py-4 text-base">
            Cerrar
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function LiveRaffleOverlay() {
  const { isAuthenticated, isAdmin, user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [startingSoon, setStartingSoon] = useState(null);
  const [livePhase, setLivePhase] = useState(null);
  const [showLive, setShowLive] = useState(false);
  const [currentNum, setCurrentNum] = useState(0);
  const [winner, setWinner] = useState(null);
  const [raffleInfo, setRaffleInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const spinIntervalRef = useRef(null);
  const lastRaffleIdRef = useRef(null);
  const lastStatusRef = useRef(null);
  const winnerShownRef = useRef(false);

  // ===== POLLING cada 2 segundos =====
  const { data: pollData } = useQuery({
    queryKey: ['live-poll'],
    queryFn: async () => {
      // Buscar sorteo activo O el último finalizado
      const [activeRes, lastRes] = await Promise.allSettled([
        api.get('/api/raffles?limit=1').then(r => r.data.raffles[0]),
        api.get('/api/raffles/last').then(r => r.data),
      ]);
      return {
        active: activeRes.status === 'fulfilled' ? activeRes.value : null,
        last: lastRes.status === 'fulfilled' ? lastRes.value : null,
      };
    },
    enabled: isAuthenticated() && !isAdmin(),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!pollData) return;
    const { active, last } = pollData;

    // Hay un sorteo activo
    if (active) {
      const isNew = lastRaffleIdRef.current !== active.id;
      if (isNew) {
        lastRaffleIdRef.current = active.id;
        winnerShownRef.current = false;
      }
    }

    // Detectar sorteo recién finalizado que no hemos mostrado
    if (last?.raffle && !winnerShownRef.current) {
      const raffle = last.raffle;
      const winnerEntry = last.winnerEntry;

      // Si el sorteo terminó hace menos de 30 segundos → mostrar ganador
      const finishedAt = new Date(raffle.updatedAt).getTime();
      const now = Date.now();
      const secsSinceFinished = (now - finishedAt) / 1000;

      if (
        secsSinceFinished < 30 &&
        raffle.winnerNumber &&
        lastRaffleIdRef.current === raffle.id &&
        livePhase === 'spinning'
      ) {
        winnerShownRef.current = true;
        clearInterval(spinIntervalRef.current);

        const w = {
          number: raffle.winnerNumber,
          name: winnerEntry?.user?.name || 'Ganador',
          prize: raffle.prize,
          prizeImage: raffle.prizeImage,
          raffleTitle: raffle.title,
        };

        setWinner(w);
        setLivePhase('winner');
        setShowLive(true);
        launchFireworks();

        // Refrescar notificaciones
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    }
  }, [pollData, livePhase]);

  // ===== SOCKET =====
  useEffect(() => {
    if (!isAuthenticated() || isAdmin()) return;

    const socket = getSocket(user?.id);

    socket.on('raffle:starting-soon', (data) => {
      setStartingSoon(data);
      setDismissed(false);
    });

    socket.on('raffle:spinning', (data) => {
      setStartingSoon(null);
      setDismissed(false);
      setWinner(null);
      winnerShownRef.current = false;

      if (data.raffleId) lastRaffleIdRef.current = data.raffleId;

      setRaffleInfo({
        raffleTitle: data.raffleTitle,
        prize: data.prize,
        prizeImage: data.prizeImage,
      });

      setLivePhase('spinning');
      setShowLive(true);

      const nums = data.numbers?.length > 0 ? data.numbers : [1, 2, 3, 4, 5];
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);

      // Auto-parar la animación local si el socket no trae el winner
      setTimeout(() => clearInterval(spinIntervalRef.current), data.spinDurationMs || 6000);
    });

    socket.on('raffle:winner', ({ winner: w, raffleId }) => {
      clearInterval(spinIntervalRef.current);
      winnerShownRef.current = true;

      setCurrentNum(w.number);
      setWinner(w);
      setLivePhase('winner');
      setShowLive(true);
      launchFireworks();

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['raffles-client'] });
    });

    socket.on('raffle:finished', () => {
      queryClient.invalidateQueries({ queryKey: ['raffles-client'] });
      queryClient.invalidateQueries({ queryKey: ['live-poll'] });
    });

    return () => {
      socket.off('raffle:starting-soon');
      socket.off('raffle:spinning');
      socket.off('raffle:winner');
      socket.off('raffle:finished');
      clearInterval(spinIntervalRef.current);
    };
  }, [isAuthenticated(), isAdmin(), user?.id]);

  if (!isAuthenticated() || isAdmin()) return null;

  return (
    <>
      {/* Banner aviso previo */}
      <AnimatePresence>
        {startingSoon && !showLive && (
          <StartingSoonBanner
            data={startingSoon}
            onDismiss={() => { setStartingSoon(null); setDismissed(true); }}
            onWatch={() => {
              setStartingSoon(null);
              if (livePhase) setShowLive(true);
              else navigate('/sorteos');
            }}
          />
        )}
      </AnimatePresence>

      {/* Pantalla en vivo */}
      <AnimatePresence>
        {showLive && livePhase && (
          <LiveScreen
            phase={livePhase}
            currentNum={currentNum}
            winner={winner}
            raffleInfo={raffleInfo}
            onClose={() => {
              setShowLive(false);
              if (livePhase === 'winner') {
                setLivePhase(null);
                setWinner(null);
                setDismissed(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
