// ─── Fragmentos de clase Tailwind compartidos (lenguaje "dark-tech") ────────
// Centralizar estas cadenas evita divergencias visuales entre subcomponentes
// y mantiene el look coherente (glass oscuro, bordes sutiles, focus claro).

/** Superficie de tarjeta base: glass oscuro con borde sutil. */
export const CARD = 'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm';

/** Tarjeta interactiva (hover + cursor). Combinar con CARD. */
export const CARD_HOVER =
  'transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.07]';

/** Anillo de foco accesible sobre fondo oscuro. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b12]';

/** Etiqueta tipo "eyebrow" monoespaciada. */
export const EYEBROW = 'font-mono uppercase tracking-[0.16em] text-[10px] text-slate-500';
