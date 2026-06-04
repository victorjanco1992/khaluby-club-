import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import toast from 'react-hot-toast';

function launchFireworks() {
  const end = Date.now() + 5000;

  const colors = ['#8b5cf6', '#a78bfa', '#fbbf24', '#ffffff', '#f472b6'];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors
    });

    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors
    });

    requestAnimationFrame(frame);
  };

  confetti({
    particleCount: 250,
    spread: 130,
    origin: { y: 0.4 },
    colors
  });

  frame();
}

function DigitDrum({ digit, isSpinning }) {
  return (
    <div
      className="w-20 h-28 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)'
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={isSpinning ? `${digit}-${Math.random()}` : digit}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.08 }}
          className="font-mono font-black text-5xl text-white absolute select-none"
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
    <div className="flex gap-3 justify-center">
      {str.split('').map((d, i) => (
        <DigitDrum key={i} digit={d} isSpinning={isSpinning} />
      ))}
    </div>
  );
}

function buildWhatsAppLink(winner) {
  let phone = winner.phone.replace(/[\s\-\(\)]/g, '');

  if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  if (!phone.startsWith('+')) {
    phone = `549${phone}`;
  } else {
    phone = phone.replace('+', '');
  }

  const msg = encodeURIComponent(
    `¡Hola ${winner.name}! 🎉\n\n` +
      `Te contactamos desde *Despensa Khaluby* para avisarte que ¡*GANASTE* el sorteo!\n\n` +
      `🏆 Premio: *${winner.prize}*\n` +
      `🎫 Sorteo: ${winner.raffleTitle}\n` +
      `🔢 Tu número ganador: *#${winner.number}*\n\n` +
      `Pasate por la despensa para reclamar tu premio. ¡Felicitaciones! 🥳`
  );

  return `https://wa.me/${phone}?text=${msg}`;
}

export default function AdminSorteo() {
  const { id } = useParams();

  const [phase, setPhase] = useState('ready');
  const [currentNum, setCurrentNum] = useState(0);
  const [winner, setWinner] = useState(null);

  const spinRef = useRef(null);

  const { data: raffle, isLoading } = useQuery({
    queryKey: ['raffle-detail', id],
    queryFn: () =>
      api.get(`/api/raffles/${id}`).then((r) => r.data.raffle)
  });

  useEffect(() => {
    const socket = getSocket();

    socket.emit('join:admin');

    socket.on('raffle:spinning', (data) => {
      setPhase('drawing');

      const nums = data.numbers || [1];

      clearInterval(spinRef.current);

      spinRef.current = setInterval(() => {
        setCurrentNum(
          nums[Math.floor(Math.random() * nums.length)]
        );
      }, 80);

      setTimeout(() => {
        clearInterval(spinRef.current);
      }, data.spinDurationMs || 6000);
    });

    socket.on('raffle:winner', ({ winner: w }) => {
      clearInterval(spinRef.current);

      setWinner(w);
      setCurrentNum(w.number);
      setPhase('winner');

      setTimeout(() => {
        launchFireworks();
      }, 400);
    });

    return () => {
      socket.off('raffle:spinning');
      socket.off('raffle:winner');

      clearInterval(spinRef.current);
    };
  }, []);

  const drawMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/raffles/${id}/draw`),

    onSuccess: (res) => {
      setWinner(res.data.winner);
    },

    onError: (err) => {
      toast.error(
        err.response?.data?.error || 'Error al sortear'
      );

      setPhase('ready');
    }
  });

  const handleDraw = () => {
    if (!raffle || raffle.entries?.length === 0) {
      return toast.error('No hay participantes');
    }

    setPhase('drawing');
    setWinner(null);

    drawMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        Cargando sorteo...
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="text-center py-20 text-white/40">
        Sorteo no encontrado
      </div>
    );
  }

  const entries = raffle.entries || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <Link
            to="/admin/sorteos"
            className="text-white/40 hover:text-white text-sm transition-colors mb-2 inline-block"
          >
            ← Volver
          </Link>

          <h1 className="font-display font-bold text-3xl text-white">
            {raffle.title}
          </h1>

          <p className="text-amber-300 mt-1">
            🏆 {raffle.prize}
          </p>
        </div>

        <div className="text-right">
          <p className="font-mono font-bold text-4xl text-white">
            {entries.length}
          </p>

          <p className="text-white/50 text-sm">
            participantes
          </p>
        </div>
      </div>

      {/* Imagen premio */}
      {raffle.prizeImage && (
        <div className="mb-6">
          <img
            src={raffle.prizeImage}
            alt={raffle.prize}
            className="w-full h-48 object-cover rounded-2xl border border-white/10"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Stage */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">

        {/* READY */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-8 w-full"
          >
            <div>
              <p className="text-white/50 text-lg mb-6">
                Número ganador
              </p>

              <NumberDisplay
                value="????"
                isSpinning={false}
              />
            </div>

            {entries.length === 0 ? (
              <div className="card p-6 border border-amber-500/25 max-w-sm mx-auto">
                <p className="text-amber-400">
                  ⚠️ No hay participantes en este sorteo
                </p>
              </div>
            ) : (
              <button
                onClick={handleDraw}
                disabled={drawMutation.isPending}
                className="btn-primary text-xl px-14 py-5 shadow-2xl shadow-violet-500/30"
              >
                🎰 ¡INICIAR SORTEO!
              </button>
            )}

            <p className="text-white/35 text-sm">
              {entries.length} número
              {entries.length !== 1 ? 's' : ''} en el bombo
            </p>
          </motion.div>
        )}

        {/* DRAWING */}
        {phase === 'drawing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-8"
          >
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: 'rgb(252,165,165)',
                border: '1px solid rgba(239,68,68,0.3)'
              }}
            >
              <span className="w-2 h-2 bg-red-400 rounded-full live-dot" />
              SORTEANDO EN VIVO
            </motion.div>

            <NumberDisplay
              value={currentNum}
              isSpinning={true}
            />

            <div className="flex justify-center items-end gap-1.5 h-16">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 rounded-full"
                  style={{
                    background: 'rgb(139,92,246)'
                  }}
                  animate={{
                    height: [
                      '20px',
                      `${20 + Math.random() * 40}px`,
                      '20px'
                    ]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.4 + Math.random() * 0.4,
                    delay: i * 0.05
                  }}
                />
              ))}
            </div>

            <p className="text-white/50">
              Buscando al ganador...
            </p>
          </motion.div>
        )}

        {/* WINNER */}
        {phase === 'winner' && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-6 w-full"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 150,
                delay: 0.2
              }}
              className="text-7xl"
            >
              🏆
            </motion.div>

            <div>
              <p className="text-violet-400 font-bold uppercase tracking-widest text-sm mb-4">
                ¡Número Ganador!
              </p>

              <NumberDisplay
                value={winner.number}
                isSpinning={false}
              />
            </div>

            {/* Winner Card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="winner-glow rounded-2xl p-6 max-w-md mx-auto"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.35)'
              }}
            >
              <p className="text-white/55 text-sm mb-1">
                Ganador
              </p>

              <p className="font-display font-black text-3xl text-white mb-2">
                {winner.name}
              </p>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">
                    DNI
                  </span>

                  <span className="font-mono text-white">
                    {winner.dni}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/50">
                    Teléfono
                  </span>

                  <span className="font-mono text-white">
                    {winner.phone}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/50">
                    Premio
                  </span>

                  <span className="text-amber-300 font-semibold">
                    {winner.prize}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Botones */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <a
                href={buildWhatsAppLink(winner)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #25d366, #128c7e)',
                  boxShadow:
                    '0 8px 32px rgba(37,211,102,0.3)'
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 fill-current"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>

                Notificar por WhatsApp
              </a>

              <Link
                to="/admin/sorteos"
                className="btn-secondary text-center py-4 px-8"
              >
                Volver a sorteos
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Participantes */}
      {phase === 'ready' && entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">
            Participantes ({entries.length})
          </h3>

          <div className="card p-4 max-h-44 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {entries.slice(0, 60).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-xs truncate"
                >
                  <span className="font-mono text-violet-400 flex-shrink-0">
                    #{entry.number}
                  </span>

                  <span className="text-white/60 truncate">
                    {entry.user?.name?.split(' ')[0]}
                  </span>
                </div>
              ))}

              {entries.length > 60 && (
                <div className="text-white/30 text-xs col-span-3 text-center pt-1">
                  +{entries.length - 60} más...
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}