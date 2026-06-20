import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore.js';

const EXCLUDED = ['🚬 Cigarrillos', '🍷 Fernet', '🥃 Whisky', '🍾 Gancia', '🍸 Smirnoff', '🥤 New Style', '🍷 Plato Volador', '🍷 Demás bebidas alcohólicas'];

const APP_BENEFITS = [
  'Recibís notificaciones de nuevas ofertas y promociones',
  'Consultás tus puntos acumulados en cualquier momento',
  'Seguís tus participaciones en sorteos',
  'Descubrís nuevos premios y recompensas disponibles',
  'Te enterás primero de promociones exclusivas',
];

export default function HowItWorks() {
  const { isAdmin } = useAuthStore();

  return (
    <div className="min-h-screen" style={{ background: '#080b14' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(13,17,32,0.6)', backdropFilter: 'blur(20px)' }}
        className="sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white">Cómo funciona</h1>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>Khaluby Club</p>
          </div>
          <Link to={isAdmin() ? '/admin' : '/perfil'} className="btn-secondary text-sm py-2 px-4">
            ← Volver
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Intro */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-2">
          <p className="font-display font-bold text-2xl text-white leading-tight">
            Comprá, sumá puntos,<br />
            <span style={{ color: '#9de360' }}>canjeá premios</span> y participá<br />
            de sorteos increíbles
          </p>
        </motion.div>

        {/* Acumulación de puntos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'rgba(92,181,22,0.15)' }}>🛒</div>
            <h3 className="font-display font-bold text-lg text-white">Acumulación de puntos</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="font-mono font-bold text-white">$1.000</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.45)' }}>= 1 punto</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.25)' }}>
              <p className="font-mono font-bold" style={{ color: '#9de360' }}>$1.000 efectivo</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: '#9de360' }}>= 2 puntos</p>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'rgba(240,244,236,0.55)' }}>
            Las compras abonadas en <span className="font-semibold text-white">efectivo</span> otorgan <span className="font-semibold" style={{ color: '#9de360' }}>doble puntaje</span>. Los puntos se usan para canjear premios y descuentos disponibles en Khaluby Club.
          </p>
        </motion.div>

        {/* Participación en sorteos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'rgba(92,181,22,0.15)' }}>🎰</div>
            <h3 className="font-display font-bold text-lg text-white">Participación en sorteos</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="font-mono font-bold text-white">$5.000</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.45)' }}>= 1 número</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(92,181,22,0.12)', border: '1px solid rgba(92,181,22,0.25)' }}>
              <p className="font-mono font-bold" style={{ color: '#9de360' }}>$5.000 efectivo</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: '#9de360' }}>= 2 números</p>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'rgba(240,244,236,0.55)' }}>
            Si la compra es abonada en efectivo, recibís <span className="font-semibold" style={{ color: '#9de360' }}>1 número adicional</span> para el sorteo. Los números se asignan automáticamente al momento de la compra.
          </p>
        </motion.div>

        {/* Canje de recompensas */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'rgba(92,181,22,0.15)' }}>🎁</div>
            <h3 className="font-display font-bold text-lg text-white">Canje de recompensas</h3>
          </div>

          <ul className="space-y-2.5">
            {[
              'Se permite realizar 1 canje por semana por cliente',
              'Los puntos utilizados se descuentan automáticamente del saldo disponible',
              'Los premios están sujetos a disponibilidad de stock',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(240,244,236,0.65)' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: '#9de360' }}>✓</span>
                {text}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Productos excluidos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <h3 className="font-display font-bold text-base text-white mb-1">Productos excluidos</h3>
          <p className="text-xs mb-4" style={{ color: 'rgba(240,244,236,0.50)' }}>
            Estas categorías no participan en la acumulación de puntos ni en la generación de números para sorteos
          </p>
          <div className="flex flex-wrap gap-2">
            {EXCLUDED.map((item, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.20)' }}>
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Beneficios de la app */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(92,181,22,0.15), rgba(92,181,22,0.05))', border: '1px solid rgba(92,181,22,0.25)' }}>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📱</span>
              <h3 className="font-display font-bold text-lg text-white">Está todo en tu app</h3>
            </div>
            <ul className="space-y-2.5">
              {APP_BENEFITS.map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(240,244,236,0.70)' }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: '#9de360' }}>✓</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <p className="text-xs text-center pb-4" style={{ color: 'rgba(240,244,236,0.30)' }}>
          Khaluby Club se reserva el derecho de modificar promociones, premios y condiciones cuando lo considere necesario.
        </p>
      </div>
    </div>
  );
}
