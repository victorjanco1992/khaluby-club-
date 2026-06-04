import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore.js';

const NAV = [
  { to: '/dashboard',   icon: '🏠', label: 'Inicio' },
  { to: '/sorteos',     icon: '🎰', label: 'Sorteos' },
  { to: '/recompensas', icon: '🎁', label: 'Puntos' },
  { to: '/promociones', icon: '🏷️', label: 'Ofertas' },
  { to: '/perfil',      icon: '👤', label: 'Mi QR' },
];

export default function ClientLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      <header className="bg-dark-800/70 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg gradient-text">Despensa Khaluby</h1>
            <p className="text-white/35 text-xs">Hola, {user?.name?.split(' ')[0]} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-violet-400 font-mono font-bold text-sm">
                {(user?.points || 0).toLocaleString()} pts
              </p>
              <p className="text-white/25 text-xs">tus puntos</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-white/30 hover:text-white/70 text-xs transition-colors p-2"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full pb-24">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800/85 backdrop-blur-2xl border-t border-white/6 z-40">
        <div className="max-w-lg mx-auto flex">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all relative ${
                  isActive ? 'text-violet-400' : 'text-white/35 hover:text-white/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    className="text-xl"
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {icon}
                  </motion.span>
                  <span className="font-medium">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 w-8 h-0.5 bg-violet-400 rounded-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}