import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email || '',
    points: client.points,
  });
  const [tab, setTab] = useState('info');
  const [newPassword, setNewPassword] = useState('');

  const editMutation = useMutation({
    mutationFn: (data) => api.put(`/api/admin/clients/${client.id}`, data),
    onSuccess: () => { toast.success('Cliente actualizado'); onSaved(); onClose(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (pwd) => api.post(`/api/admin/clients/${client.id}/reset-password`, { newPassword: pwd || undefined }),
    onSuccess: (res) => { toast.success(res.data.message); setNewPassword(''); },
    onError: () => toast.error('Error'),
  });

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5"
        style={{ background: '#0d1a0a', border: '1px solid rgba(92,181,22,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar mobile */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-xl text-white">Editar cliente</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>DNI: {client.dni}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.60)' }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1 mb-4"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          {[{ key: 'info', label: '👤 Datos' }, { key: 'password', label: '🔐 Contraseña' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === key ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: tab === key ? 'white' : 'rgba(240,244,236,0.45)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate({ ...form, points: parseInt(form.points) }); }}
            className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input type="text" className="input" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" className="input" value={form.phone} onChange={set('phone')} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Puntos</label>
              <input type="number" className="input" value={form.points} onChange={set('points')} min="0" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={editMutation.isPending}>
                {editMutation.isPending ? '⏳...' : '✓ Guardar'}
              </button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
              <p className="font-medium text-sm mb-1" style={{ color: '#fde68a' }}>⚠️ Resetear al DNI</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(240,244,236,0.55)' }}>
                La nueva contraseña será: <span className="font-mono text-white">{client.dni}</span>
              </p>
              <button
                onClick={() => resetPasswordMutation.mutate('')}
                disabled={resetPasswordMutation.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                {resetPasswordMutation.isPending ? '⏳...' : '🔑 Resetear al DNI'}
              </button>
            </div>
            <div>
              <label className="label">O nueva contraseña personalizada</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="Nueva contraseña..."
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            {newPassword.length >= 4 && (
              <button
                onClick={() => resetPasswordMutation.mutate(newPassword)}
                disabled={resetPasswordMutation.isPending}
                className="btn-primary w-full"
              >
                {resetPasswordMutation.isPending ? '⏳...' : '✓ Establecer contraseña'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AdminClients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingClient, setEditingClient] = useState(null);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(window._st);
    window._st = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', debouncedSearch],
    queryFn: () =>
      api.get(`/api/admin/clients?limit=50${debouncedSearch ? `&search=${debouncedSearch}` : ''}`).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/admin/clients/${id}/toggle`),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/clients/${id}`),
    onSuccess: () => {
      toast.success('Cliente eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const clients = data?.users || [];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Clientes</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>
          {data?.total || 0} clientes registrados
        </p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
          style={{ color: 'rgba(240,244,236,0.35)' }}>🔍</span>
        <input
          type="text"
          className="input pl-11"
          placeholder="Buscar por nombre, DNI o teléfono..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Lista — cards en mobile */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
          <div className="text-4xl mb-2">👥</div>
          <p>{debouncedSearch ? 'Sin resultados' : 'No hay clientes'}</p>
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {clients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className={`p-4 ${!client.isActive ? 'opacity-55' : ''}`}
            >
              {/* Fila principal */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    background: client.isActive ? 'rgba(92,181,22,0.18)' : 'rgba(255,255,255,0.06)',
                    color: client.isActive ? '#9de360' : 'rgba(240,244,236,0.35)',
                  }}
                >
                  {client.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{client.name}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(240,244,236,0.45)' }}>
                    {client.dni} · {client.phone}
                  </p>
                </div>
                {/* Estado */}
                <button
                  onClick={() => toggleMutation.mutate(client.id)}
                  className="badge text-xs flex-shrink-0"
                  style={client.isActive
                    ? { background: 'rgba(92,181,22,0.12)', color: '#9de360', border: '1px solid rgba(92,181,22,0.25)' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }
                  }
                >
                  {client.isActive ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {/* Stats + acciones */}
              <div className="flex items-center justify-between mt-3 pl-13">
                <div className="flex gap-4 text-sm ml-13">
                  <span className="font-mono font-bold" style={{ color: '#9de360' }}>
                    {client.points.toLocaleString()} pts
                  </span>
                  <span className="font-mono" style={{ color: '#6ee7b7' }}>
                    ${client.totalSpent.toLocaleString()}
                  </span>
                  <span style={{ color: 'rgba(240,244,236,0.35)' }}>
                    {client._count?.purchases || 0} compras
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.60)' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${client.name}?`)) deleteMutation.mutate(client.id);
                    }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingClient && (
          <EditClientModal
            client={editingClient}
            onClose={() => setEditingClient(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-clients'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
