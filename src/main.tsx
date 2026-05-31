import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { installTauriLinkHandler } from './utils/tauriLinks';

// En la app de escritorio (Tauri/WKWebView) los target="_blank" no abren nada;
// este handler los redirige al navegador del sistema o a una ventana nativa.
installTauriLinkHandler();

// Apply persisted theme before first paint to avoid a flash of the wrong theme.
try {
  const stored = JSON.parse(localStorage.getItem('fh-theme') ?? '{}');
  if (stored?.state?.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
