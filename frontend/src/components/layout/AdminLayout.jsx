import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore.js';

const NAV = [
  { to: '/admin',             label: 'Dashboard',     icon: '📊', end: true },
  { to: '/admin/compras',     label: 'Cargar Compra', icon: '🛒' },
  { to: '/admin/sorteos',     label: 'Sorteos',       icon: '🎰' },
  { to: '/admin/clientes',    label: 'Clientes',      icon: '👥' },
  { to: '/admin/recompensas', label: 'Recompensas',   icon: '🎁' },
  { to: '/admin/promociones', label: 'Promociones',   icon: '🏷️' },
  { to: '/admin/config',      label: 'Configuración', icon: '⚙️' },
];

function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">Khaluby</h1>
            <p className="text-white/30 text-xs mt-0.5">Panel Admin</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white p-1">✕</button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-violet-300'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.25)',
            } : {}}
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
            {user?.name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-white/30 text-xs">Admin</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full text-left text-white/40 hover:text-white/80 text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: '#080b14' }}>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed h-full z-30"
        style={{ background: 'rgba(13,17,32,0.8)', borderRight: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-72 z-50 lg:hidden flex flex-col"
              style={{ background: '#0d1120', borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(13,17,32,0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            ☰
          </button>
          <h1 className="font-display font-bold gradient-text">Khaluby Admin</h1>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-4 lg:p-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}