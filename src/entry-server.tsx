import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import i18n from './i18n'
import { AppTree } from './AppTree'
import { PUBLIC_PATHS, resolvePageMeta, type PageMeta } from './utils/pageMeta'

/** Entrada que usa la construcción del sitio para escribir las páginas públicas (FEAT-21). No corre en el navegador. */
export const paths = PUBLIC_PATHS

export async function render(path: string): Promise<{ html: string; meta: PageMeta }> {
  await i18n.changeLanguage('es')
  const html = renderToString(
    <React.StrictMode>
      <StaticRouter location={path}>
        <AppTree />
      </StaticRouter>
    </React.StrictMode>,
  )
  return { html, meta: resolvePageMeta(path, i18n.t.bind(i18n)) }
}
