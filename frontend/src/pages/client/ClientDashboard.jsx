import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';
import { subscribeToPush } from '../../lib/pushNotifications.js';
import api from '../../lib/api.js';

const LEVELS = [
  {
    name: 'Bronce',
    min: 0,
    max: 99,
    icon: '🥉',
    color: '#b45309',       // color sólido para textos y barras
    colorEnd: '#d97706',
    bg: 'rgba(180,83,9,0.15)',
    border: 'rgba(180,83,9,0.30)',
  },
  {
    name: 'Plata',
    min: 100,
    max: 499,
    icon: '🥈',
    color: '#94a3b8',
    colorEnd: '#cbd5e1',
    bg: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.28)',
  },
  {
    name: 'Oro',
    min: 500,
    max: 1499,
    icon: '🥇',
    color: '#eab308',
    colorEnd: '#fbbf24',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.28)',
  },
  {
    name: 'Diamante',
    min: 1500,
    max: Infinity,
    icon: '💎',
    color: '#22d3ee',
    colorEnd: '#a78bfa',
    bg: 'rgba(34,211,238,0.10)',
    border: 'rgba(167,139,250,0.30)',
  },
];

const getLevel = (pts) => LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];

export default function ClientDashboard() {
  const { user, refreshMe } = useAuthStore();

  useEffect(() => { refreshMe(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    getSocket(user.id);
  }, [user?.id]);

  // Suscribir a push notifications una vez autenticado
  useEffect(() => {
    if (!user?.id) return;

    alert(
      'DIAG:\n' +
      'serviceWorker: ' + ('serviceWorker' in navigator) + '\n' +
      'PushManager: ' + ('PushManager' in window) + '\n' +
      'isSecureContext: ' + window.isSecureContext + '\n' +
      'location: ' + window.location.href + '\n' +
      'userAgent: ' + navigator.userAgent
    );

    subscribeToPush()
      .then(result => {
        if (result?.endpoint) {
          alert('subscribeToPush OK: ' + result.endpoint.slice(0, 60) + '...');
        } else {
          alert('subscribeToPush RESULT: ' + JSON.stringify(result));
        }
      })
      .catch(err => {
        alert('subscribeToPush ERROR: ' + err.message + '\n' + err.stack);
      });
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

      {/* ===== PUNTOS + NIVEL ===== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden relative"
        style={{ border: `1px solid ${level.border}` }}
      >
        {/* Glow de fondo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 85% 20%, ${level.bg}, transparent 65%)`,
          }}
        />

        <div className="relative p-5">
          {/* Fila principal: puntos + nivel */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1"
                style={{ color: 'rgba(240,244,236,0.45)' }}>
                Tus puntos
              </p>
              <p className="font-mono font-black text-5xl text-white leading-none">
                {points.toLocaleString()}
              </p>
            </div>

            {/* Badge de nivel */}
            <div
              className="flex flex-col items-center px-4 py-2.5 rounded-2xl flex-shrink-0"
              style={{ background: level.bg, border: `1px solid ${level.border}` }}
            >
              <span className="text-3xl">{level.icon}</span>
              <p
                className="text-sm font-black mt-1 tracking-wide"
                style={{ color: level.color }}
              >
                {level.name}
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          {nextLevel ? (
            <div>
              <div className="flex justify-between text-xs mb-2"
                style={{ color: 'rgba(240,244,236,0.45)' }}>
                <span className="font-mono">{points.toLocaleString()} pts</span>
                <span>
                  Faltan{' '}
                  <span style={{ color: nextLevel.color }} className="font-bold">
                    {(nextLevel.min - points).toLocaleString()} pts
                  </span>
                  {' '}para {nextLevel.icon} {nextLevel.name}
                </span>
              </div>
              <div
                className="h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${level.color}, ${level.colorEnd})`,
                    boxShadow: `0 0 10px ${level.color}55`,
                  }}
                />
              </div>
            </div>
          ) : (
            // Nivel máximo
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full w-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${level.color}, ${level.colorEnd})` }} />
              </div>
              <p className="text-xs font-bold flex-shrink-0" style={{ color: level.color }}>
                Nivel máximo 🏆
              </p>
            </div>
          )}

          {/* Mini stats */}
          <div
            className="flex gap-4 mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {activeNumbers.length > 0 && (
              <div>
                <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>Números activos</p>
                <p className="font-mono font-bold text-sm" style={{ color: '#9de360' }}>
                  {activeNumbers.length} números
                </p>
              </div>
            )}
            <div>
              <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>Nivel</p>
              <p className="font-bold text-sm" style={{ color: level.color }}>
                {level.icon} {level.name}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== SORTEO ACTIVO ===== */}
      {raffleData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link to="/sorteos">
            <div className="card overflow-hidden transition-all"
              style={{ ':hover': { borderColor: 'rgba(92,181,22,0.20)' } }}>
              {raffleData.prizeImage && (
                <div className="relative">
                  <img
                    src={raffleData.prizeImage}
                    alt={raffleData.prize}
                    className="w-full h-40 object-cover"
                    onError={e => { e.target.parentElement.style.display = 'none'; }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.90) 0%, transparent 55%)' }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className="badge font-semibold"
                      style={{ background: 'rgba(92,181,22,0.20)', color: '#9de360', border: '1px solid rgba(92,181,22,0.35)' }}>
                      ACTIVO
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4">
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>🎰 Sorteo activo</p>
                    <p className="font-display font-bold text-lg text-white drop-shadow">{raffleData.title}</p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                {!raffleData.prizeImage && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(92,181,22,0.15)' }}>🎰</div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(240,244,236,0.45)' }}>Sorteo Activo</p>
                      <p className="font-semibold text-white">{raffleData.title}</p>
                    </div>
                    <span className="ml-auto badge font-semibold"
                      style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}>
                      ACTIVO
                    </span>
                  </div>
                )}

                <div className="rounded-xl p-3"
                  style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.15)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>Premio</p>
                  <p className="font-semibold" style={{ color: '#fde68a' }}>🏆 {raffleData.prize}</p>
                </div>

                {activeNumbers.length > 0 && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
                      Tus números ({activeNumbers.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNumbers.slice(0, 8).map(entry => (
                        <span key={entry.id}
                          className="font-mono text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.28)' }}>
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

      {/* ===== ACCESOS RÁPIDOS ===== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(240,244,236,0.40)' }}>
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/recompensas', icon: '🎁', label: 'Canjear puntos',  sub: `${points.toLocaleString()} disponibles` },
            { to: '/sorteos',     icon: '🎰', label: 'Sorteo en vivo',  sub: 'Seguí el sorteo' },
            { to: '/promociones', icon: '🏷️', label: 'Promociones',     sub: 'Ofertas activas' },
            { to: '/perfil',      icon: '📱', label: 'Mi QR',           sub: 'Para mostrar en caja' },
          ].map(({ to, icon, label, sub }) => (
            <Link key={to} to={to}>
              <div className="card p-4 h-full transition-all">
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-semibold text-white mt-2">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ===== ÚLTIMO SORTEO ===== */}
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
