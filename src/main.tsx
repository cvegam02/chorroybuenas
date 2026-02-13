import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './i18n' // Import i18n configuration
import { AuthProvider } from './contexts/AuthContext'
import { SetProvider } from './contexts/SetContext'
import { TokenProvider } from './contexts/TokenContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SetProvider>
          <TokenProvider>
            <App />
          </TokenProvider>
        </SetProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

