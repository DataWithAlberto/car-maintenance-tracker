import { isTauri } from '../services/obd2/transport';

/**
 * En WKWebView (el WebView que Tauri usa en macOS) los enlaces con
 * `target="_blank"` y `window.open()` NO abren nada por defecto. Esto rompía,
 * entre otros, el botón "Vista previa" de los viajes sorpresa y los enlaces a
 * WhatsApp / Google Maps / documentos.
 *
 * Este interceptor global —activo SOLO dentro de Tauri— captura los clics en
 * cualquier `<a target="_blank">` y los redirige al lugar correcto:
 *   - URLs externas (http/https/mailto/tel/whatsapp…) → navegador / app del sistema.
 *   - Rutas internas de la SPA (p. ej. /viajes/surprise/:token) → nueva ventana nativa.
 *
 * En el build web no se instala nada y el comportamiento nativo del navegador
 * (abrir pestaña nueva) se mantiene intacto.
 */
export function installTauriLinkHandler(): void {
  if (!isTauri()) return;

  document.addEventListener(
    'click',
    (event) => {
      // Respeta modificadores / clic no primario.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[target="_blank"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      event.preventDefault();
      void openLink(href);
    },
    true,
  );
}

/** Abre una URL/ruta según su naturaleza, dentro de Tauri. */
async function openLink(href: string): Promise<void> {
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(href); // http:, https:, mailto:, tel:, whatsapp:…
  try {
    if (isAbsolute) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(href);
    } else {
      await openPreviewWindow(href);
    }
  } catch (err) {
    console.error('[tauriLinks] No se pudo abrir el enlace:', href, err);
  }
}

/** Abre una ruta interna de la app en una nueva ventana nativa (estilo "pestaña nueva"). */
export async function openPreviewWindow(path: string, title = 'Vista previa'): Promise<void> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const label = `preview-${Date.now()}`;
  new WebviewWindow(label, {
    url: path,
    title,
    width: 440,
    height: 920,
    resizable: true,
  });
}
