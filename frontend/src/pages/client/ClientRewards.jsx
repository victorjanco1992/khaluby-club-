import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';
import toast from 'react-hot-toast';

const LEVELS = [
  {
    name: 'Bronce',
    min: 0,
    max: 99,
    icon: '🥉',
    color: '#b45309',
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

function PointsCard({ points }) {
  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel
    ? Math.min(((points - level.min) / (nextLevel.min - level.min)) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden relative"
      style={{ border: `1px solid ${level.border}` }}
    >
      {/* Glow fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 85% 20%, ${level.bg}, transparent 65%)` }}
      />

      <div className="relative p-5">
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

          <div
            className="flex flex-col items-center px-4 py-2.5 rounded-2xl flex-shrink-0"
            style={{ background: level.bg, border: `1px solid ${level.border}` }}
          >
            <span className="text-3xl">{level.icon}</span>
            <p className="text-sm font-black mt-1 tracking-wide" style={{ color: level.color }}>
              {level.name}
            </p>
          </div>
        </div>

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
            <div className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
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
      </div>
    </motion.div>
  );
}

function CooldownBanner({ info }) {
  if (!info?.active) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⏳</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#fde68a' }}>Cooldown activo</p>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
            Podés volver a canjear en{' '}
            <span className="text-white font-semibold">
              {info.daysLeft} día{info.daysLeft > 1 ? 's' : ''}
            </span>
            {' '}— el{' '}
            {new Date(info.nextAllowedAt).toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.30)' }}>
            Límite de un canje por semana para mayor equidad 🤝
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ClientRewards() {
  const { user, refreshMe } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(null);

  const { data: rewardsData, refetch: refetchRewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => api.get('/api/rewards').then(r => r.data),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: redemptionsData, refetch: refetchRedemptions } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: () => api.get('/api/rewards/redemptions').then(r => r.data),
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    refreshMe();
    refetchRewards();
    refetchRedemptions();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);
    const handle = () => {
      refreshMe();
      refetchRewards();
      refetchRedemptions();
    };
    socket.on('points:updated', handle);
    return () => socket.off('points:updated', handle);
  }, [user?.id]);

  const redeemMutation = useMutation({
    mutationFn: (id) => api.post(`/api/rewards/${id}/redeem`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refreshMe();
      refetchRewards();
      refetchRedemptions();
      setConfirming(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al canjear');
      setConfirming(null);
    },
  });

  const points = user?.points || 0;
  const rewards = rewardsData?.rewards || [];
  const cooldown = rewardsData?.cooldownInfo;
  const redemptions = redemptionsData?.redemptions || [];

  return (
    <div className="p-4 space-y-5">

      {/* Tarjeta de puntos — igual que el dashboard */}
      <PointsCard points={points} />

      {/* Cooldown */}
      <CooldownBanner info={cooldown} />

      {/* Recompensas */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-3 text-white">Recompensas</h3>

        {rewards.length === 0 ? (
          <div className="card p-8 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
            <div className="text-4xl mb-2">🎁</div>
            <p>No hay recompensas disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward, i) => {
              const canAfford = points >= reward.pointsCost;
              const outOfStock = reward.stock === 0;
              const onCooldown = cooldown?.active;
              const disabled = !canAfford || outOfStock || onCooldown;
              const shortage = reward.pointsCost - points;

              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card p-4 transition-all"
                  style={disabled ? { opacity: 0.65 } : {}}
                >
                  <div className="flex items-start gap-4">
                    {reward.image ? (
                      <img
                        src={reward.image}
                        alt={reward.name}
                        className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        🎁
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{reward.name}</p>
                      {reward.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>
                          {reward.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                        <div>
                          <p className="font-mono font-bold" style={{ color: '#c4b5fd' }}>
                            {reward.pointsCost.toLocaleString()} pts
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.35)' }}>
                            {reward.stock === -1
                              ? 'Ilimitado'
                              : reward.stock === 0
                              ? 'Sin stock'
                              : `${reward.stock} disponibles`}
                          </p>
                        </div>

                        <button
                          onClick={() => !disabled && setConfirming(reward)}
                          disabled={disabled}
                          className="text-sm px-4 py-2 rounded-xl font-medium transition-all flex-shrink-0"
                          style={disabled ? {
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(240,244,236,0.25)',
                            cursor: 'not-allowed',
                          } : {
                            background: 'linear-gradient(135deg, #5cb516, #459110)',
                            color: '#fff',
                          }}
                        >
                          {outOfStock
                            ? 'Sin stock'
                            : onCooldown
                            ? `${cooldown.daysLeft}d de espera`
                            : !canAfford
                            ? `Faltan ${shortage.toLocaleString()} pts`
                            : 'Canjear'}
                        </button>
                      </div>

                      {/* Barra de progreso para alcanzar el premio */}
                      {!canAfford && !outOfStock && (
                        <div className="mt-3">
                          <div className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min((points / reward.pointsCost) * 100, 100)}%`,
                                background: 'linear-gradient(90deg, #5cb516, #9de360)',
                              }}
                            />
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.30)' }}>
                            {Math.round((points / reward.pointsCost) * 100)}% del total
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      {redemptions.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-lg mb-3 text-white">Historial de canjes</h3>
          <div className="space-y-2">
            {redemptions.map(r => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">🎁</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.reward.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(240,244,236,0.30)' }}>
                      {new Date(r.createdAt).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm" style={{ color: '#c4b5fd' }}>
                    -{r.points.toLocaleString()}
                  </p>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: r.status === 'APPROVED'
                        ? '#4ade80'
                        : r.status === 'REJECTED'
                        ? '#f87171'
                        : '#fbbf24',
                    }}
                  >
                    {r.status === 'APPROVED' ? '✓ Aprobado'
                      : r.status === 'REJECTED' ? '✕ Rechazado'
                      : '⏳ Pendiente'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modal confirmar canje */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setConfirming(null)}
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: '#0d1a0a', border: '1px solid rgba(92,181,22,0.20)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle mobile */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5"
                style={{ background: 'rgba(255,255,255,0.12)' }} />

              <div className="text-center mb-5">
                {confirming.image ? (
                  <img src={confirming.image} alt={confirming.name}
                    className="w-20 h-20 object-cover rounded-2xl mx-auto mb-3"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="text-5xl mb-3">🎁</div>
                )}
                <h3 className="font-display font-bold text-xl text-white">Confirmar canje</h3>
                <p className="text-sm mt-2" style={{ color: 'rgba(240,244,236,0.55)' }}>
                  Canjeás{' '}
                  <span className="text-white font-semibold">{confirming.name}</span>
                  {' '}por{' '}
                  <span className="font-mono font-bold" style={{ color: '#c4b5fd' }}>
                    {confirming.pointsCost.toLocaleString()} pts
                  </span>
                </p>

                {/* Puntos después del canje */}
                <div className="mt-3 px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgba(240,244,236,0.45)' }}>Puntos actuales</span>
                    <span className="font-mono font-bold text-white">{points.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span style={{ color: 'rgba(240,244,236,0.45)' }}>Después del canje</span>
                    <span className="font-mono font-bold" style={{ color: '#9de360' }}>
                      {(points - confirming.pointsCost).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs mt-3" style={{ color: 'rgba(240,244,236,0.30)' }}>
                  ⏳ No podrás volver a canjear por 7 días
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirming(null)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => redeemMutation.mutate(confirming.id)}
                  disabled={redeemMutation.isPending}
                  className="btn-primary flex-1 py-3"
                >
                  {redeemMutation.isPending ? '⏳...' : '✓ Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
