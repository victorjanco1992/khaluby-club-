import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';

const STATUS_MAP = {
  PENDING:  { label: 'Próximamente', style: { background: 'rgba(245,158,11,0.90)', color: '#000', border: '2px solid rgba(245,158,11,1)', backdropFilter: 'blur(4px)', fontWeight: 700 } },
  ACTIVE:   { label: 'Activo',       style: { background: 'rgba(92,181,22,0.90)',  color: '#000', border: '2px solid rgba(92,181,22,1)',  backdropFilter: 'blur(4px)', fontWeight: 700 } },
  DRAWING:  { label: '¡SORTEANDO!',  style: { background: 'rgba(239,68,68,0.90)', color: '#fff', border: '2px solid rgba(239,68,68,1)',  backdropFilter: 'blur(4px)', fontWeight: 700 } },
  FINISHED: { label: 'Finalizado',   style: { background: 'rgba(0,0,0,0.75)',      color: 'rgba(240,244,236,0.80)', border: '2px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(4px)', fontWeight: 600 } },
};

// ── Render de descripción: respeta saltos de línea, soporta **resaltado** y viñetas con "- " ──
function RichDescription({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  // Renderiza el contenido de una línea soportando **resaltado**
  const renderInline = (line, keyPrefix) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-${i}`} style={{ color: '#9de360', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${keyPrefix}-${i}`}>{part}</span>;
    });
  };

  // Agrupar líneas consecutivas que empiezan con "- " o "• " en una sola lista
  const blocks = [];
  let currentList = null;

  lines.forEach((line, idx) => {
    const isBullet = /^[\-•]\s+/.test(line.trim());
    if (isBullet) {
      const content = line.trim().replace(/^[\-•]\s+/, '');
      if (!currentList) {
        currentList = { type: 'list', items: [] };
        blocks.push(currentList);
      }
      currentList.items.push(content);
    } else {
      currentList = null;
      blocks.push({ type: 'line', content: line });
    }
  });

  return (
    <div className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.65)' }}>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'list') {
          return (
            <ul key={blockIdx} className="my-1.5 space-y-1">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5" style={{ color: '#9de360' }}>•</span>
                  <span>{renderInline(item, `${blockIdx}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        // Línea normal — vacía o con texto
        if (block.content.trim() === '') {
          return <div key={blockIdx} className="h-2" />;
        }
        return (
          <p key={blockIdx} className="leading-relaxed">
            {renderInline(block.content, blockIdx)}
          </p>
        );
      })}
    </div>
  );
}

export default function ClientRaffles() {
  const [liveWinner, setLiveWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentNum, setCurrentNum] = useState(null);
  const [expandedRaffle, setExpandedRaffle] = useState(null);
  const [expandedParticipants, setExpandedParticipants] = useState(null);

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
      if (finished.length === 0) return [];
      return Promise.all(
        finished.map(r => api.get(`/api/raffles/${r.id}`).then(res => res.data.raffle))
      );
    },
    enabled: !!data?.raffles?.some(r => r.status === 'FINISHED'),
  });

  const { data: expandedDetail, isLoading: loadingParticipants } = useQuery({
    queryKey: ['raffle-participants', expandedParticipants],
    queryFn: () => api.get(`/api/raffles/${expandedParticipants}`).then(r => r.data.raffle),
    enabled: !!expandedParticipants,
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
    return detail?.entries?.find(e => e.number === raffle.winnerNumber);
  };

  const userWon = (raffle) => {
    const myNums = myNumbers.filter(e => e.raffle?.id === raffle.id);
    return myNums.some(e => e.number === raffle.winnerNumber);
  };

  return (
    <div className="p-4 space-y-5">
    <div className="flex items-center justify-between">
      <h2 className="font-display font-bold text-2xl text-white">Sorteos</h2>
      <Link
        to="/sorteo"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'rgba(92,181,22,0.15)',
          color: '#9de360',
          border: '1px solid rgba(92,181,22,0.25)',
        }}
      >
        🏆 Ver ganador
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
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  SORTEO EN VIVO
                </motion.div>
                <h2 className="font-display font-bold text-4xl text-white">¡Sorteando!</h2>
                <div className="font-mono font-black text-8xl text-white">{currentNum ?? '??'}</div>
                <div className="flex justify-center gap-1.5">
                  {[...Array(7)].map((_, i) => (
                    <motion.div key={i} className="w-1.5 rounded-full" style={{ background: '#5cb516' }}
                      animate={{ height: ['16px', '40px', '16px'] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
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
                <div className="rounded-2xl p-5 winner-glow"
                  style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.35)' }}>
                  <p className="font-display font-black text-2xl text-white">{liveWinner.name}</p>
                  <p className="mt-1 font-semibold" style={{ color: '#fde68a' }}>{liveWinner.prize}</p>
                </div>
                <button onClick={() => setLiveWinner(null)} className="btn-secondary w-full py-3">Cerrar</button>
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
            const isMyNumsExpanded = expandedRaffle === raffle.id;
            const isParticipantsExpanded = expandedParticipants === raffle.id;
            const participantEntries = (expandedDetail?.id === raffle.id ? expandedDetail?.entries : []) || [];
            const participantCount = raffle._count?.entries || 0;

            return (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card overflow-hidden"
                style={iWon ? { borderColor: 'rgba(92,181,22,0.40)', boxShadow: '0 0 20px rgba(92,181,22,0.10)' } : {}}
              >
                {/* Imagen */}
                {raffle.prizeImage && (
                  <div className="relative">
                    <img
                      src={raffle.prizeImage}
                      alt={raffle.prize}
                      className="w-full object-contain max-h-64"
                      onError={e => { e.target.parentElement.style.display = 'none'; }}
                    />
                    <div className="absolute top-3 right-3">
                      <span className="badge font-semibold" style={status.style}>{status.label}</span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Título */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-lg text-white leading-tight">
                        {raffle.title}
                      </h3>
                      {/* ✅ Ahora respeta saltos de línea y soporta **resaltado** */}
                      <RichDescription text={raffle.description} />
                    </div>
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

                  {/* Ganador */}
                  {raffle.status === 'FINISHED' && raffle.winnerNumber && (
                    <div className="rounded-xl p-3"
                      style={{
                        background: iWon ? 'rgba(92,181,22,0.15)' : 'rgba(255,255,255,0.04)',
                        border: iWon ? '1px solid rgba(92,181,22,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
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
                          <p className="text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>Número ganador</p>
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

                  {/* MIS NÚMEROS CON EXPAND */}
                  {raffle.status === 'ACTIVE' && myNums.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>
                          Tus números ({myNums.length})
                        </p>
                        {myNums.length > 10 && (
                          <button
                            onClick={() => setExpandedRaffle(isMyNumsExpanded ? null : raffle.id)}
                            className="text-xs font-medium"
                            style={{ color: '#9de360' }}
                          >
                            {isMyNumsExpanded ? '▲ Ver menos' : `▼ Ver todos`}
                          </button>
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        <motion.div
                          className="flex flex-wrap gap-1.5"
                          layout
                        >
                          {(isMyNumsExpanded ? myNums : myNums.slice(0, 10)).map(e => (
                            <motion.span
                              key={e.id}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="font-mono text-xs px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}
                            >
                              #{e.number}
                            </motion.span>
                          ))}
                        </motion.div>
                      </AnimatePresence>

                      {myNums.length > 10 && !isMyNumsExpanded && (
                        <button
                          onClick={() => setExpandedRaffle(raffle.id)}
                          className="mt-2 w-full py-2 rounded-xl text-xs font-medium transition-all"
                          style={{ background: 'rgba(92,181,22,0.06)', color: '#9de360', border: '1px solid rgba(92,181,22,0.15)' }}
                        >
                          +{myNums.length - 10} números más — tocar para ver todos
                        </button>
                      )}
                    </div>
                  )}

                  {/* PARTICIPANTES CON EXPAND */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <button
                      onClick={() => setExpandedParticipants(isParticipantsExpanded ? null : raffle.id)}
                      className="flex items-center gap-2 w-full text-left transition-all"
                    >
                      <span className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>
                        👥 {participantCount} participante{participantCount !== 1 ? 's' : ''}
                      </span>
                      {participantCount > 0 && (
                        <span className="text-xs ml-auto" style={{ color: 'rgba(240,244,236,0.30)' }}>
                          {isParticipantsExpanded ? '▲ Cerrar' : '▼ Ver lista'}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isParticipantsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 rounded-xl overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {loadingParticipants ? (
                              <div className="flex items-center justify-center py-6 gap-2">
                                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                  style={{ borderColor: 'rgba(92,181,22,0.20)', borderTopColor: '#5cb516' }} />
                                <span className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>Cargando...</span>
                              </div>
                            ) : participantEntries.length === 0 ? (
                              <p className="text-xs text-center py-4" style={{ color: 'rgba(240,244,236,0.30)' }}>
                                Sin participantes aún
                              </p>
                            ) : (
                              <div className="max-h-56 overflow-y-auto p-3">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                  {participantEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center gap-2 text-xs min-w-0">
                                      <span
                                        className="font-mono font-bold flex-shrink-0"
                                        style={{ color: entry.number === raffle.winnerNumber ? '#fde68a' : '#9de360' }}
                                      >
                                        #{entry.number}
                                      </span>
                                      <span className="truncate" style={{ color: 'rgba(240,244,236,0.55)' }}>
                                        {entry.user?.name?.split(' ')[0]}
                                      </span>
                                      {entry.number === raffle.winnerNumber && (
                                        <span className="flex-shrink-0">🏆</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
