// ─── Fragmentos de clase Tailwind compartidos (lenguaje B&W editorial) ──────
// Estética minimalista en blanco y negro inspirada en la imagen de referencia:
// fondo blanco plano, borde negro fino, esquinas redondeadas, sin sombras.
// Centralizar estas cadenas mantiene la coherencia entre subcomponentes.

/** Superficie de tarjeta base: blanco plano, borde negro fino, sin sombra. */
export const CARD = 'rounded-2xl border border-black bg-white shadow-none';

/** Tarjeta interactiva (hover sutil en gris muy claro). Combinar con CARD. */
export const CARD_HOVER = 'transition-colors duration-200 hover:bg-zinc-50';

/** Anillo de foco accesible sobre fondo blanco. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/** Etiqueta superior tipo "eyebrow", discreta y en mayúsculas. */
export const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400';
