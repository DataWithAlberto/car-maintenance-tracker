import { useEffect } from 'react';

/* Ejecuta el callback cuando se pulsa Escape. Útil para cerrar modales
 * con el teclado (gesto esperado en escritorio/Mac). */
export const useEscapeKey = (onEscape: () => void, active = true) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, active]);
};
