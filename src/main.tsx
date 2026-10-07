import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import i18n from './i18n'
import { AppTree } from './AppTree'
import { shouldHydrate } from './utils/prerender'

const container = document.getElementById('root')!
const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <AppTree />
    </BrowserRouter>
  </React.StrictMode>
)

// Las páginas públicas llegan ya escritas (FEAT-21): se reutiliza ese texto en vez de volver a dibujarlo.
if (shouldHydrate(container.dataset.prerendered, window.location.pathname, i18n.language ?? 'es')) {
  ReactDOM.hydrateRoot(container, tree)
} else {
  ReactDOM.createRoot(container).render(tree)
}
