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
    'bg-gradient-to-b from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 active:translate-y-0',
  accent:
    'bg-gradient-to-b from-accent-400 to-accent-500 hover:brightness-110 text-gray-950 shadow-lg shadow-accent-500/25 hover:-translate-y-0.5 active:translate-y-0 font-semibold',
  secondary:
    'bg-surface-2 border border-border hover:border-brand-400/60 hover:bg-surface-2/80 text-white',
  ghost:
    'text-gray-400 hover:text-white hover:bg-surface-2',
  danger:
    'bg-danger-500/15 border border-danger-500/40 hover:bg-danger-500/25 text-danger-400',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
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
      'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
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
