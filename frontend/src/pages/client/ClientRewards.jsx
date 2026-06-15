import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';
import toast from 'react-hot-toast';

const LEVELS = [
  { name: 'Bronce',   min: 0,    max: 99,   icon: '🥉', color: '#b45309', colorEnd: '#d97706', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.30)' },
  { name: 'Plata',    min: 100,  max: 499,  icon: '🥈', color: '#94a3b8', colorEnd: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.28)' },
  { name: 'Oro',      min: 500,  max: 1499, icon: '🥇', color: '#eab308', colorEnd: '#fbbf24', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.28)' },
  { name: 'Diamante', min: 1500, max: Infinity, icon: '💎', color: '#22d3ee', colorEnd: '#a78bfa', bg: 'rgba(34,211,238,0.10)', border: 'rgba(167,139,250,0.30)' },
];

const getLevel = (pts) => LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];

// ─── PUNTOS ───────────────────────────────────────────────────────────────────
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
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 85% 20%, ${level.bg}, transparent 65%)` }} />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(240,244,236,0.45)' }}>
              Tus puntos
            </p>
            <p className="font-mono font-black text-5xl text-white leading-none">
              {points.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl flex-shrink-0"
            style={{ background: level.bg, border: `1px solid ${level.border}` }}>
            <span className="text-3xl">{level.icon}</span>
            <p className="text-sm font-black mt-1 tracking-wide" style={{ color: level.color }}>
              {level.name}
            </p>
          </div>
        </div>

        {nextLevel ? (
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
              <span className="font-mono">{points.toLocaleString()} pts</span>
              <span>
                Faltan <span style={{ color: nextLevel.color }} className="font-bold">
                  {(nextLevel.min - points).toLocaleString()} pts
                </span> para {nextLevel.icon} {nextLevel.name}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${level.color}, ${level.colorEnd})`, boxShadow: `0 0 10px ${level.color}55` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${level.color}, ${level.colorEnd})` }} />
            </div>
            <p className="text-xs font-bold flex-shrink-0" style={{ color: level.color }}>Nivel máximo 🏆</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── COOLDOWN ─────────────────────────────────────────────────────────────────
function CooldownBanner({ info }) {
  if (!info?.active) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⏳</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#fde68a' }}>Cooldown activo</p>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
            Podés volver a canjear en{' '}
            <span className="text-white font-semibold">{info.daysLeft} día{info.daysLeft > 1 ? 's' : ''}</span>
            {' '}— el{' '}
            {new Date(info.nextAllowedAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.30)' }}>
            Límite de un canje por semana para mayor equidad 🤝
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── CARD DE RECOMPENSA ───────────────────────────────────────────────────────
function RewardCard({ reward, points, cooldown, onClick, index }) {
  const [imgError, setImgError] = useState(false);
  const canAfford   = points >= reward.pointsCost;
  const outOfStock  = reward.stock === 0;
  const onCooldown  = cooldown?.active;
  const disabled    = !canAfford || outOfStock || onCooldown;
  const progress    = Math.min((points / reward.pointsCost) * 100, 100);

  const statusLabel = outOfStock
    ? { text: 'Sin stock', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' }
    : onCooldown
    ? { text: `${cooldown.daysLeft}d espera`, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' }
    : canAfford
    ? { text: '✓ Disponible', color: '#9de360', bg: 'rgba(92,181,22,0.12)', border: 'rgba(92,181,22,0.25)' }
    : { text: `Faltan ${(reward.pointsCost - points).toLocaleString()} pts`, color: 'rgba(240,244,236,0.40)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
      style={{ opacity: disabled && outOfStock ? 0.55 : 1 }}
    >
      {/* Imagen */}
      {reward.image && !imgError ? (
        <div className="relative">
          <img
            src={reward.image}
            alt={reward.name}
            className="w-full h-44 object-cover"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.90) 0%, transparent 55%)' }} />
          {/* Badge de puntos sobre la imagen */}
          <div className="absolute bottom-3 left-3">
            <span className="badge text-xs font-bold font-mono"
              style={{ background: 'rgba(167,139,250,0.20)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)' }}>
              🎁 {reward.pointsCost.toLocaleString()} pts
            </span>
          </div>
          {/* Badge de estado arriba derecha */}
          <div className="absolute top-3 right-3">
            <span className="badge text-xs font-semibold"
              style={{ background: statusLabel.bg, color: statusLabel.color, border: `1px solid ${statusLabel.border}` }}>
              {statusLabel.text}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {/* Sin imagen: badges arriba */}
        {(!reward.image || imgError) && (
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="badge text-xs font-bold font-mono"
              style={{ background: 'rgba(167,139,250,0.20)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)' }}>
              🎁 {reward.pointsCost.toLocaleString()} pts
            </span>
            <span className="badge text-xs font-semibold"
              style={{ background: statusLabel.bg, color: statusLabel.color, border: `1px solid ${statusLabel.border}` }}>
              {statusLabel.text}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{reward.name}</h3>
            {reward.description && (
              <p className="text-sm mt-1 line-clamp-2" style={{ color: 'rgba(240,244,236,0.55)' }}>
                {reward.description}
              </p>
            )}
          </div>
          <span style={{ color: 'rgba(240,244,236,0.25)', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
        </div>

        {/* Barra de progreso si no puede pagar */}
        {!canAfford && !outOfStock && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #5cb516, #9de360)' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.30)' }}>
              {Math.round(progress)}% del total
            </p>
          </div>
        )}

        {/* Stock */}
        <p className="text-xs mt-2" style={{ color: 'rgba(240,244,236,0.28)' }}>
          {reward.stock === -1 ? 'Stock ilimitado' : reward.stock === 0 ? 'Sin stock disponible' : `${reward.stock} disponibles`}
        </p>
      </div>
    </motion.div>
  );
}

// ─── MODAL DE RECOMPENSA ──────────────────────────────────────────────────────
function RewardModal({ reward, points, cooldown, onClose, onRedeem, isPending }) {
  const [imgError, setImgError] = useState(false);
  const canAfford  = points >= reward.pointsCost;
  const outOfStock = reward.stock === 0;
  const onCooldown = cooldown?.active;
  const disabled   = !canAfford || outOfStock || onCooldown;
  const shortage   = reward.pointsCost - points;
  const progress   = Math.min((points / reward.pointsCost) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl"
        style={{ background: '#111d0d', border: '1px solid rgba(92,181,22,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0"
          style={{ background: 'rgba(255,255,255,0.12)' }} />

        {/* Imagen o header */}
        {reward.image && !imgError ? (
          <div className="relative mt-2">
            <img
              src={reward.image}
              alt={reward.name}
              className="w-full h-52 object-cover rounded-t-2xl"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 rounded-t-2xl"
              style={{ background: 'linear-gradient(to top, #111d0d 0%, transparent 55%)' }} />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.50)', color: 'rgba(255,255,255,0.70)' }}>
              ✕
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center px-6 pt-4">
            <div className="text-4xl">🎁</div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl p-2">✕</button>
          </div>
        )}

        <div className="p-6 pt-4">
          {/* Nombre y costo */}
          <div className="mb-4">
            <span className="badge text-xs font-bold font-mono mb-2"
              style={{ background: 'rgba(167,139,250,0.20)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)' }}>
              🎁 {reward.pointsCost.toLocaleString()} puntos
            </span>
            <h2 className="font-display font-bold text-2xl text-white mt-2">{reward.name}</h2>
            {reward.description && (
              <p className="mt-2 leading-relaxed" style={{ color: 'rgba(240,244,236,0.65)' }}>
                {reward.description}
              </p>
            )}
          </div>

          {/* Resumen de puntos */}
          <div className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'rgba(240,244,236,0.45)' }}>Tus puntos</span>
              <span className="font-mono font-bold text-white">{points.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span style={{ color: 'rgba(240,244,236,0.45)' }}>Costo del canje</span>
              <span className="font-mono font-bold" style={{ color: '#c4b5fd' }}>
                -{reward.pointsCost.toLocaleString()}
              </span>
            </div>
            {/* Barra */}
            <div className="h-2 rounded-full overflow-hidden mb-2"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: canAfford
                  ? 'linear-gradient(90deg, #5cb516, #9de360)'
                  : 'linear-gradient(90deg, #b45309, #d97706)' }}
              />
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>
              <span>{Math.round(progress)}% completado</span>
              {canAfford ? (
                <span style={{ color: '#9de360' }}>
                  Te quedarán {(points - reward.pointsCost).toLocaleString()} pts
                </span>
              ) : (
                <span style={{ color: '#fbbf24' }}>
                  Faltan {shortage.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>

          {/* Stock */}
          <p className="text-xs mb-5" style={{ color: 'rgba(240,244,236,0.30)' }}>
            {reward.stock === -1 ? '∞ Stock ilimitado'
              : reward.stock === 0 ? '✕ Sin stock disponible'
              : `${reward.stock} unidades disponibles`}
          </p>

          {/* Aviso cooldown */}
          {onCooldown && (
            <div className="rounded-xl p-3 mb-4"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
              <p className="text-sm" style={{ color: '#fde68a' }}>
                ⏳ Podés canjear de nuevo en {cooldown.daysLeft} día{cooldown.daysLeft > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-3">
              Cerrar
            </button>
            <button
              onClick={() => !disabled && onRedeem(reward.id)}
              disabled={disabled || isPending}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
              style={disabled ? {
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(240,244,236,0.25)',
                cursor: 'not-allowed',
              } : {
                background: 'linear-gradient(135deg, #5cb516, #459110)',
                color: '#fff',
              }}
            >
              {isPending ? '⏳ Canjeando...'
                : outOfStock ? 'Sin stock'
                : onCooldown ? 'En espera'
                : !canAfford ? `Faltan ${shortage.toLocaleString()} pts`
                : '✓ Canjear ahora'}
            </button>
          </div>

          {canAfford && !disabled && (
            <p className="text-xs text-center mt-3" style={{ color: 'rgba(240,244,236,0.25)' }}>
              ⏳ No podrás volver a canjear por 7 días
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────
export default function ClientRewards() {
  const { user, refreshMe } = useAuthStore();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

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
    const handle = () => { refreshMe(); refetchRewards(); refetchRedemptions(); };
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
      setSelected(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al canjear');
    },
  });

  const points      = user?.points || 0;
  const rewards     = rewardsData?.rewards || [];
  const cooldown    = rewardsData?.cooldownInfo;
  const redemptions = redemptionsData?.redemptions || [];

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Recompensas</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.50)' }}>
          Canjeá tus puntos por premios
        </p>
      </div>

      <PointsCard points={points} />
      <CooldownBanner info={cooldown} />

      {/* Lista de recompensas */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-3 text-white">Disponibles</h3>
        {rewards.length === 0 ? (
          <div className="card p-10 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
            <div className="text-4xl mb-2">🎁</div>
            <p>No hay recompensas disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward, i) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                points={points}
                cooldown={cooldown}
                index={i}
                onClick={() => setSelected(reward)}
              />
            ))}
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
                      {new Date(r.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm" style={{ color: '#c4b5fd' }}>
                    -{r.points.toLocaleString()}
                  </p>
                  <span className="text-xs font-medium" style={{
                    color: r.status === 'APPROVED' ? '#4ade80'
                      : r.status === 'REJECTED' ? '#f87171'
                      : '#fbbf24',
                  }}>
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

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <RewardModal
            reward={selected}
            points={points}
            cooldown={cooldown}
            onClose={() => setSelected(null)}
            onRedeem={(id) => redeemMutation.mutate(id)}
            isPending={redeemMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
