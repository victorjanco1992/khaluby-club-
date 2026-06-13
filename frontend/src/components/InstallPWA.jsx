import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setShow(false);
    setPrompt(null);
  };

  if (installed) return null;

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
                onClick={() => setShow(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,236,0.50)' }}
              >✕</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShow(false)}
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
