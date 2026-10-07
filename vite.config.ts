import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build, defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { PageMeta } from './src/utils/pageMeta'
import { buildPrerenderedHtml, prerenderedFile, SHELL_FILE } from './src/utils/prerender'
import { buildSitemapXml, loadSeasonalIds, sitemapPaths } from './src/utils/sitemap'

const SSR_ENTRY = 'src/entry-server.tsx'
const SSR_OUT_DIR = 'dist-ssr'

interface ServerEntry {
  paths: string[]
  render: (path: string) => Promise<{ html: string; meta: PageMeta }>
}

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

/**
 * Escribe las páginas públicas con su texto ya puesto (FEAT-21) y deja `shell.html`, la página sin texto
 * que reciben las demás direcciones. Sin las variables de Supabase (CI) solo se escribe `shell.html`.
 */
function prerenderPlugin(mode: string): Plugin {
  let outDir = 'dist'
  return {
    name: 'prerender',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const template = await readFile(path.join(outDir, 'index.html'), 'utf8')
      await writeFile(path.join(outDir, SHELL_FILE), template)

      const env = loadEnv(mode, process.cwd(), 'VITE_')
      if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        this.warn('páginas sin pre-generar: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
        return
      }

      const ssrOutDir = path.resolve(SSR_OUT_DIR)
      try {
        await build({ mode, logLevel: 'warn', build: { ssr: SSR_ENTRY, outDir: ssrOutDir, emptyOutDir: true } })
        const entry: ServerEntry = await import(pathToFileURL(path.join(ssrOutDir, 'entry-server.js')).href)
        for (const pagePath of entry.paths) {
          const { html, meta } = await entry.render(pagePath)
          const file = path.join(outDir, prerenderedFile(pagePath))
          await mkdir(path.dirname(file), { recursive: true })
          await writeFile(file, buildPrerenderedHtml(template, pagePath, meta, html))
        }
      } finally {
        await rm(ssrOutDir, { recursive: true, force: true })
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  // La construcción auxiliar que dibuja las páginas no vuelve a escribir sitemap ni páginas.
  plugins: isSsrBuild ? [react()] : [
    react(),
    sitemapPlugin(mode),
    prerenderPlugin(mode),
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
    rollupOptions: isSsrBuild ? {} : {
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
