import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

/* ─── Apple-style pill buttons ────────────────────────────────────────────────
 *
 * Per DESIGN.md:
 * - Primary CTA → #0071e3 (azure) · the sole permission-to-act on neutral surfaces.
 * - Accent      → #000000 (obsidian) · for use on gradient / dark backdrops.
 * - Secondary   → #ffffff + 1px var(--color-silver-mist) border · neutral surface alternative.
 * - Ghost       → transparent · text-only, no fill.
 * - Danger      → #b64400 (ember/caution) · destructive actions.
 *
 * All radii are 999px (pill). Zero box-shadows — elevation by value contrast.
 * ──────────────────────────────────────────────────────────────────────────── */

const variantStyles: Record<Variant, string> = {
  primary: 'bg-azure text-snow hover:opacity-95',
  accent: 'bg-obsidian text-snow hover:opacity-85',
  secondary: 'bg-snow text-ink border border-silver-mist hover:bg-fog',
  ghost: 'bg-transparent text-ink hover:opacity-70',
  danger: 'bg-caution text-snow hover:opacity-85',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8  px-4  text-body-sm gap-1.5 rounded-full',
  md: 'h-10 px-5  text-body    gap-2   rounded-full',
  lg: 'h-12 px-10 text-body    gap-2   rounded-full',
};

/* Altura por tamaño → usada como min-width cuadrada cuando loading=true,
 * para el morphing a píldora circular. */
const sizeHeightPx: Record<Size, number> = { sm: 32, md: 40, lg: 48 };

export const Button = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const isPrimaryInteractive = variant === 'primary' && !loading && !disabled;
  const heightPx = sizeHeightPx[size];

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={cn(
        'relative inline-flex items-center justify-center font-text font-medium',
        'border-0 cursor-pointer select-none',
        'transition-[opacity,transform,min-width,padding,box-shadow,filter] duration-[280ms] ease-out focus-ring',
        'active:scale-[0.96] active:brightness-[0.92]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && !loading && 'w-full',
        isPrimaryInteractive && 'btn-shimmer btn-primary-glow',
        className,
      )}
      style={{
        letterSpacing: '-0.1px',
        // Morphing a píldora cuadrada cuando loading=true. Animar min-width y
        // padding es la excepción justificada al "solo transform/opacity": el
        // efecto de morph requiere medir tamaño real, no puede hacerse con
        // transform sin distorsionar el contenido.
        minWidth: loading ? heightPx : undefined,
        paddingLeft: loading ? 0 : undefined,
        paddingRight: loading ? 0 : undefined,
        ...style,
      }}
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
};
