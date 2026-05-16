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
 * - Secondary   → #ffffff + 1px #e8e8ed border · neutral surface alternative.
 * - Ghost       → transparent · text-only, no fill.
 * - Danger      → #b64400 (ember/caution) · destructive actions.
 *
 * All radii are 999px (pill). Zero box-shadows — elevation by value contrast.
 * ──────────────────────────────────────────────────────────────────────────── */

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-azure text-snow hover:opacity-85',
  accent:
    'bg-obsidian text-snow hover:opacity-85',
  secondary:
    'bg-snow text-ink border border-silver-mist hover:bg-fog',
  ghost:
    'bg-transparent text-ink hover:opacity-70',
  danger:
    'bg-caution text-snow hover:opacity-85',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8  px-4 text-body-sm rounded-full',
  md: 'h-10 px-5 text-body    rounded-full',
  lg: 'h-12 px-7 text-body    rounded-full',
};

const sizeGap: Record<Size, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2',
};

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
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cn(
      'relative inline-flex items-center justify-center font-text font-medium',
      'border-0 cursor-pointer select-none',
      'transition-[opacity,transform] duration-150 ease-out focus-ring',
      'active:scale-[0.98]',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    )}
    style={{ letterSpacing: '-0.1px' }}
  >
    {loading && (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </span>
    )}
    <span
      className={cn(
        'inline-flex items-center justify-center',
        sizeGap[size],
        loading && 'invisible',
      )}
    >
      {iconLeft}
      {children}
      {iconRight}
    </span>
  </button>
);
