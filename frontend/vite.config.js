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
      includeAssets: ['icon-180.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Khaluby App',
        short_name: 'Khaluby',
        description: 'Despensa Khaluby',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F5F8',
        theme_color: '#F5F5F8',
        orientation: 'portrait',
        categories: ['shopping', 'business'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
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
