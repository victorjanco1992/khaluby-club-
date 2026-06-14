import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';

const STATUS_MAP = {
  PENDING:  { label: 'Próximamente', style: { background: 'rgba(245,158,11,0.35)', color: '#fde68a', border: '2px solid rgba(245,158,11,0.70)' } },
  ACTIVE:   { label: 'Activo',       style: { background: 'rgba(92,181,22,0.35)',  color: '#9de360', border: '2px solid rgba(92,181,22,0.70)'  } },
  DRAWING:  { label: '¡SORTEANDO!',  style: { background: 'rgba(239,68,68,0.35)', color: '#fca5a5', border: '2px solid rgba(239,68,68,0.70)'  } },
  FINISHED: { label: 'Finalizado',   style: { background: 'rgba(255,255,255,0.12)', color: 'rgba(240,244,236,0.65)', border: '2px solid rgba(255,255,255,0.25)' } },
};

export default function ClientRaffles() {
  const [liveWinner, setLiveWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentNum, setCurrentNum] = useState(null);

  const { data, refetch } = useQuery({
    queryKey: ['raffles-client'],
    queryFn: () => api.get('/api/raffles').then(r => r.data),
    refetchInterval: 8000,
  });

  const { data: raffleDetails } = useQuery({
    queryKey: ['raffles-details'],
    queryFn: async () => {
      const raffles = data?.raffles || [];
      const finished = raffles.filter(r => r.status === 'FINISHED' && r.winnerNumber);
      const details = await Promise.all(
        finished.map(r => api.get(`/api/raffles/${r.id}`).then(res => res.data.raffle))
      );
      return details;
    },
    enabled: !!data?.raffles?.some(r => r.status === 'FINISHED'),
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
      confetti({
        particleCount: 220, spread: 90, origin: { y: 0.5 },
        colors: ['#5cb516', '#9de360', '#fbbf24', '#fff'],
      });
      setTimeout(() => refetch(), 500);
    });

    socket.on('raffle:activated', () => refetch());
    socket.on('raffle:finished', () => {
      refetch();
      setTimeout(() => refetch(), 1000);
    });

    return () => {
      socket.off('raffle:spinning');
      socket.off('raffle:winner');
      socket.off('raffle:activated');
      socket.off('raffle:finished');
    };
  }, []);

  const raffles = data?.raffles || [];
  const myNumbers = myNumbersData || [];

  const getWinnerEntry = (raffle) => {
    if (!raffle.winnerNumber || !raffleDetails) return null;
    const detail = raffleDetails.find(d => d.id === raffle.id);
    if (!detail) return null;
    return detail.entries?.find(e => e.number === raffle.winnerNumber);
  };

  const userWon = (raffle) => {
    const myNums = myNumbers.filter(e => e.raffle?.id === raffle.id);
    return myNums.some(e => e.number === raffle.winnerNumber);
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl text-white">Sorteos</h2>
        <Link to="/sorteo" target="_blank" className="text-sm font-medium" style={{ color: '#9de360' }}>
          🏆 Ver público
        </Link>
      </div>

      {/* Overlay sorteo en vivo */}
      <AnimatePresence>
        {(isSpinning || liveWinner) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
            style={{ background: 'rgba(8,13,5,0.97)', backdropFilter: 'blur(12px)' }}
          >
            {isSpinning && (
              <div className="text-center space-y-6 w-full max-w-sm">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 live-dot" />
                  SORTEO EN VIVO
                </motion.div>
                <h2 className="font-display font-bold text-4xl text-white">¡Sorteando!</h2>
                <div className="font-mono font-black text-8xl text-white">
                  {currentNum ?? '??'}
                </div>
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
                <p style={{ color: 'rgba(240,244,236,0.50)' }}>El número ganador está siendo elegido...</p>
              </div>
            )}

            {liveWinner && !isSpinning && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-5 w-full max-w-sm"
              >
                <div className="text-7xl">🏆</div>
                <h2 className="font-display font-black text-4xl text-white">¡Ganador!</h2>

                {liveWinner.prizeImage && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(92,181,22,0.30)' }}>
                    <img src={liveWinner.prizeImage} alt="Premio" className="w-full h-40 object-cover"
                      onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}

                <div className="font-mono font-black text-7xl" style={{ color: '#9de360' }}>
                  #{liveWinner.number}
                </div>

                <div
                  className="rounded-2xl p-5 winner-glow"
                  style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}
                >
                  <p className="font-display font-black text-2xl text-white">{liveWinner.name}</p>
                  <p className="mt-1 font-semibold" style={{ color: '#fde68a' }}>{liveWinner.prize}</p>
                </div>

                <button onClick={() => setLiveWinner(null)} className="btn-secondary w-full py-3">
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
            const winnerEntry = getWinnerEntry(raffle);
            const iWon = userWon(raffle);

            return (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card overflow-hidden"
                style={iWon ? { borderColor: 'rgba(92,181,22,0.40)', boxShadow: '0 0 20px rgba(92,181,22,0.10)' } : {}}
              >
                {/* Imagen — solo la imagen, sin texto encima */}
                {raffle.prizeImage && (
                  <div className="relative">
                    <img
                      src={raffle.prizeImage}
                      alt={raffle.prize}
                      className="w-full object-contain max-h-64"
                      onError={e => { e.target.parentElement.style.display = 'none'; }}
                    />
                    {/* Badge de estado arriba a la derecha */}
                    <div className="absolute top-3 right-3">
                      <span className="badge font-semibold" style={status.style}>{status.label}</span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Título + descripción + estado (siempre visible aquí) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-lg text-white leading-tight">
                        {raffle.title}
                      </h3>
                      {raffle.description && (
                        <p className="text-sm mt-1 leading-relaxed"
                          style={{ color: 'rgba(240,244,236,0.65)' }}>
                          {raffle.description}
                        </p>
                      )}
                    </div>
                    {/* Badge solo si no hay imagen (si hay imagen ya está arriba) */}
                    {!raffle.prizeImage && (
                      <span className="badge font-semibold flex-shrink-0" style={status.style}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Premio */}
                  <div className="rounded-xl p-3"
                    style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.15)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio</p>
                    <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {raffle.prize}</p>
                  </div>

                  {/* Ganador — solo si está finalizado */}
                  {raffle.status === 'FINISHED' && raffle.winnerNumber && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: iWon ? 'rgba(92,181,22,0.15)' : 'rgba(255,255,255,0.04)',
                        border: iWon ? '1px solid rgba(92,181,22,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {iWon ? (
                        <div className="text-center">
                          <p className="text-lg mb-1">🎉</p>
                          <p className="font-bold text-sm" style={{ color: '#9de360' }}>
                            ¡Ganaste con el #{raffle.winnerNumber}!
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
                            Mostrá tu QR en caja para reclamar el premio
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
                            Número ganador
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xl" style={{ color: '#fde68a' }}>
                                #{raffle.winnerNumber}
                              </span>
                              {winnerEntry?.user?.name && (
                                <span className="text-sm" style={{ color: 'rgba(240,244,236,0.60)' }}>
                                  — {winnerEntry.user.name}
                                </span>
                              )}
                            </div>
                            <span className="text-lg">🏆</span>
                          </div>
                          {myNums.length > 0 && (
                            <p className="text-xs mt-2" style={{ color: 'rgba(240,244,236,0.35)' }}>
                              Tus números: {myNums.map(e => `#${e.number}`).join(', ')} · ¡Suerte la próxima!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mis números — solo si está activo */}
                  {raffle.status === 'ACTIVE' && myNums.length > 0 && (
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
