import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  base: '/',
  server: {
    host: true, // Permite conexiones desde la red local
    port: 5173, // Puerto por defecto de Vite
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      'localhost',
      '127.0.0.1',
    ],
  },
  build: {
    // Optimización para SEO y rendimiento
    minify: 'esbuild', // Minificación rápida (esbuild viene incluido con Vite)
    cssMinify: true, // Minificar CSS
    sourcemap: false, // Desactivar sourcemaps en producción para mejor rendimiento
    rollupOptions: {
      output: {
        // Separar chunks para mejor caché
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pdf-vendor': ['pdf-lib'],
        },
      },
    },
    // Optimización de assets
    assetsInlineLimit: 4096, // Inlinear assets pequeños (<4kb)
    chunkSizeWarningLimit: 1000, // Aumentar límite de advertencia
  },
})

