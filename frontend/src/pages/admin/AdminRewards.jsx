import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

function RewardFormModal({ reward, onClose, onSaved }) {
  const isEdit = !!reward;
  const [form, setForm] = useState(reward || {
    name: '', description: '', image: '', pointsCost: '', stock: -1, isActive: true,
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/api/rewards/${reward.id}`, data)
      : api.post('/api/rewards', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Recompensa actualizada' : 'Recompensa creada');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const set = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [f]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      pointsCost: parseInt(form.pointsCost),
      stock: parseInt(form.stock),
      image: form.image || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-2xl mb-5">{isEdit ? 'Editar' : 'Nueva'} Recompensa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" className="input" placeholder="Ej: Descuento $500" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[70px] resize-none" placeholder="Descripción de la recompensa..." value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="label">Imagen (URL)</label>
            <input type="url" className="input" placeholder="https://..." value={form.image} onChange={set('image')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Costo en puntos *</label>
              <input type="number" className="input" placeholder="500" value={form.pointsCost} onChange={set('pointsCost')} required min="1" />
            </div>
            <div>
              <label className="label">Stock (-1 = ilimitado)</label>
              <input type="number" className="input" placeholder="-1" value={form.stock} onChange={set('stock')} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 rounded accent-khaluby-500" />
            <label htmlFor="isActive" className="text-sm text-white/70">Activa y visible</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? '⏳...' : '✓ Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function AdminRewards() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);

  const { data } = useQuery({
    queryKey: ['admin-rewards'],
    queryFn: () => api.get('/api/rewards').then(r => r.data),
  });

  const { data: redemptionsData } = useQuery({
    queryKey: ['all-redemptions'],
    queryFn: () => api.get('/api/rewards/redemptions').then(r => r.data),
  });

  const approveRedemptionMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/rewards/redemptions/${id}`, { status }),
    onSuccess: (res, { status }) => {
      const d = res.data;
      if (status === 'REJECTED') {
        toast.success(d.message || 'Canje rechazado — puntos devueltos', { duration: 4000 });
      } else {
        toast.success(d.message || 'Canje aprobado');
      }
      queryClient.invalidateQueries({ queryKey: ['all-redemptions'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al procesar'),
  });

  const rewards = data?.rewards || [];
  const redemptions = redemptionsData?.redemptions || [];
  const pendingRedemptions = redemptions.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl">Recompensas</h1>
          <p className="text-white/40 mt-1">{rewards.length} recompensas · {pendingRedemptions.length} canjes pendientes</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ Nueva recompensa</button>
      </div>

      {/* Pending redemptions */}
      {pendingRedemptions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4 border border-yellow-500/30">
          <p className="text-yellow-400 font-semibold mb-3">⚠️ {pendingRedemptions.length} canje(s) pendiente(s) de aprobación</p>
          <div className="space-y-2">
            {pendingRedemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.user.name} — <span className="text-khaluby-300">{r.reward.name}</span></p>
                  <p className="text-white/30 text-xs">{r.points} pts · {new Date(r.createdAt).toLocaleString('es-AR')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveRedemptionMutation.mutate({ id: r.id, status: 'APPROVED' })}
                    disabled={approveRedemptionMutation.isPending}
                    className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium hover:bg-green-500/30 disabled:opacity-50"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => approveRedemptionMutation.mutate({ id: r.id, status: 'REJECTED' })}
                    disabled={approveRedemptionMutation.isPending}
                    className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rewards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward, i) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`card p-5 ${!reward.isActive ? 'opacity-50' : ''}`}
          >
            {reward.image ? (
              <img src={reward.image} alt={reward.name} className="w-full h-32 object-cover rounded-xl mb-3" />
            ) : (
              <div className="w-full h-20 bg-dark-700 rounded-xl mb-3 flex items-center justify-center text-3xl">🎁</div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{reward.name}</h3>
                {reward.description && <p className="text-white/40 text-sm mt-0.5 line-clamp-2">{reward.description}</p>}
              </div>
              <span className={`badge text-xs flex-shrink-0 ${reward.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-dark-600 text-white/30 border border-white/10'}`}>
                {reward.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-khaluby-400">{reward.pointsCost.toLocaleString()} pts</p>
                <p className="text-white/30 text-xs">{reward.stock === -1 ? 'Ilimitado' : `${reward.stock} en stock`} · {reward._count?.redemptions || 0} canjes</p>
              </div>
              <button onClick={() => setModal(reward)} className="btn-secondary text-xs py-1.5 px-3">Editar</button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal && (
          <RewardFormModal
            reward={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-rewards'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
