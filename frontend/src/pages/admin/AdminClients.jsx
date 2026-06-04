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
  const [tab, setTab] = useState('info'); // 'info' | 'password'
  const [newPassword, setNewPassword] = useState('');

  const editMutation = useMutation({
    mutationFn: (data) => api.put(`/api/admin/clients/${client.id}`, data),
    onSuccess: () => { toast.success('Cliente actualizado'); onSaved(); onClose(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (pwd) => api.post(`/api/admin/clients/${client.id}/reset-password`, { newPassword: pwd || undefined }),
    onSuccess: (res) => { toast.success(res.data.message); setNewPassword(''); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
        className="card w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-xl">Editar cliente</h3>
            <p className="text-white/40 text-sm">DNI: {client.dni}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-2">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 mb-5">
          {[
            { key: 'info', label: '👤 Datos' },
            { key: 'password', label: '🔐 Contraseña' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate({ ...form, points: parseInt(form.points) }); }} className="space-y-4">
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
              <p className="text-white/25 text-xs mt-1">Podés ajustar manualmente los puntos del cliente</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={editMutation.isPending}>
                {editMutation.isPending ? '⏳...' : '✓ Guardar'}
              </button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <div className="space-y-4">
            <div className="card p-4 border border-amber-500/20">
              <p className="text-amber-400 text-sm font-medium mb-1">⚠️ Resetear al DNI</p>
              <p className="text-white/50 text-sm">
                Esto cambiará la contraseña del cliente a su DNI: <span className="font-mono text-white">{client.dni}</span>
              </p>
              <button
                onClick={() => resetPasswordMutation.mutate('')}
                disabled={resetPasswordMutation.isPending}
                className="mt-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 text-sm py-2 px-4 rounded-xl transition-all w-full"
              >
                {resetPasswordMutation.isPending ? '⏳...' : '🔑 Resetear al DNI'}
              </button>
            </div>

            <div>
              <label className="label">O establecer contraseña personalizada</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="Nueva contraseña..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
    queryFn: () => api.get(`/api/admin/clients?limit=50${debouncedSearch ? `&search=${debouncedSearch}` : ''}`).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/admin/clients/${id}/toggle`),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['admin-clients'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/clients/${id}`),
    onSuccess: () => { toast.success('Cliente eliminado'); queryClient.invalidateQueries({ queryKey: ['admin-clients'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const clients = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl">Clientes</h1>
          <p className="text-white/40 mt-1">{data?.total || 0} clientes registrados</p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">🔍</span>
        <input type="text" className="input pl-11" placeholder="Buscar por nombre, DNI o teléfono..." value={search} onChange={handleSearch} />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/30 animate-pulse">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center text-white/30">
            <div className="text-4xl mb-2">👥</div>
            <p>{debouncedSearch ? 'Sin resultados' : 'No hay clientes'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-5 py-3 text-left text-white/35 text-xs font-medium uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-right text-white/35 text-xs font-medium uppercase tracking-wider">Puntos</th>
                  <th className="px-4 py-3 text-right text-white/35 text-xs font-medium uppercase tracking-wider">Gastado</th>
                  <th className="px-4 py-3 text-right text-white/35 text-xs font-medium uppercase tracking-wider">Compras</th>
                  <th className="px-4 py-3 text-center text-white/35 text-xs font-medium uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-white/35 text-xs font-medium uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          client.isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/20'
                        }`}>
                          {client.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-white/30 text-xs">DNI: {client.dni} · {client.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-bold text-violet-400">{client.points.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono text-emerald-400">${client.totalSpent.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-right text-white/40 text-sm">{client._count?.purchases || 0}</td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleMutation.mutate(client.id)}
                        className={`badge border transition-all ${client.isActive ? 'pill-active hover:bg-red-500/10' : 'pill-inactive hover:bg-emerald-500/10'}`}
                      >
                        {client.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingClient(client)}
                          className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) deleteMutation.mutate(client.id); }}
                          className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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