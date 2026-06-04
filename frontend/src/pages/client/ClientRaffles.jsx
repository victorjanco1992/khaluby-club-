import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';

const STATUS_MAP = {
  PENDING:  { label: 'Próximamente', style: { background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.30)' } },
  ACTIVE:   { label: 'Activo',       style: { background: 'rgba(92,181,22,0.15)',  color: '#9de360', border: '1px solid rgba(92,181,22,0.30)'  } },
  DRAWING:  { label: '¡SORTEANDO!',  style: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)'  } },
  FINISHED: { label: 'Finalizado',   style: { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.40)', border: '1px solid rgba(255,255,255,0.10)' } },
};

export default function ClientRaffles() {
  const [liveWinner, setLiveWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentNum, setCurrentNum] = useState(null);

  const { data, refetch } = useQuery({
    queryKey: ['raffles-client'],
    queryFn: () => api.get('/api/raffles').then(r => r.data),
  });

  const { data: myNumbersData } = useQuery({
    queryKey: ['my-numbers'],
    queryFn: () => api.get('/api/raffles/my-numbers').then(r => r.data.entries),
  });

  useEffect(() => {
    const socket = getSocket();

    socket.on('raffle:spinning', (data) => {
      setIsSpinning(true);
      setLiveWinner(null);
      const nums = data.numbers || [1];
      const interval = setInterval(() => {
        setCurrentNum(nums[Math.floor(Math.random() * nums.length)]);
      }, 80);
      setTimeout(() => { clearInterval(interval); setIsSpinning(false); }, data.spinDurationMs || 6000);
    });

    socket.on('raffle:winner', ({ winner }) => {
      setIsSpinning(false);
      setCurrentNum(winner.number);
      setLiveWinner(winner);
      confetti({ particleCount: 220, spread: 90, origin: { y: 0.5 }, colors: ['#5cb516', '#9de360', '#fbbf24', '#fff'] });
      setTimeout(() => refetch(), 500);
    });

    socket.on('raffle:activated', () => refetch());
    socket.on('raffle:finished', () => refetch());

    return () => {
      socket.off('raffle:spinning');
      socket.off('raffle:winner');
      socket.off('raffle:activated');
      socket.off('raffle:finished');
    };
  }, []);

  const raffles = data?.raffles || [];
  const myNumbers = myNumbersData || [];

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl text-white">Sorteos</h2>
        <Link
          to="/sorteo"
          target="_blank"
          className="text-sm font-medium flex items-center gap-1 transition-colors"
          style={{ color: '#9de360' }}
        >
          🏆 Ver último
        </Link>
      </div>

      {/* Overlay en vivo */}
      <AnimatePresence>
        {(isSpinning || liveWinner) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
            style={{ background: 'rgba(8,13,5,0.96)', backdropFilter: 'blur(12px)' }}
          >
            {isSpinning && (
              <div className="text-center space-y-6">
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 live-dot" />
                  EN VIVO
                </div>
                <h2 className="font-display font-bold text-4xl text-white">¡Sorteando!</h2>
                <div className="font-mono font-black text-8xl text-white">{currentNum ?? '??'}</div>
                <div className="flex justify-center gap-1.5">
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{ background: '#5cb516' }}
                      animate={{ height: ['16px', '40px', '16px'] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {liveWinner && !isSpinning && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-4 max-w-sm w-full"
              >
                <div className="text-7xl">🏆</div>
                <h2 className="font-display font-black text-4xl text-white">¡Ganador!</h2>

                {/* Imagen del premio en el overlay */}
                {liveWinner.prizeImage && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(92,181,22,0.30)' }}>
                    <img
                      src={liveWinner.prizeImage}
                      alt={liveWinner.prize}
                      className="w-full h-40 object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="font-mono font-black text-7xl" style={{ color: '#9de360' }}>
                  #{liveWinner.number}
                </div>
                <div
                  className="rounded-2xl p-5 winner-glow"
                  style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}
                >
                  <p className="font-display font-black text-3xl text-white">{liveWinner.name}</p>
                  <p className="font-semibold mt-1" style={{ color: '#fde68a' }}>{liveWinner.prize}</p>
                </div>
                <button
                  onClick={() => setLiveWinner(null)}
                  className="btn-secondary mt-2"
                >
                  Cerrar
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de sorteos */}
      {raffles.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
          <div className="text-4xl mb-2">🎰</div>
          <p>No hay sorteos activos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {raffles.map((raffle, i) => {
            const status = STATUS_MAP[raffle.status] || STATUS_MAP.PENDING;
            const myNums = myNumbers.filter(e => e.raffle?.id === raffle.id);

            return (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card overflow-hidden"
              >
                {/* ===== IMAGEN DEL PREMIO ===== */}
                {raffle.prizeImage && (
                  <div className="relative">
                    <img
                      src={raffle.prizeImage}
                      alt={raffle.prize}
                      className="w-full h-44 object-cover"
                      onError={e => { e.target.parentElement.style.display = 'none'; }}
                    />
                    {/* Gradiente sobre la imagen */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.85) 0%, transparent 60%)' }}
                    />
                    {/* Badge de estado sobre la imagen */}
                    <div className="absolute top-3 right-3">
                      <span className="badge font-semibold" style={status.style}>
                        {status.label}
                      </span>
                    </div>
                    {/* Nombre del sorteo sobre la imagen */}
                    <div className="absolute bottom-3 left-4">
                      <h3 className="font-display font-bold text-xl text-white drop-shadow-lg">
                        {raffle.title}
                      </h3>
                      {raffle.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.65)' }}>
                          {raffle.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Título y badge si NO hay imagen */}
                  {!raffle.prizeImage && (
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{raffle.title}</h3>
                        {raffle.description && (
                          <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
                            {raffle.description}
                          </p>
                        )}
                      </div>
                      <span className="badge font-semibold flex-shrink-0" style={status.style}>
                        {status.label}
                      </span>
                    </div>
                  )}

                  {/* Premio */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.15)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio</p>
                    <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {raffle.prize}</p>
                  </div>

                  {/* Mis números */}
                  {myNums.length > 0 && (
                    <div>
                      <p className="text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
                        Tus números ({myNums.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {myNums.slice(0, 10).map(e => (
                          <span
                            key={e.id}
                            className="font-mono text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}
                          >
                            #{e.number}
                          </span>
                        ))}
                        {myNums.length > 10 && (
                          <span className="text-xs py-1" style={{ color: 'rgba(240,244,236,0.35)' }}>
                            +{myNums.length - 10} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Participantes */}
                  <p className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>
                    {raffle._count?.entries || 0} participante{raffle._count?.entries !== 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}