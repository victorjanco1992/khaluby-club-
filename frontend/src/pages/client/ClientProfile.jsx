import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore.js';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import PushNotifications from '../../components/PushNotifications.jsx';
import { useInstallStore } from '../../stores/installStore.js';
import { Link } from 'react-router-dom';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function EditPhoneModal({ current, onClose, onSaved }) {
  const [phone, setPhone] = useState(current || '');

  const mutation = useMutation({
    mutationFn: (phone) => api.put('/api/users/me', { phone }),
    onSuccess: () => {
      toast.success('Teléfono actualizado');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#0d1a0a', border: '1px solid rgba(92,181,22,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'rgba(255,255,255,0.12)' }} />

        <h3 className="font-display font-bold text-xl text-white mb-1">Cambiar teléfono</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(240,244,236,0.45)' }}>
          El admin te va a contactar por este número
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Nuevo teléfono</label>
            <input
              type="tel"
              className="input"
              placeholder="Ej: 2615554433"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-3">Cancelar</button>
            <button
              onClick={() => mutation.mutate(phone)}
              disabled={mutation.isPending || !phone.trim()}
              className="btn-primary flex-1 py-3"
            >
              {mutation.isPending ? '⏳...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditPasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => api.put('/api/users/me/password', data),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  });

  const handleSubmit = () => {
    if (next.length < 4) return toast.error('La contraseña debe tener al menos 4 caracteres');
    if (next !== confirm) return toast.error('Las contraseñas no coinciden');
    mutation.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#0d1a0a', border: '1px solid rgba(92,181,22,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'rgba(255,255,255,0.12)' }} />

        <h3 className="font-display font-bold text-xl text-white mb-1">Cambiar contraseña</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(240,244,236,0.45)' }}>
          Mínimo 4 caracteres
        </p>

        <div className="space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              type={show ? 'text' : 'password'}
              className="input"
              placeholder="Tu contraseña actual"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type={show ? 'text' : 'password'}
              className="input"
              placeholder="Nueva contraseña"
              value={next}
              onChange={e => setNext(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type={show ? 'text' : 'password'}
              className="input"
              placeholder="Repetí la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShow(s => !s)}
            className="text-xs"
            style={{ color: 'rgba(240,244,236,0.40)' }}
          >
            {show ? '🙈 Ocultar' : '👁 Mostrar'} contraseñas
          </button>

          {next && confirm && (
            <p className="text-xs font-medium"
              style={{ color: next === confirm ? '#9de360' : '#fca5a5' }}>
              {next === confirm ? '✓ Las contraseñas coinciden' : '✕ No coinciden'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 py-3">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || !current || !next || !confirm}
              className="btn-primary flex-1 py-3"
            >
              {mutation.isPending ? '⏳...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ClientProfile() {
  const { user, qrDataUrl, refreshMe } = useAuthStore();
  const [showPhone, setShowPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { deferredPrompt, isInstalled, triggerInstall } = useInstallStore();
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    const { outcome } = await triggerInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      toast.success('¡App instalada! 🎉');
    } else if (outcome === 'unavailable') {
      toast.error('Tu navegador no permite instalar la app desde acá. Probá desde el menú "Agregar a pantalla de inicio".');
    }
  };

  useEffect(() => { refreshMe(); }, []);

  const { data: winData } = useQuery({
    queryKey: ['my-win'],
    queryFn: () => api.get('/api/raffles/my-win').then(r => r.data),
  });

  const { data: myNumbersData } = useQuery({
    queryKey: ['my-numbers'],
    queryFn: () => api.get('/api/raffles/my-numbers').then(r => r.data.entries),
  });

  const win = winData?.win;
  const activeNumbers = myNumbersData?.filter(e => e.raffle?.status === 'ACTIVE') || [];
  const activeRaffle = activeNumbers[0]?.raffle;

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Mi Perfil</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.50)' }}>
          Mostrá tu QR en caja para sumar puntos
        </p>
      </div>

      {/* QR */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 flex flex-col items-center"
      >
        <p className="text-xs uppercase tracking-widest mb-4"
          style={{ color: 'rgba(240,244,236,0.40)' }}>
          Tu código QR
        </p>
        {qrDataUrl ? (
          <div className="p-4 bg-white rounded-2xl"
            style={{ boxShadow: '0 0 40px rgba(92,181,22,0.20)' }}>
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />
          </div>
        ) : (
          <div className="w-52 h-52 rounded-2xl animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)' }} />
        )}
        <p className="text-white font-semibold mt-4">{user?.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>
          DNI: {user?.dni}
        </p>
      </motion.div>

      {/* Stats: puntos + números activos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <span className="text-2xl">⭐</span>
          <p className="font-mono font-bold text-2xl mt-1" style={{ color: '#c4b5fd' }}>
            {(user?.points || 0).toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>Puntos</p>
        </div>

        <div className="card p-4 text-center">
          <span className="text-2xl">🎰</span>
          <p className="font-mono font-bold text-2xl mt-1" style={{ color: '#9de360' }}>
            {activeNumbers.length}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>
            {activeNumbers.length === 1 ? 'Número activo' : 'Números activos'}
          </p>
        </div>
      </div>  

      {/* Tarjeta ganador */}
      {win && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="winner-glow rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.40)' }}
        >
          {win.prizeImage && (
            <img src={win.prizeImage} alt={win.prize}
              className="w-full h-40 object-cover"
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div className="p-5" style={{ background: 'rgba(139,92,246,0.12)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <span className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(139,92,246,0.30)', color: '#c4b5fd' }}>
                ¡GANASTE UN SORTEO!
              </span>
            </div>
            <div className="space-y-2 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
              {[
                { label: 'Premio',  value: win.prize,       color: '#fbbf24' },
                { label: 'Sorteo',  value: win.raffleTitle, color: 'rgba(240,244,236,0.80)' },
                { label: 'Número',  value: `#${win.number}`, color: '#c4b5fd', mono: true },
                { label: 'Fecha',   value: formatDate(win.date), color: 'rgba(240,244,236,0.60)', small: true },
              ].map(({ label, value, color, mono, small }) => (
                <div key={label} className="flex justify-between items-start">
                  <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>{label}</span>
                  <span
                    className={`text-right max-w-[60%] ${mono ? 'font-mono font-bold' : ''} ${small ? 'text-xs' : 'text-sm'}`}
                    style={{ color }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-3" style={{ color: 'rgba(240,244,236,0.35)' }}>
              Mostrá esta tarjeta en caja para reclamar tu premio
            </p>
          </div>
        </motion.div>
      )}

      {/* Datos personales + edición */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">Datos personales</h3>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>Nombre</span>
            <span className="text-sm text-white">{user?.name}</span>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>DNI</span>
            <span className="text-sm font-mono text-white">{user?.dni}</span>
          </div>
        </div>

        {/* Teléfono — editable */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>Teléfono</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white">{user?.phone}</span>
              <button
                onClick={() => setShowPhone(true)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: 'rgba(92,181,22,0.10)', color: '#9de360', border: '1px solid rgba(92,181,22,0.20)' }}
              >
                ✏️ Editar
              </button>
            </div>
          </div>
        </div>

        {/* Email */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>Email</span>
            <span className="text-sm text-white">{user?.email || '—'}</span>
          </div>
        </div>

        {/* Contraseña — editable */}
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'rgba(240,244,236,0.50)' }}>Contraseña</span>
          <button
            onClick={() => setShowPassword(true)}
            className="text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(92,181,22,0.10)', color: '#9de360', border: '1px solid rgba(92,181,22,0.20)' }}
          >
            🔐 Cambiar
          </button>
        </div>
      </div>

      {/* Cómo funciona */}
      <Link to="/como-funciona">
        <div className="card p-4 flex items-center gap-3 transition-all">
          <span className="text-2xl">📖</span>
          <div>
            <p className="font-semibold text-sm text-white">Cómo funciona Khaluby Club</p>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Puntos, sorteos y canjes</p>
          </div>
          <span className="ml-auto text-lg" style={{ color: 'rgba(240,244,236,0.25)' }}>→</span>
        </div>
      </Link>
      
      {/* Instalar app */}
      {!isInstalled && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">App</h3>
          <div className="flex items-center gap-3 mb-3">
            <img src="/icon-192.png" alt="Khaluby" className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Instalá Khaluby en tu celular</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>
                Accedé más rápido desde tu pantalla de inicio
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            {installing ? '⏳ Instalando...' : '📲 Instalar app'}
          </button>
          {!deferredPrompt && (
            <p className="text-xs mt-2 text-center" style={{ color: 'rgba(240,244,236,0.35)' }}>
              En iPhone: tocá Compartir → "Agregar a pantalla de inicio"
            </p>
          )}
        </div>
      )}

      {/* Notificaciones push */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">Notificaciones</h3>
        <PushNotifications />
      </div>

      {/* Modales */}
      <AnimatePresence>
        {showPhone && (
          <EditPhoneModal
            current={user?.phone}
            onClose={() => setShowPhone(false)}
            onSaved={() => refreshMe()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPassword && (
          <EditPasswordModal onClose={() => setShowPassword(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
