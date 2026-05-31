import { isTauri } from '../services/obd2/transport';

/**
 * Abre un documento HTML autocontenido en una ventana de impresión.
 *
 * El HTML ya incluye su propio `<script>window.print()</script>`, así que al
 * cargarse dispara el diálogo de impresión del sistema (que en macOS también
 * permite "Guardar como PDF").
 *
 * - Web: `window.open` + `document.write` (comportamiento histórico).
 * - Tauri/macOS: WKWebView ignora `window.open`, así que se abre una ventana
 *   nativa (`WebviewWindow`) cargando el HTML como data URL. El script embebido
 *   lanza el panel de impresión nativo igual que en el navegador.
 */
export async function printHtml(html: string, title = 'Imprimir'): Promise<void> {
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const url = `data:text/html;charset=utf-8;base64,${toBase64(html)}`;
    new WebviewWindow(`print-${Date.now()}`, {
      url,
      title,
      width: 900,
      height: 1000,
      resizable: true,
    });
    return;
  }

  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) throw new Error('No se pudo abrir la ventana de impresión');
  win.document.write(html);
  win.document.close();
}

/** btoa seguro para UTF-8 (acentos, emojis del itinerario). */
function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    ),
  );
}
