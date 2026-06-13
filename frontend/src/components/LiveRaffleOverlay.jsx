import { useEffect, useState, useRef, useCallback } from 'react';
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

function DigitDrum({ digit, isSpinning }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center overflow-hidden relative"
      style={{
        width: 'clamp(56px, 15vw, 80px)',
        height: 'clamp(72px, 19vw, 104px)',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={isSpinning ? `${digit}-${Math.random()}` : digit}
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 44, opacity: 0 }}
          transition={{ duration: 0.08 }}
          className="font-mono font-black text-white absolute select-none"
          style={{ fontSize: 'clamp(2rem, 8vw, 3.2rem)' }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function NumberDisplay({ value, isSpinning }) {
  const str = String(value || 0).padStart(4, '0');
  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {str.split('').map((d, i) => (
        <DigitDrum key={i} digit={d} isSpinning={isSpinning} />
      ))}
    </div>
  );
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
        className="h-1.5"
        style={{ background: 'linear-gradient(90deg, #5cb516, #9de360)' }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: data.secondsUntilStart, ease: 'linear' }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-2xl flex-shrink-0"
            >🎰</motion.span>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">¡Sorteo por empezar!</p>
              <p className="text-xs truncate" style={{ color: 'rgba(240,244,236,0.55)' }}>
                {data.raffleTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="font-mono font-black text-2xl" style={{ color: '#9de360' }}>{remaining}</p>
              <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>seg</p>
            </div>
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.50)' }}
            >✕</button>
          </div>
        </div>

        {data.prizeImage && (
          <img src={data.prizeImage} alt={data.prize}
            className="w-full h-24 object-cover rounded-xl mb-3"
            onError={e => { e.target.style.display = 'none'; }} />
        )}

        <div className="mb-3">
          <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio en juego</p>
          <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {data.prize}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.60)' }}
          >
            Ahora no
          </button>
          <button
            onClick={onWatch}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #5cb516, #459110)', color: '#fff' }}
          >
            👁 Ver en vivo
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
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: 'rgba(8,13,5,0.98)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-3 h-3 rounded-full bg-red-400"
          />
          <span className="text-sm font-bold" style={{ color: '#fca5a5' }}>EN VIVO</span>
        </div>
        <p className="font-display font-bold text-white text-sm truncate mx-3 flex-1 text-center">
          {raffleInfo?.raffleTitle || 'Sorteo'}
        </p>
        {phase === 'winner' ? (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.60)' }}
          >✕</button>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 overflow-y-auto">

        {/* SPINNING */}
        {phase === 'spinning' && (
          <div className="text-center space-y-5 w-full max-w-sm">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 live-dot" />
              SORTEANDO EN VIVO
            </motion.div>

            {raffleInfo?.prizeImage && (
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(92,181,22,0.20)' }}>
                <img src={raffleInfo.prizeImage} alt="Premio"
                  className="w-full h-36 object-cover"
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
            )}

            <div>
              <p className="text-xs mb-1" style={{ color: 'rgba(240,244,236,0.50)' }}>Premio</p>
              <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {raffleInfo?.prize}</p>
            </div>

            <NumberDisplay value={currentNum} isSpinning={true} />

            <div className="flex justify-center items-end gap-1.5 h-10">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{ background: '#5cb516' }}
                  animate={{ height: ['12px', `${16 + Math.random() * 24}px`, '12px'] }}
                  transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.07 }}
                />
              ))}
            </div>

            <p style={{ color: 'rgba(240,244,236,0.50)' }}>
              El número ganador está siendo elegido...
            </p>
          </div>
        )}

        {/* WINNER */}
        {phase === 'winner' && winner && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160 }}
            className="text-center space-y-4 w-full max-w-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="text-6xl"
            >🏆</motion.div>

            <div>
              <h2 className="font-display font-black text-4xl mb-1" style={{ color: '#9de360' }}>
                ¡Ganador!
              </h2>
              <p style={{ color: 'rgba(240,244,236,0.55)' }}>{winner.prize}</p>
            </div>

            {winner.prizeImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(92,181,22,0.30)' }}
              >
                <img src={winner.prizeImage} alt="Premio"
                  className="w-full h-40 object-cover"
                  onError={e => { e.target.style.display = 'none'; }} />
              </motion.div>
            )}

            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, delay: 0.25 }}
            >
              <NumberDisplay value={winner.number} isSpinning={false} />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="winner-glow rounded-2xl p-5"
              style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'rgba(240,244,236,0.50)' }}>Ganador</p>
              <p className="font-display font-black text-2xl text-white">{winner.name}</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className="btn-secondary w-full py-4 text-base"
            >
              Cerrar
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Desaceleración hacia el número ganador ───────────────────────────────────
// Llama a setCurrentNum con números random por 2.5s, luego va intercalando
// el número ganador cada vez más seguido hasta que queda fijo.
function runSlowdown(winnerNumber, nums, setCurrentNum, spinIntervalRef, onDone) {
  clearInterval(spinIntervalRef.current);

  const TOTAL_MS = 2500;       // duración de la desaceleración
  const START_INTERVAL = 80;   // velocidad inicial (ms entre cambios)
  const END_INTERVAL = 400;    // velocidad final antes de parar
  const startTime = Date.now();

  const tick = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / TOTAL_MS, 1); // 0 → 1

    // Probabilidad de mostrar el ganador crece con el progreso
    const showWinner = Math.random() < progress * progress;
    setCurrentNum(showWinner ? winnerNumber : nums[Math.floor(Math.random() * nums.length)]);

    if (progress >= 1) {
      // Terminó — fijar número ganador y avisar
      setCurrentNum(winnerNumber);
      onDone();
      return;
    }

    // Intervalo crece (se desacelera) con el tiempo
    const interval = START_INTERVAL + (END_INTERVAL - START_INTERVAL) * progress;
    spinIntervalRef.current = setTimeout(tick, interval);
  };

  spinIntervalRef.current = setTimeout(tick, START_INTERVAL);
}
// ─────────────────────────────────────────────────────────────────────────────

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

  const spinIntervalRef = useRef(null);
  const spinNumsRef = useRef([1, 2, 3]); // números disponibles para el spinner
  const processedRef = useRef({ drawing: null, finished: null });
  const processedBroadcastRef = useRef(null);

  // Función centralizada para resolver el ganador con desaceleración
  const resolveWinner = useCallback((w, raffleId) => {
    if (processedRef.current.finished === raffleId) return;
    processedRef.current.finished = raffleId;

    const nums = spinNumsRef.current;

    runSlowdown(w.number, nums, setCurrentNum, spinIntervalRef, () => {
      // Una vez que el número queda fijo, mostrar pantalla de ganador
      setWinner(w);
      setLivePhase('winner');
      setShowLive(true);
      launchFireworks();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['raffles-client'] });
    });
  }, [queryClient]);

  // ===== POLLING live-status =====
  const { data: liveStatus } = useQuery({
    queryKey: ['live-status'],
    queryFn: () => api.get('/api/raffles/live-status').then(r => r.data).catch(() => ({ phase: 'idle' })),
    enabled: isAuthenticated() && !isAdmin(),
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!liveStatus) return;

    if (liveStatus.phase === 'drawing') {
      const r = liveStatus;
      if (processedRef.current.drawing === r.raffleId) return;
      processedRef.current.drawing = r.raffleId;
      processedRef.current.finished = null;

      setRaffleInfo({
        raffleTitle: r.raffleTitle,
        prize: r.prize,
        prizeImage: r.prizeImage,
      });
      setWinner(null);
      setLivePhase('spinning');
      setShowLive(true);

      const nums = [1, 2, 3, 4, 5]; // fallback si no hay números
      spinNumsRef.current = nums;
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);
    }

    if (liveStatus.phase === 'finished') {
      const r = liveStatus;
      if (processedRef.current.finished === r.raffleId) return;

      resolveWinner({
        number: r.winnerNumber,
        name: r.winnerName,
        prize: r.prize,
        prizeImage: r.prizeImage,
        raffleTitle: r.raffleTitle,
      }, r.raffleId);
    }
  }, [liveStatus?.phase, liveStatus?.raffleId]);

  // ===== POLLING broadcast =====
  const { data: broadcastData } = useQuery({
    queryKey: ['live-broadcast'],
    queryFn: () => api.get('/api/raffles/broadcast').then(r => r.data).catch(() => ({ broadcast: null })),
    enabled: isAuthenticated() && !isAdmin(),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!broadcastData?.broadcast) return;
    const b = broadcastData.broadcast;
    if (processedBroadcastRef.current === b.id) return;
    processedBroadcastRef.current = b.id;

    const data = b.data;

    if (b.type === 'starting-soon') {
      const startsAt = new Date(data.startsAt).getTime();
      const secsLeft = Math.max(0, Math.round((startsAt - Date.now()) / 1000));
      if (secsLeft > 0) {
        setStartingSoon({ ...data, secondsUntilStart: secsLeft });
      }
    }

    if (b.type === 'spinning') {
      if (processedRef.current.drawing === data.raffleId) return;
      processedRef.current.drawing = data.raffleId;
      processedRef.current.finished = null;

      setRaffleInfo({
        raffleTitle: data.raffleTitle,
        prize: data.prize,
        prizeImage: data.prizeImage,
      });
      setWinner(null);
      setLivePhase('spinning');
      setShowLive(true);

      const nums = data.numbers?.length > 0 ? data.numbers : [1, 2, 3];
      spinNumsRef.current = nums;
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);
    }
  }, [broadcastData?.broadcast?.id, broadcastData?.broadcast?.type]);

  // ===== SOCKET =====
  useEffect(() => {
    if (!isAuthenticated() || isAdmin()) return;
    const socket = getSocket(user?.id);

    socket.on('raffle:starting-soon', (data) => {
      setStartingSoon(data);
    });

    socket.on('raffle:spinning', (data) => {
      if (processedRef.current.drawing === data.raffleId) return;
      processedRef.current.drawing = data.raffleId;
      processedRef.current.finished = null;

      setStartingSoon(null);
      setRaffleInfo({
        raffleTitle: data.raffleTitle,
        prize: data.prize,
        prizeImage: data.prizeImage,
      });
      setWinner(null);
      setLivePhase('spinning');
      setShowLive(true);

      const nums = data.numbers?.length > 0 ? data.numbers : [1, 2, 3];
      spinNumsRef.current = nums;
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);
    });

    socket.on('raffle:winner', ({ winner: w, raffleId }) => {
      resolveWinner(w, raffleId);
    });

    socket.on('raffle:finished', () => {
      queryClient.invalidateQueries({ queryKey: ['live-status'] });
      queryClient.invalidateQueries({ queryKey: ['raffles-client'] });
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
      <AnimatePresence>
        {startingSoon && !showLive && (
          <StartingSoonBanner
            data={startingSoon}
            onDismiss={() => setStartingSoon(null)}
            onWatch={() => {
              setStartingSoon(null);
              if (livePhase) setShowLive(true);
              else navigate('/sorteos');
            }}
          />
        )}
      </AnimatePresence>

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
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
