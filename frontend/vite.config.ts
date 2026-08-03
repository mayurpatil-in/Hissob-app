import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'hisob.png', 'icons/*.png'],
      devOptions: {
        enabled: true,          // serve SW + manifest in dev mode
        type: 'module',
        suppressWarnings: true,
      },
      manifest: {
        name: 'Hisob ERP — Festival Collection & Financial Management',
        short_name: 'Hisob',
        description: 'Festival Collection & Financial Management for Ganapati Mandals, Temples, Trusts and NGOs',
        theme_color: '#0B2347',
        background_color: '#0B2E6B',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        id: '/',
        icons: [
          { src: '/hisobapp.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/hisobapp.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/hisobapp.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/hisobapp.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Issue New Receipt',
            short_name: 'New Receipt',
            description: 'Issue donation receipt directly',
            url: '/receipts',
            icons: [{ src: '/hisobapp.png', sizes: '192x192' }],
          },
          {
            name: 'View Dashboard',
            short_name: 'Dashboard',
            description: 'View overall collections and insights',
            url: '/dashboard',
            icons: [{ src: '/hisobapp.png', sizes: '192x192' }],
          },
        ],
        categories: ['finance', 'business', 'productivity'],
      },
      workbox: {
        disableDevLogs: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/@vite/, /^\/@react-refresh/, /^\/src\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /.*\/uploads\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'uploads-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'charts';
            if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('react')) return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
