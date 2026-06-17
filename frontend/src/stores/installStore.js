import { create } from 'zustand';

const DISMISSED_KEY = 'kh_install_dismissed';

export const useInstallStore = create((set, get) => ({
  deferredPrompt: null,
  isInstalled: false,
  dismissed: localStorage.getItem(DISMISSED_KEY) === '1',

  setPrompt: (prompt) => set({ deferredPrompt: prompt }),

  setInstalled: (val) => set({ isInstalled: val }),

  dismiss: () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    set({ dismissed: true });
  },

  // Usado desde el perfil — ignora el "dismissed" porque es una acción explícita del usuario
  triggerInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return { outcome: 'unavailable' };

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      set({ isInstalled: true, deferredPrompt: null });
    }
    return { outcome };
  },
}));

// Listener global — se registra una sola vez al importar este módulo
if (typeof window !== 'undefined') {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    useInstallStore.getState().setInstalled(true);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstallStore.getState().setPrompt(e);
  });

  window.addEventListener('appinstalled', () => {
    useInstallStore.getState().setInstalled(true);
  });
}
