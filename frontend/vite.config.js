import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false, // ya registramos el SW manualmente en index.html
      includeAssets: ['icon-180.png', 'icon-192.png', 'icon-512.png', 'screenshot.png'],
      manifestFilename: 'manifest.json', // ✅ coincide con el href en index.html
      manifest: {
        name: 'Despensa Khaluby',
        short_name: 'Khaluby',
        description: 'Programa de fidelización y sorteos de Despensa Khaluby',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0c1409',
        theme_color: '#5cb516',
        orientation: 'portrait',
        lang: 'es',
        categories: ['shopping', 'lifestyle'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        screenshots: [
          { src: '/screenshot.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
        ],
        shortcuts: [
          { name: 'Mis puntos', url: '/dashboard', description: 'Ver mis puntos y sorteos' },
          { name: 'Sorteo en vivo', url: '/sorteo', description: 'Ver sorteo en vivo' },
        ],
      },
      injectManifest: {
        // Evita que falle si hay archivos grandes (ej. fuentes) en el build
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
