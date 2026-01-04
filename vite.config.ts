import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/chorroybuenas/',
  server: {
    host: true, // Permite conexiones desde la red local
    port: 5173, // Puerto por defecto de Vite
  },
})

