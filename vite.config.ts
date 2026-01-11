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
      closeBundle() {
        // Copy index.html to 404.html for GitHub Pages SPA routing
        const distPath = join(__dirname, 'dist')
        copyFileSync(join(distPath, 'index.html'), join(distPath, '404.html'))
      },
    },
  ],
  base: '/',
  server: {
    host: true, // Permite conexiones desde la red local
    port: 5173, // Puerto por defecto de Vite
  },
})

