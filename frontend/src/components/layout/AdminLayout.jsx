import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

function SidebarContent({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h1 className="font-display font-bold text-xl gradient-text">Khaluby</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.35)' }}>Panel Admin</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.60)' }}
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                isActive ? '' : ''
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'rgba(92,181,22,0.18)',
              color: '#9de360',
              border: '1px solid rgba(92,181,22,0.30)',
            } : {
              color: 'rgba(240,244,236,0.60)',
              border: '1px solid transparent',
            }}
          >
            <span className="text-xl w-7 text-center">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{ background: 'rgba(92,181,22,0.25)', color: '#9de360' }}
          >
            {user?.name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium truncate text-sm">{user?.name}</p>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>Administrador</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full text-left py-2.5 px-3 rounded-xl text-sm transition-colors"
          style={{ color: 'rgba(240,244,236,0.50)', background: 'rgba(255,255,255,0.04)' }}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Cerrar sidebar al cambiar de ruta en mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Nombre de la página actual
  const currentPage = NAV.find(n => {
    if (n.end) return location.pathname === n.to;
    return location.pathname.startsWith(n.to);
  });

  return (
    <div className="min-h-screen flex" style={{ background: '#0c1409' }}>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className="hidden lg:flex w-64 flex-col fixed h-full z-30"
        style={{
          background: 'rgba(13,25,9,0.95)',
          borderRight: '1px solid rgba(92,181,22,0.10)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ===== MOBILE: overlay + drawer ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Fondo oscuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.75)' }}
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
              style={{
                width: '80vw',
                maxWidth: '300px',
                background: '#0d1a0a',
                borderRight: '1px solid rgba(92,181,22,0.15)',
              }}
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Topbar mobile */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4"
          style={{
            height: '56px',
            background: 'rgba(12,20,9,0.95)',
            borderBottom: '1px solid rgba(92,181,22,0.10)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.70)' }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
              <rect y="0" width="18" height="2" rx="1"/>
              <rect y="6" width="14" height="2" rx="1"/>
              <rect y="12" width="18" height="2" rx="1"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold gradient-text text-base truncate">
              {currentPage?.label || 'Admin'}
            </p>
          </div>

          <div
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360' }}
          >
            Admin
          </div>
        </header>

        {/* Página */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex-1 p-4 lg:p-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
