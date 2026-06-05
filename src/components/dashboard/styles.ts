// ─── Fragmentos de clase Tailwind compartidos (editorial B&W, theme-aware) ──
// Usa los tokens semánticos de la app (var(--color-*)) en lugar de colores
// fijos, de modo que el dashboard responde automáticamente a [data-theme='dark']
// igual que el resto de FocusHub. En claro `border-ink` ≈ negro; en oscuro
// ≈ blanco, conservando el look editorial invertido sin código extra.

/** Superficie de tarjeta base: borde fuerte (ink), fondo de tarjeta, sin sombra. */
export const CARD = 'rounded-2xl border border-ink bg-snow shadow-none';

/** Tarjeta interactiva: hover sutil hacia el lienzo (fog). Combinar con CARD. */
export const CARD_HOVER = 'transition-colors duration-200 hover:bg-fog';

/** Anillo de foco accesible, theme-aware (offset = color del lienzo). */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-fog';

/** Etiqueta superior tipo "eyebrow", discreta y en mayúsculas. */
export const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.12em] text-mist';
