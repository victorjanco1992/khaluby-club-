import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';
import api from '../../lib/api.js';

const LEVELS = [
  { name: 'Bronce',   min: 0,     max: 999,     text: '#fbbf24', icon: '🥉' },
  { name: 'Plata',    min: 1000,  max: 4999,    text: '#e2e8f0', icon: '🥈' },
  { name: 'Oro',      min: 5000,  max: 19999,   text: '#fde68a', icon: '🥇' },
  { name: 'Diamante', min: 20000, max: Infinity, text: '#a5f3fc', icon: '💎' },
];
const getLevel = (pts) => LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];

export default function ClientDashboard() {
  const { user, refreshMe } = useAuthStore();

  useEffect(() => { refreshMe(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    getSocket(user.id);
  }, [user?.id]);

  const { data: raffleData } = useQuery({
    queryKey: ['active-raffle'],
    queryFn: () => api.get('/api/raffles?status=ACTIVE&limit=1').then(r => r.data.raffles[0]),
  });

  const { data: myNumbersData } = useQuery({
    queryKey: ['my-numbers'],
    queryFn: () => api.get('/api/raffles/my-numbers').then(r => r.data.entries),
  });

  const points = user?.points || 0;
  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel
    ? Math.min(((points - level.min) / (nextLevel.min - level.min)) * 100, 100)
    : 100;

  const activeNumbers = myNumbersData?.filter(e => e.raffle?.status === 'ACTIVE') || [];

  return (
    <div className="p-4 space-y-5">

      {/* Puntos */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(ellipse at 80% 50%, ${level.text}88, transparent)` }}
        />
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: 'rgba(240,244,236,0.55)' }}>Tus puntos</p>
              <p className="font-mono font-bold text-5xl text-white mt-1">{points.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl">{level.icon}</span>
              <p className="text-sm font-bold mt-1" style={{ color: level.text }}>{level.name}</p>
            </div>
          </div>
          {nextLevel && (
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(240,244,236,0.50)' }}>
                <span>{points.toLocaleString()} pts</span>
                <span>
                  <span style={{ color: nextLevel.text }}>{nextLevel.name}</span>{' '}
                  en {(nextLevel.min - points).toLocaleString()} pts
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${level.text}99, ${level.text})` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sorteo activo */}
      {raffleData && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link to="/sorteos">
            <div className="card overflow-hidden hover:border-khaluby-500/25 transition-all cursor-pointer">

              {/* ===== IMAGEN DEL PREMIO ===== */}
              {raffleData.prizeImage && (
                <div className="relative">
                  <img
                    src={raffleData.prizeImage}
                    alt={raffleData.prize}
                    className="w-full h-40 object-cover"
                    onError={e => { e.target.parentElement.style.display = 'none'; }}
                  />
                  {/* Gradiente de abajo hacia arriba */}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.90) 0%, transparent 55%)' }}
                  />
                  {/* Badge ACTIVO sobre la imagen */}
                  <div className="absolute top-3 right-3">
                    <span
                      className="badge font-semibold"
                      style={{ background: 'rgba(92,181,22,0.20)', color: '#9de360', border: '1px solid rgba(92,181,22,0.35)' }}
                    >
                      ACTIVO
                    </span>
                  </div>
                  {/* Premio sobre la imagen */}
                  <div className="absolute bottom-3 left-4">
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
                      🎰 Sorteo activo
                    </p>
                    <p className="font-display font-bold text-lg text-white drop-shadow">
                      {raffleData.title}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Header solo si no hay imagen */}
                {!raffleData.prizeImage && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(92,181,22,0.15)' }}
                    >
                      🎰
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(240,244,236,0.45)' }}>
                        Sorteo Activo
                      </p>
                      <p className="font-semibold text-white">{raffleData.title}</p>
                    </div>
                    <span
                      className="ml-auto badge font-semibold"
                      style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}
                    >
                      ACTIVO
                    </span>
                  </div>
                )}

                {/* Premio */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.15)' }}
                >
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio</p>
                  <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {raffleData.prize}</p>
                </div>

                {/* Mis números */}
                {activeNumbers.length > 0 && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
                      Tus números ({activeNumbers.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNumbers.slice(0, 8).map(entry => (
                        <span
                          key={entry.id}
                          className="font-mono text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}
                        >
                          #{entry.number}
                        </span>
                      ))}
                      {activeNumbers.length > 8 && (
                        <span className="text-xs py-1" style={{ color: 'rgba(240,244,236,0.35)' }}>
                          +{activeNumbers.length - 8} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Accesos rápidos */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3
          className="text-xs uppercase tracking-wider mb-3"
          style={{ color: 'rgba(240,244,236,0.40)' }}
        >
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/recompensas', icon: '🎁', label: 'Canjear puntos',    sub: `${points.toLocaleString()} disponibles` },
            { to: '/sorteos',     icon: '🎰', label: 'Sorteo en vivo',     sub: 'Seguí el sorteo' },
            { to: '/promociones', icon: '🏷️', label: 'Promociones',        sub: 'Ofertas activas' },
            { to: '/perfil',      icon: '📱', label: 'Mi QR',              sub: 'Para mostrar en caja' },
          ].map(({ to, icon, label, sub }) => (
            <Link key={to} to={to}>
              <div
                className="card p-4 h-full transition-all"
                style={{ ':hover': { borderColor: 'rgba(92,181,22,0.20)' } }}
              >
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-semibold text-white mt-2">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Último sorteo */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Link to="/sorteo" target="_blank">
          <div className="card p-4 flex items-center gap-3 transition-all">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-semibold text-sm text-white">Ver último sorteo</p>
              <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Resultado y ganador</p>
            </div>
            <span className="ml-auto text-lg" style={{ color: 'rgba(240,244,236,0.25)' }}>→</span>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}