import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vueLayouts from 'vite-plugin-vue-layouts-next'
import vueRouter from 'vue-router/vite'

const featuresDir = fileURLToPath(new URL('./src/features', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
