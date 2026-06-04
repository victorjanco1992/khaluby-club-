import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';

function StatCard({ icon, label, value, sub, color = 'text-white', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/40 text-sm">{label}</p>
          <p className={`font-mono font-bold text-3xl mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-white/25 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
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
      <div className="space-y-6">
        <div className="h-8 w-48 bg-dark-700 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl">Dashboard</h1>
          <p className="text-white/40 mt-1">Resumen del sistema Despensa Khaluby</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/compras" className="btn-primary">
            🛒 Cargar compra
          </Link>
          <Link to="/admin/sorteos" className="btn-secondary">
            🎰 Sorteos
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Clientes activos" value={stats.totalClients?.toLocaleString() || '0'} color="text-blue-400" delay={0} />
        <StatCard icon="💰" label="Total facturado" value={`$${(stats.totalRevenue || 0).toLocaleString()}`} color="text-green-400" delay={0.05} />
        <StatCard icon="⭐" label="Puntos entregados" value={(stats.totalPoints || 0).toLocaleString()} color="text-khaluby-400" delay={0.1} />
        <StatCard icon="🎁" label="Canjes realizados" value={stats.totalRedemptions?.toLocaleString() || '0'} color="text-purple-400" delay={0.15} />
      </div>

      {/* Active raffle */}
      {stats.activeRaffle && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="card p-6 border border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h3 className="font-semibold text-green-400">Sorteo Activo</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-xl">{stats.activeRaffle.title}</h4>
                <p className="text-white/40 text-sm mt-1">
                  {stats.activeRaffle._count?.entries || 0} participantes registrados
                </p>
              </div>
              <Link
                to={`/admin/sorteos/${stats.activeRaffle.id}/realizar`}
                className="btn-primary"
              >
                🎰 Realizar sorteo
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent purchases */}
      {stats.recentPurchases?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-xl">Últimas compras</h3>
            <Link to="/admin/compras" className="text-khaluby-400 text-sm hover:text-khaluby-300">Ver todas →</Link>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-white/40 text-xs font-medium">Cliente</th>
                  <th className="px-5 py-3 text-right text-white/40 text-xs font-medium">Monto</th>
                  <th className="px-5 py-3 text-right text-white/40 text-xs font-medium">Puntos</th>
                  <th className="px-5 py-3 text-right text-white/40 text-xs font-medium">Números</th>
                  <th className="px-5 py-3 text-right text-white/40 text-xs font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPurchases.map((purchase, i) => (
                  <tr key={purchase.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-sm">{purchase.user.name}</p>
                      <p className="text-white/30 text-xs">{purchase.user.dni}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-green-400 font-medium">
                      ${purchase.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-khaluby-400 text-sm">
                      +{purchase.points}
                    </td>
                    <td className="px-5 py-3 text-right text-white/40 text-sm">
                      {purchase.numbers?.length || 0}
                    </td>
                    <td className="px-5 py-3 text-right text-white/30 text-xs">
                      {new Date(purchase.createdAt).toLocaleString('es-AR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
