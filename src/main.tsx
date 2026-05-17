import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply persisted theme before first paint to avoid a flash of the wrong theme.
try {
  const stored = JSON.parse(localStorage.getItem('fh-theme') ?? '{}');
  if (stored?.state?.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
