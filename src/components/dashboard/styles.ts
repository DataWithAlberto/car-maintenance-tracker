// ─── Fragmentos de clase compartidos (alineados con el sistema de la app) ───
// Usa los mismos tokens y utilidades que el resto de FocusHub (dock, KpiCard,
// AlertCenter…): superficie `snow`, hairline sutil `silver-mist`, acento azul
// `azure` y la clase global `.focus-ring` (glow azul). Todo theme-aware vía
// [data-theme='dark'].

/** Superficie de tarjeta: borde hairline sutil + fondo de tarjeta, sin sombra. */
export const CARD = 'rounded-2xl border border-silver-mist bg-snow shadow-none';

/** Tarjeta interactiva: hover sutil hacia el lienzo (fog). Combinar con CARD. */
export const CARD_HOVER = 'transition-colors duration-200 hover:bg-fog';

/** Anillo de foco de la app (glow azul). Idéntico al del menú lateral. */
export const FOCUS_RING = 'focus-ring';

/** Etiqueta superior tipo "eyebrow", discreta y en mayúsculas. */
export const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.12em] text-mist';
