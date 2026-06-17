import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore.js';
import { useInstallStore } from '../stores/installStore.js';

export default function InstallPWA() {
  const { user } = useAuthStore();
  const { deferredPrompt, isInstalled, dismissed, dismiss, triggerInstall } = useInstallStore();
  const [show, setShow] = useState(false);

  // Mostrar el banner solo si: hay prompt disponible, hay usuario logueado,
  // no está instalada, y el usuario no la descartó antes
  useEffect(() => {
    if (deferredPrompt && user && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [deferredPrompt, user, isInstalled, dismissed]);

  const handleInstall = async () => {
    await triggerInstall();
    setShow(false);
  };

  const handleDismiss = () => {
    dismiss(); // ✅ guardado permanente — no vuelve a aparecer solo
    setShow(false);
  };

  if (isInstalled || !user) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="fixed bottom-24 left-3 right-3 z-[80] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,20,8,0.97)',
            border: '1px solid rgba(92,181,22,0.35)',
            boxShadow: '0 8px 40px rgba(92,181,22,0.15)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src="/icon-192.png" alt="Khaluby" className="w-12 h-12 rounded-2xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Instalá la app</p>
                <p className="text-xs" style={{ color: 'rgba(240,244,236,0.55)' }}>
                  Accedé más rápido desde tu pantalla de inicio
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.50)' }}
              >✕</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.60)' }}
              >
                Ahora no
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #5cb516, #459110)', color: '#fff' }}
              >
                📲 Instalar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
