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

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-azure text-snow border-0 hover:opacity-85',
  accent:
    'bg-obsidian text-snow border-0 hover:opacity-80',
  secondary:
    'bg-snow text-ink border border-silver-mist hover:border-graphite hover:bg-fog',
  ghost:
    'bg-transparent text-ink border-0 hover:opacity-70',
  danger:
    'bg-danger-500/10 text-danger-500 border border-danger-500/30 hover:bg-danger-500 hover:text-snow',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-caption gap-2 rounded-button',
  md: 'h-11 px-5 text-body gap-2 rounded-button',
  lg: 'h-14 px-8 text-body-lg gap-2 rounded-button',
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
      'inline-flex items-center justify-center font-manrope font-medium tracking-tight',
      'transition-all duration-150 ease-out focus-ring',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    )}
  >
    {loading ? (
      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      iconLeft
    )}
    {children}
    {!loading && iconRight}
  </button>
);
