import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-404',
      writeBundle() {
        // Copy index.html to 404.html for GitHub Pages SPA routing
        // writeBundle runs after files are written to disk
        const distPath = join(__dirname, 'dist')
        try {
          copyFileSync(join(distPath, 'index.html'), join(distPath, '404.html'))
        } catch (error) {
          // Silently fail if index.html doesn't exist yet (shouldn't happen)
          console.warn('Could not copy index.html to 404.html:', error)
        }
      },
    },
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
    proxy: {
      '/api/replicate': {
        target: 'https://api.replicate.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/replicate/, ''),
        headers: {
          'Origin': 'https://api.replicate.com'
        }
      }
    }
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

