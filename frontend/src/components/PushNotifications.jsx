import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToPush, unsubscribeFromPush, getPushPermissionStatus } from '../lib/pushNotifications.js';
import { useAuthStore } from '../stores/authStore.js';

export default function PushNotifications() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState('loading');
  // status: loading | unsupported | default | granted | denied

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    setStatus(Notification.permission);
  }, []);

  const handleEnable = async () => {
    setStatus('loading');
    const sub = await subscribeToPush(token);
    setStatus(sub ? 'granted' : Notification.permission);
  };

  const handleDisable = async () => {
    setStatus('loading');
    await unsubscribeFromPush(token);
    setStatus('default');
  };

  if (status === 'loading' || status === 'unsupported') return null;

  if (status === 'denied') return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#fca5a5' }}
    >
      🔕 Notificaciones bloqueadas — habilitá el permiso en la configuración del navegador
    </div>
  );

  if (status === 'granted') return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.20)' }}
    >
      <div className="flex items-center gap-2">
        <span>🔔</span>
        <span className="text-sm font-medium" style={{ color: '#9de360' }}>
          Notificaciones activas
        </span>
      </div>
      <button
        onClick={handleDisable}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.50)' }}
      >
        Desactivar
      </button>
    </div>
  );

  // status === 'default' — mostrar banner para activar
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(92,181,22,0.08)', border: '1px solid rgba(92,181,22,0.25)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">🔔</span>
        <div>
          <p className="font-semibold text-white text-sm">Activá las notificaciones</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.55)' }}>
            Te avisamos cuando empieza un sorteo, cuando ganás y cuando aprueban tu canje
          </p>
        </div>
      </div>
      <button
        onClick={handleEnable}
        className="btn-primary w-full py-3 text-sm"
      >
        🔔 Activar notificaciones
      </button>
    </motion.div>
  );
}
