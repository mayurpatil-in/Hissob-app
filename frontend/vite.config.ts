import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,          // serve SW + manifest in dev mode
        type: 'module',
      },
      manifest: {
        name: 'Hissob ERP',
        short_name: 'Hissob',
        description: 'Festival Collection & Financial Management',
        theme_color: '#0B2347',
        background_color: '#F8F9FC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 } },
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
