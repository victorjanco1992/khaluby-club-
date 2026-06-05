import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

const SPIN_DURATION = 5000; // ms de animación local

function launchFireworks() {
  const end = Date.now() + 4000;
  const colors = ['#5cb516', '#9de360', '#fbbf24', '#ffffff'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    requestAnimationFrame(frame);
  };
  confetti({ particleCount: 200, spread: 130, origin: { y: 0.4 }, colors });
  frame();
}

function DigitDrum({ digit, isSpinning }) {
  return (
    <div
      className="w-16 h-20 sm:w-20 sm:h-28 rounded-2xl flex items-center justify-center overflow-hidden relative"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={isSpinning ? `${digit}-${Math.random()}` : digit}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.08 }}
          className="font-mono font-black text-4xl sm:text-5xl text-white absolute select-none"
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

function buildWhatsAppLink(winner) {
  let phone = winner.phone.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) phone = phone.slice(1);
  if (!phone.startsWith('+')) phone = `549${phone}`;
  else phone = phone.replace('+', '');
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
  const [phase, setPhase] = useState('ready'); // ready | spinning | winner
  const [displayNum, setDisplayNum] = useState(0);
  const [winner, setWinner] = useState(null);
  const spinIntervalRef = useRef(null);
  const spinTimeoutRef = useRef(null);

  const { data: raffle, isLoading } = useQuery({
    queryKey: ['raffle-detail', id],
    queryFn: () => api.get(`/api/raffles/${id}`).then(r => r.data.raffle),
  });

  // Limpiar intervals al desmontar
  useEffect(() => {
    return () => {
      clearInterval(spinIntervalRef.current);
      clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const drawMutation = useMutation({
    mutationFn: () => api.post(`/api/raffles/${id}/draw`),
    onSuccess: (res) => {
      // El backend ya resolvió — tenemos el ganador
      // Pero primero mostramos la animación local
      const w = res.data.winner;
      const entries = raffle?.entries || [];
      const numbers = entries.map(e => e.number);

      // Iniciar animación de spinning
      setPhase('spinning');
      clearInterval(spinIntervalRef.current);

      spinIntervalRef.current = setInterval(() => {
        if (numbers.length > 0) {
          setDisplayNum(numbers[Math.floor(Math.random() * numbers.length)]);
        }
      }, 80);

      // Después de SPIN_DURATION, mostrar el ganador real
      spinTimeoutRef.current = setTimeout(() => {
        clearInterval(spinIntervalRef.current);
        setDisplayNum(w.number);
        setWinner(w);
        setPhase('winner');
        setTimeout(() => launchFireworks(), 300);
      }, SPIN_DURATION);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al sortear');
      setPhase('ready');
    },
  });

  const handleDraw = () => {
    if (!raffle || (raffle.entries?.length || 0) === 0) {
      return toast.error('No hay participantes');
    }
    setPhase('spinning');
    setWinner(null);
    drawMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(92,181,22,0.2)', borderTopColor: '#5cb516' }} />
      </div>
    );
  }

  if (!raffle) {
    return <div className="text-center py-20" style={{ color: 'rgba(240,244,236,0.40)' }}>Sorteo no encontrado</div>;
  }

  const entries = raffle.entries || [];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin/sorteos"
          className="text-sm transition-colors mb-3 inline-flex items-center gap-1"
          style={{ color: 'rgba(240,244,236,0.45)' }}>
          ← Volver
        </Link>
        <h1 className="font-display font-bold text-2xl text-white">{raffle.title}</h1>
        <p className="mt-1 font-medium" style={{ color: '#fde68a' }}>🏆 {raffle.prize}</p>
      </div>

      {/* Imagen del premio */}
      {raffle.prizeImage && (
        <img
          src={raffle.prizeImage}
          alt={raffle.prize}
          className="w-full h-44 object-cover rounded-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {/* Stage */}
      <div className="card p-6 text-center">

        {/* READY */}
        {phase === 'ready' && (
          <div className="space-y-6">
            <div>
              <p className="text-sm mb-4" style={{ color: 'rgba(240,244,236,0.50)' }}>
                {entries.length} participante{entries.length !== 1 ? 's' : ''} en el bombo
              </p>
              <NumberDisplay value="????" isSpinning={false} />
            </div>

            {entries.length === 0 ? (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(245,158,11,0.10)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.20)' }}>
                ⚠️ No hay participantes en este sorteo
              </div>
            ) : (
              <button
                onClick={handleDraw}
                disabled={drawMutation.isPending}
                className="btn-primary w-full py-5 text-xl"
              >
                🎰 ¡INICIAR SORTEO!
              </button>
            )}
          </div>
        )}

        {/* SPINNING */}
        {phase === 'spinning' && (
          <div className="space-y-6">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.30)' }}
            >
              <span className="w-2 h-2 rounded-full bg-red-400 live-dot" />
              SORTEANDO EN VIVO
            </motion.div>

            <NumberDisplay value={displayNum} isSpinning={true} />

            <div className="flex justify-center items-end gap-1.5 h-12">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{ background: '#5cb516' }}
                  animate={{ height: ['16px', `${20 + Math.random() * 30}px`, '16px'] }}
                  transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.06 }}
                />
              ))}
            </div>

            <p style={{ color: 'rgba(240,244,236,0.45)' }}>Buscando al ganador...</p>
          </div>
        )}

        {/* WINNER */}
        {phase === 'winner' && winner && (
          <div className="space-y-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 180 }}
              className="text-6xl"
            >
              🏆
            </motion.div>

            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-3"
                style={{ color: '#9de360' }}>
                ¡Número Ganador!
              </p>
              <NumberDisplay value={winner.number} isSpinning={false} />
            </div>

            {/* Datos del ganador */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="winner-glow rounded-2xl p-5 text-left"
              style={{ background: 'rgba(92,181,22,0.10)', border: '1px solid rgba(92,181,22,0.30)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'rgba(240,244,236,0.50)' }}>Ganador</p>
              <p className="font-display font-black text-2xl text-white">{winner.name}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(240,244,236,0.50)' }}>DNI</span>
                  <span className="font-mono text-white">{winner.dni}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(240,244,236,0.50)' }}>Teléfono</span>
                  <span className="font-mono text-white">{winner.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(240,244,236,0.50)' }}>Premio</span>
                  <span className="font-medium" style={{ color: '#fde68a' }}>{winner.prize}</span>
                </div>
              </div>
            </motion.div>

            {/* Acciones */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              
                href={buildWhatsAppLink(winner)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', boxShadow: '0 4px 20px rgba(37,211,102,0.25)' }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Notificar por WhatsApp
              </a>

              <Link to="/admin/sorteos" className="btn-secondary w-full py-3 text-center block">
                Volver a sorteos
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Participantes */}
      {phase === 'ready' && entries.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'rgba(240,244,236,0.40)' }}>
            Participantes ({entries.length})
          </p>
          <div className="card p-4 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {entries.slice(0, 40).map(entry => (
                <div key={entry.id} className="flex items-center gap-2 text-xs truncate">
                  <span className="font-mono flex-shrink-0" style={{ color: '#9de360' }}>#{entry.number}</span>
                  <span className="truncate" style={{ color: 'rgba(240,244,236,0.55)' }}>
                    {entry.user?.name?.split(' ')[0]}
                  </span>
                </div>
              ))}
              {entries.length > 40 && (
                <p className="text-xs col-span-2 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
                  +{entries.length - 40} más
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
