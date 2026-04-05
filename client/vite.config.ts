import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  publicDir: path.join(rootDir, 'public'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/apple-touch-icon.svg'],
      manifest: {
        name: 'Järnkoll',
        short_name: 'Järnkoll',
        description: 'Mobil träningslogg för styrkepass, set och progression.',
        lang: 'sv',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0f1720',
        background_color: '#081018',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: path.resolve(rootDir, '../dist'),
    emptyOutDir: true,
  },
});
