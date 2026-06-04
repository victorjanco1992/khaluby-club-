import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore.js';
import api from '../../lib/api.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClientProfile() {
  const { user, qrDataUrl, refreshMe } = useAuthStore();

  useEffect(() => { refreshMe(); }, []);

  const { data: winData } = useQuery({
    queryKey: ['my-win'],
    queryFn: () => api.get('/api/raffles/my-win').then(r => r.data),
  });

  const win = winData?.win;

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Mi Perfil</h2>
        <p className="text-white/50 text-sm mt-1">Mostrá tu QR en caja para sumar puntos</p>
      </div>

      {/* QR */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 flex flex-col items-center"
      >
        <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Tu código QR</p>
        {qrDataUrl ? (
          <div className="p-4 bg-white rounded-2xl shadow-xl shadow-violet-500/20">
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />
          </div>
        ) : (
          <div className="w-52 h-52 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        )}
        <p className="text-white/70 text-sm mt-4 font-semibold">{user?.name}</p>
        <p className="text-white/40 text-xs">DNI: {user?.dni}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <span className="text-2xl">⭐</span>
          <p className="font-mono font-bold text-xl text-violet-400 mt-1">
            {(user?.points || 0).toLocaleString()}
          </p>
          <p className="text-white/50 text-xs">Puntos</p>
        </div>
        <div className="card p-4 text-center">
          <span className="text-2xl">💰</span>
          <p className="font-mono font-bold text-xl text-emerald-400 mt-1">
            ${(user?.totalSpent || 0).toLocaleString()}
          </p>
          <p className="text-white/50 text-xs">Total gastado</p>
        </div>
      </div>

      {/* Tarjeta de ganador — para mostrar presencialmente */}
      {win && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="winner-glow rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.4)' }}
        >
          {/* Imagen del premio */}
          {win.prizeImage && (
            <img
              src={win.prizeImage}
              alt={win.prize}
              className="w-full h-40 object-cover"
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}

          <div className="p-5" style={{ background: 'rgba(139,92,246,0.12)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd' }}
              >
                ¡GANASTE UN SORTEO!
              </span>
            </div>

            <div className="space-y-2 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Premio</span>
                <span className="text-amber-300 font-bold text-sm text-right max-w-[60%]">{win.prize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Sorteo</span>
                <span className="text-white/80 text-sm text-right max-w-[60%]">{win.raffleTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Número</span>
                <span className="font-mono font-bold text-violet-300">#{win.number}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-white/50 text-sm">Fecha</span>
                <span className="text-white/60 text-xs text-right max-w-[60%]">{formatDate(win.date)}</span>
              </div>
            </div>

            <p className="text-center text-white/35 text-xs mt-3">
              Mostrá esta tarjeta en caja para reclamar tu premio
            </p>
          </div>
        </motion.div>
      )}

      {/* Datos personales */}
      <div className="card p-5">
        <h3 className="font-semibold text-white/80 mb-3">Datos personales</h3>
        {[
          { label: 'Nombre',   value: user?.name },
          { label: 'Teléfono', value: user?.phone },
          { label: 'Email',    value: user?.email || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
            <span className="text-white/50 text-sm">{label}</span>
            <span className="text-white/85 text-sm">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}