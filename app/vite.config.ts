import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { host: '127.0.0.1', port: 5192, strictPort: true },
  preview: { host: '127.0.0.1', port: 5193, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'] },
      manifest: {
        name: 'FISAVAL',
        short_name: 'FISAVAL',
        description: 'Fiscalização imobiliária municipal',
        theme_color: '#0f1419',
        background_color: '#0f1419',
        display: 'standalone',
        lang: 'pt-BR',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
