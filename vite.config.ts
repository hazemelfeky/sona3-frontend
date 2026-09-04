import { fileURLToPath, URL } from 'node:url'
import ui from '@nuxt/ui/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vueLayouts from 'vite-plugin-vue-layouts-next'
import vueRouter from 'vue-router/vite'
import { VitePWA } from 'vite-plugin-pwa'
import appConfig from './app.config'

const featuresDir = fileURLToPath(new URL('./src/features', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ui(appConfig),
    vueRouter({
      dts: 'src/route-map.d.ts',
      routesFolder: [
        {
          src: 'src/features',
          filePatterns: ['**/pages/**/*'],
          // strip the `pages/` segment so `features/<name>/pages/index.vue` -> `/<name>`
          path: (filePath) => filePath.slice(featuresDir.length).replace(/\/pages\//, '/'),
        },
      ],
    }),
    vueLayouts(),
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
      manifest: {
        name: 'صنّاع الحياة - المحلة',
        short_name: 'صنّاع الحياة',
        description: 'منصة إدارة الأسر والمتطوعين',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#12385D',
        background_color: '#12385D',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // App shell only. Nothing here is data — every row the app shows
        // still comes off the network.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        runtimeCaching: [
          {
            // Supabase covers both PostgREST data and the auth endpoints;
            // a cached response on either would be actively wrong, so the
            // service worker stays out of the way entirely.
            urlPattern: ({ url }) => url.hostname.includes('supabase'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
