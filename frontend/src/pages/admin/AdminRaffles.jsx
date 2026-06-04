import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  ACTIVE:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  DRAWING:  'bg-red-500/15 text-red-400 border-red-500/25',
  FINISHED: 'bg-white/8 text-white/35 border-white/10',
};
const STATUS_LABELS = { PENDING: 'Pendiente', ACTIVE: 'Activo', DRAWING: 'Sorteando', FINISHED: 'Finalizado' };

function RaffleFormModal({ raffle, onClose, onSaved }) {
  const isEdit = !!raffle;
  const [form, setForm] = useState({
    title: raffle?.title || '',
    description: raffle?.description || '',
    prize: raffle?.prize || '',
    prizeImage: raffle?.prizeImage || '',
    isPublic: raffle?.isPublic ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/api/raffles/${raffle.id}`, data)
      : api.post('/api/raffles', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Sorteo actualizado' : 'Sorteo creado');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const set = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [f]: val }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
        className="card w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-2xl mb-5">
          {isEdit ? '✏️ Editar sorteo' : '🎰 Nuevo sorteo'}
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Título *</label>
            <input type="text" className="input" placeholder="Gran Sorteo de Navidad" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[70px] resize-none" placeholder="Descripción..." value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="label">Premio *</label>
            <input type="text" className="input" placeholder="Canasta Premium $20.000" value={form.prize} onChange={set('prize')} required />
          </div>
          <div>
            <label className="label">Imagen del premio (URL)</label>
            <input type="url" className="input" placeholder="https://i.imgur.com/..." value={form.prizeImage} onChange={set('prizeImage')} />
            {form.prizeImage && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                <img
                  src={form.prizeImage}
                  alt="preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={set('isPublic')} className="w-4 h-4 rounded accent-violet-500" />
            <label htmlFor="isPublic" className="text-sm text-white/60">Visible para clientes</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? '⏳...' : `✓ ${isEdit ? 'Guardar' : 'Crear'}`}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function AdminRaffles() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | raffle object

  const { data } = useQuery({
    queryKey: ['admin-raffles'],
    queryFn: () => api.get('/api/raffles?limit=50').then(r => r.data),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/raffles/${id}/activate`),
    onSuccess: () => { toast.success('Sorteo activado'); queryClient.invalidateQueries({ queryKey: ['admin-raffles'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.post(`/api/raffles/${id}/reset`),
    onSuccess: () => { toast.success('Reseteado'); queryClient.invalidateQueries({ queryKey: ['admin-raffles'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/raffles/${id}`),
    onSuccess: () => { toast.success('Sorteo eliminado'); queryClient.invalidateQueries({ queryKey: ['admin-raffles'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const raffles = data?.raffles || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl">Sorteos</h1>
          <p className="text-white/40 mt-1">{raffles.length} sorteos registrados</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ Nuevo sorteo</button>
      </div>

      <div className="space-y-4">
        {raffles.length === 0 && (
          <div className="card p-12 text-center text-white/30">
            <div className="text-5xl mb-3">🎰</div>
            <p>No hay sorteos. ¡Creá el primero!</p>
          </div>
        )}
        {raffles.map((raffle, i) => (
          <motion.div
            key={raffle.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card p-5"
          >
            <div className="flex gap-4">
              {/* Prize image */}
              {raffle.prizeImage && (
                <img
                  src={raffle.prizeImage}
                  alt={raffle.prize}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{raffle.title}</h3>
                      <span className={`badge border ${STATUS_STYLES[raffle.status]}`}>
                        {STATUS_LABELS[raffle.status]}
                      </span>
                    </div>
                    {raffle.description && <p className="text-white/40 text-sm mt-0.5">{raffle.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                      <span className="text-amber-400 font-medium">🏆 {raffle.prize}</span>
                      <span className="text-white/30">{raffle._count?.entries || 0} participantes</span>
                    </div>
                    {raffle.winnerNumber && (
                      <p className="text-emerald-400 text-sm mt-1">✅ Ganador: #{raffle.winnerNumber}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setModal(raffle)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    ✏️ Editar
                  </button>
                  {raffle.status === 'PENDING' && (
                    <button
                      onClick={() => activateMutation.mutate(raffle.id)}
                      disabled={activateMutation.isPending}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 text-xs py-1.5 px-3 rounded-xl transition-all"
                    >
                      ▶ Activar
                    </button>
                  )}
                  {raffle.status === 'ACTIVE' && (
                    <Link
                      to={`/admin/sorteos/${raffle.id}/realizar`}
                      className="bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/25 text-xs py-1.5 px-3 rounded-xl transition-all"
                    >
                      🎰 Sortear
                    </Link>
                  )}
                  {(raffle.status === 'ACTIVE' || raffle.status === 'FINISHED') && (
                    <button
                      onClick={() => { if (confirm('¿Resetear participaciones?')) resetMutation.mutate(raffle.id); }}
                      className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 text-xs py-1.5 px-3 rounded-xl transition-all"
                    >
                      ↺ Resetear
                    </button>
                  )}
                  {raffle.status !== 'ACTIVE' && (
                    <button
                      onClick={() => { if (confirm('¿Eliminar este sorteo?')) deleteMutation.mutate(raffle.id); }}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      🗑 Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal && (
          <RaffleFormModal
            raffle={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-raffles'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}