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
    'bg-brand-500 hover:bg-brand-400 text-white shadow-md shadow-brand-500/20 hover:shadow-brand-500/35 hover:-translate-y-px active:translate-y-0 border border-brand-400/30',
  accent:
    'bg-accent-500 hover:bg-accent-400 text-white shadow-md shadow-accent-500/25 hover:shadow-accent-500/40 hover:-translate-y-px active:translate-y-0 border border-accent-400/30',
  secondary:
    'bg-surface border border-border hover:border-brand-400/50 hover:bg-surface-2 text-white',
  ghost:
    'text-gray-500 hover:text-white hover:bg-surface',
  danger:
    'bg-danger-500/12 border border-danger-500/40 hover:bg-danger-500/20 text-danger-400',
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
