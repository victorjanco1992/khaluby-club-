import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';
import toast from 'react-hot-toast';

const LEVELS = [
  { name: 'Bronce',   min: 0,     max: 999,     color: 'from-amber-700 to-amber-500',   icon: '🥉' },
  { name: 'Plata',    min: 1000,  max: 4999,    color: 'from-slate-400 to-slate-200',   icon: '🥈' },
  { name: 'Oro',      min: 5000,  max: 19999,   color: 'from-yellow-500 to-amber-300',  icon: '🥇' },
  { name: 'Diamante', min: 20000, max: Infinity, color: 'from-cyan-400 to-violet-400',  icon: '💎' },
];
const getLevel = (pts) => LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];

function CooldownBanner({ info }) {
  if (!info?.active) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 border border-amber-500/25"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">⏳</span>
        <div>
          <p className="font-semibold text-amber-400">Cooldown activo</p>
          <p className="text-white/50 text-sm mt-0.5">
            Podés volver a canjear en{' '}
            <span className="text-white font-semibold">{info.daysLeft} día{info.daysLeft > 1 ? 's' : ''}</span>
            {' '}— el {new Date(info.nextAllowedAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-white/30 text-xs mt-1">Límite de un canje por semana para mayor equidad 🤝</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ClientRewards() {
  const { user, refreshMe } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(null);

  // Refrescar al montar e invalidar cooldown
  useEffect(() => {
    refreshMe().then(() => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    });
  }, []);

  // Escuchar evento socket cuando el admin aprueba/rechaza
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);

    socket.on('points:updated', () => {
      refreshMe().then(() => {
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
      });
    });

    return () => socket.off('points:updated');
  }, [user?.id]);

  const { data: rewardsData } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => api.get('/api/rewards').then(r => r.data),
  });

  const { data: redemptionsData } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: () => api.get('/api/rewards/redemptions').then(r => r.data),
  });

  const redeemMutation = useMutation({
    mutationFn: (id) => api.post(`/api/rewards/${id}/redeem`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
      refreshMe();
      setConfirming(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al canjear');
      setConfirming(null);
    },
  });

  const points = user?.points || 0;
  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel ? Math.min(((points - level.min) / (nextLevel.min - level.min)) * 100, 100) : 100;

  const rewards = rewardsData?.rewards || [];
  const cooldown = rewardsData?.cooldownInfo;
  const redemptions = redemptionsData?.redemptions || [];

  return (
    <div className="p-4 space-y-5">
      {/* Points bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/40 text-sm">Tus puntos</p>
            <p className="font-mono font-black text-4xl">{points.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl">{level.icon}</span>
            <p className={`text-sm font-bold bg-gradient-to-r ${level.color} bg-clip-text text-transparent mt-1`}>
              {level.name}
            </p>
          </div>
        </div>
        {nextLevel && (
          <>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-full bg-gradient-to-r ${level.color} rounded-full`}
              />
            </div>
            <p className="text-white/25 text-xs mt-2">
              Faltan {(nextLevel.min - points).toLocaleString()} pts para {nextLevel.name} {nextLevel.icon}
            </p>
          </>
        )}
      </motion.div>

      {/* Cooldown banner */}
      <CooldownBanner info={cooldown} />

      {/* Rewards */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-3">Recompensas</h3>
        {rewards.length === 0 ? (
          <div className="card p-8 text-center text-white/30">
            <div className="text-4xl mb-2">🎁</div>
            <p>No hay recompensas disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map(reward => {
              const canAfford = points >= reward.pointsCost;
              const outOfStock = reward.stock === 0;
              const onCooldown = cooldown?.active;
              const disabled = !canAfford || outOfStock || onCooldown;

              return (
                <div key={reward.id} className={`card p-5 transition-all ${disabled ? 'opacity-60' : 'hover:border-white/15'}`}>
                  <div className="flex items-start gap-4">
                    {reward.image ? (
                      <img
                        src={reward.image}
                        alt={reward.name}
                        className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎁</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{reward.name}</h3>
                      {reward.description && <p className="text-white/40 text-sm mt-0.5">{reward.description}</p>}
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div>
                          <p className="font-mono font-bold text-violet-400">{reward.pointsCost.toLocaleString()} pts</p>
                          {reward.stock > 0 && <p className="text-white/25 text-xs">{reward.stock} disponibles</p>}
                          {reward.stock === -1 && <p className="text-white/25 text-xs">Ilimitado</p>}
                        </div>
                        <button
                          onClick={() => !disabled && setConfirming(reward)}
                          disabled={disabled}
                          className={`text-sm px-4 py-2 rounded-xl font-medium transition-all ${
                            disabled
                              ? 'bg-white/5 text-white/20 cursor-not-allowed'
                              : 'btn-primary text-sm px-4 py-2'
                          }`}
                        >
                          {outOfStock ? 'Sin stock'
                            : onCooldown ? `${cooldown.daysLeft}d de espera`
                            : !canAfford ? `Faltan ${(reward.pointsCost - points).toLocaleString()}`
                            : 'Canjear'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {redemptions.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-lg mb-3">Historial de canjes</h3>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="text-sm font-medium">{r.reward.name}</p>
                    <p className="text-white/30 text-xs">{new Date(r.createdAt).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-violet-400 text-sm">-{r.points.toLocaleString()}</p>
                  <span className={`text-xs ${
                    r.status === 'APPROVED' ? 'text-emerald-400'
                    : r.status === 'REJECTED' ? 'text-red-400'
                    : 'text-amber-400'
                  }`}>
                    {r.status === 'APPROVED' ? '✓ Aprobado' : r.status === 'REJECTED' ? '✕ Rechazado' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            onClick={() => setConfirming(null)}
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="card-glass w-full max-w-sm p-6 rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">🎁</div>
                <h3 className="font-display font-bold text-xl">Confirmar canje</h3>
                <p className="text-white/50 text-sm mt-2">
                  ¿Canjeás <span className="text-white font-medium">{confirming.name}</span> por{' '}
                  <span className="text-violet-400 font-mono font-bold">{confirming.pointsCost.toLocaleString()} pts</span>?
                </p>
                <p className="text-white/25 text-xs mt-2">
                  ⏳ No podrás volver a canjear por 7 días
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirming(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => redeemMutation.mutate(confirming.id)}
                  disabled={redeemMutation.isPending}
                  className="btn-primary flex-1"
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
