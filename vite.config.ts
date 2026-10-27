/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Boom & Bust',
        short_name: 'Boom & Bust',
        description: 'Companion app for the Boom & Bust board game',
        theme_color: '#03284E',
        background_color: '#FAF2E0',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell, fonts, small images and the two big artworks.
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'assets/sm/*.webp', 'assets/lg/X01.webp', 'assets/lg/X02.webp', 'icons/*.png'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/lg/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lg-art', expiration: { maxEntries: 260 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
