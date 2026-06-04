import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';

function StatCard({ icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm" style={{ color: 'rgba(240,244,236,0.55)' }}>{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="font-mono font-bold text-2xl" style={{ color }}>{value}</p>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>
            Resumen del sistema
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/compras" className="btn-primary text-sm py-2.5 px-4">
            🛒 Cargar compra
          </Link>
          <Link to="/admin/sorteos" className="btn-secondary text-sm py-2.5 px-4">
            🎰 Sorteos
          </Link>
        </div>
      </div>

      {/* Stats — 2 columnas en mobile, 4 en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Clientes" value={stats.totalClients?.toLocaleString() || '0'} color="#9de360" delay={0} />
        <StatCard icon="💰" label="Facturado" value={`$${(stats.totalRevenue || 0).toLocaleString()}`} color="#6ee7b7" delay={0.05} />
        <StatCard icon="⭐" label="Puntos" value={(stats.totalPoints || 0).toLocaleString()} color="#fde68a" delay={0.1} />
        <StatCard icon="🎁" label="Canjes" value={stats.totalRedemptions?.toLocaleString() || '0'} color="#c4b5fd" delay={0.15} />
      </div>

      {/* Sorteo activo */}
      {stats.activeRaffle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
          style={{ borderColor: 'rgba(92,181,22,0.25)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#5cb516' }} />
            <p className="text-sm font-semibold" style={{ color: '#9de360' }}>Sorteo Activo</p>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{stats.activeRaffle.title}</h3>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(240,244,236,0.50)' }}>
                {stats.activeRaffle._count?.entries || 0} participantes
              </p>
            </div>
            <Link
              to={`/admin/sorteos/${stats.activeRaffle.id}/realizar`}
              className="btn-primary text-sm py-2.5 px-5 flex-shrink-0"
            >
              🎰 Sortear
            </Link>
          </div>
        </motion.div>
      )}

      {/* Compras recientes */}
      {stats.recentPurchases?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Últimas compras</h3>
            <Link to="/admin/compras" className="text-sm" style={{ color: '#9de360' }}>
              Ver todas →
            </Link>
          </div>

          <div className="card overflow-hidden">
            {/* Mobile: cards apiladas */}
            <div className="lg:hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {stats.recentPurchases.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm truncate">{p.user.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>
                      {new Date(p.createdAt).toLocaleString('es-AR', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-sm" style={{ color: '#6ee7b7' }}>
                      ${p.amount.toLocaleString()}
                    </p>
                    <p className="text-xs font-mono" style={{ color: '#fde68a' }}>
                      +{p.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Cliente', 'Monto', 'Puntos', 'Números', 'Fecha'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'rgba(240,244,236,0.35)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPurchases.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-white">{p.user.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>{p.user.dni}</p>
                      </td>
                      <td className="px-5 py-3 font-mono font-medium text-sm" style={{ color: '#6ee7b7' }}>
                        ${p.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-sm" style={{ color: '#fde68a' }}>
                        +{p.points}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9de360' }}>
                        {p.numbers?.length > 0 ? `+${p.numbers.length}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>
                        {new Date(p.createdAt).toLocaleString('es-AR', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
