import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@common-market/design-tokens/tokens.css'
import '@common-market/design-tokens/base.css'
import './shell.css'
import { App } from './App.tsx'
import { loadSession } from './session.ts'

// Know who is signed in before remotes mount; an unreachable API just means signed out.
loadSession()
  .catch(() => {})
  .finally(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    ),
  )
