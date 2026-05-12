import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '../../utils/cn';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  iconLeft?: ReactNode;
}

type InputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'>;
type TextareaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'>;
type SelectProps = BaseProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'placeholder'> & {
  options: Array<{ value: string; label: string }>;
};

const fieldBase =
  'peer w-full bg-cloud-white border-2 border-sky-blueprint/40 rounded-input px-5 pt-6 pb-2 text-ink-black text-body font-manrope focus:outline-none focus:border-vivid-blue transition-colors';
const labelBase =
  'absolute left-5 top-3.5 text-ink-charcoal text-body font-manrope pointer-events-none transition-all duration-150 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-body peer-focus:top-1.5 peer-focus:text-caption peer-focus:text-sky-dark peer-focus:tracking-wider';
const labelFilled =
  'top-1.5 text-caption text-sky-dark tracking-wider';

export const FloatingInput = ({ label, error, hint, className, iconLeft, value, ...rest }: InputProps) => {
  const id = useId();
  const hasValue = value !== undefined && value !== '';
  return (
    <div className={cn('relative', className)}>
      {iconLeft && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-charcoal pointer-events-none">{iconLeft}</span>
      )}
      <input
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        className={cn(fieldBase, iconLeft && 'pl-12', error && 'border-sunset-orange')}
      />
      <label htmlFor={id} className={cn(labelBase, iconLeft && 'left-12', hasValue && labelFilled)}>
        {label}
      </label>
      {error ? (
        <p className="text-sunset-orange text-caption mt-2 ml-2">{error}</p>
      ) : hint ? (
        <p className="text-ink-charcoal/70 text-caption mt-2 ml-2">{hint}</p>
      ) : null}
    </div>
  );
};

export const FloatingTextarea = ({ label, error, hint, className, value, ...rest }: TextareaProps) => {
  const id = useId();
  const hasValue = value !== undefined && value !== '';
  return (
    <div className={cn('relative', className)}>
      <textarea
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        className={cn(fieldBase, 'min-h-24 pt-7 rounded-card', error && 'border-sunset-orange')}
      />
      <label htmlFor={id} className={cn(labelBase, hasValue && labelFilled)}>
        {label}
      </label>
      {error ? (
        <p className="text-sunset-orange text-caption mt-2 ml-2">{error}</p>
      ) : hint ? (
        <p className="text-ink-charcoal/70 text-caption mt-2 ml-2">{hint}</p>
      ) : null}
    </div>
  );
};

export const FloatingSelect = ({ label, error, hint, className, options, value, ...rest }: SelectProps) => {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <select
        {...rest}
        id={id}
        value={value}
        className={cn(fieldBase, 'pr-10 appearance-none cursor-pointer', error && 'border-sunset-orange')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label htmlFor={id} className={cn(labelBase, labelFilled)}>
        {label}
      </label>
      <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-charcoal">▾</span>
      {error ? (
        <p className="text-sunset-orange text-caption mt-2 ml-2">{error}</p>
      ) : hint ? (
        <p className="text-ink-charcoal/70 text-caption mt-2 ml-2">{hint}</p>
      ) : null}
    </div>
  );
};
