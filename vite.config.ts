import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildSitemapXml, loadSeasonalIds, sitemapPaths } from './src/utils/sitemap'

/** Escribe `sitemap.xml` en cada construcción del sitio (FEAT-21). Si el catálogo no responde, van solo las páginas fijas. */
function sitemapPlugin(mode: string): Plugin {
  return {
    name: 'sitemap',
    apply: 'build',
    async generateBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      const source = { supabaseUrl: env.VITE_SUPABASE_URL ?? '', anonKey: env.VITE_SUPABASE_ANON_KEY ?? '' }
      let seasonalIds: string[] = []
      try {
        seasonalIds = await loadSeasonalIds(source)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        this.warn(`sitemap sin loterías de temporada: ${reason}`)
      }
      const lastmod = new Date().toISOString().slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemapXml(sitemapPaths(seasonalIds), lastmod) })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    sitemapPlugin(mode),
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
}))
