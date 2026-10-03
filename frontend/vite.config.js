import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Maceral AI Field Reporting',
        short_name: 'Maceral',
        description: 'Geo-Tagged Field Reporting and Compliance for Coal Mines',
        theme_color: '#0f172a',
        background_color: '#F5F3EE',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['productivity', 'business', 'utilities'],
        dir: 'ltr',
        lang: 'en-US',
        id: '/',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-desktop.jpg',
            sizes: '1280x720',
            type: 'image/jpeg',
            form_factor: 'wide'
          },
          {
            src: 'screenshot-mobile.jpg',
            sizes: '720x1280',
            type: 'image/jpeg',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jsx}'],
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/generated_reports': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
