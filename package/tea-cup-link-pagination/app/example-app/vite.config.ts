import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: {
    port: 5182,
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // The SQLite worker imports its wasm as a module
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // SQLite runs in a worker and loads its wasm itself
    exclude: [
      'wa-sqlite',
      'kysely-wasqlite-worker',
      '@subframe7536/sqlite-wasm',
    ],
  },
  plugins: [react(), tailwindcss()],
})
