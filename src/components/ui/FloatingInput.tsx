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
  'peer w-full bg-surface-2/60 border border-border rounded-xl px-3.5 pt-5 pb-2 text-white text-sm focus:outline-none focus:border-brand-400 focus:bg-surface-2 transition-colors';
const labelBase =
  'absolute left-3.5 top-3.5 text-gray-500 text-sm pointer-events-none transition-all duration-150 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-brand-300 peer-focus:uppercase peer-focus:tracking-wider';
const labelFilled =
  'top-1.5 text-[10px] text-brand-300 uppercase tracking-wider';

export const FloatingInput = ({ label, error, hint, className, iconLeft, value, ...rest }: InputProps) => {
  const id = useId();
  const hasValue = value !== undefined && value !== '';
  return (
    <div className={cn('relative', className)}>
      {iconLeft && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{iconLeft}</span>
      )}
      <input
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        className={cn(fieldBase, iconLeft && 'pl-10', error && 'border-danger-500/60')}
      />
      <label htmlFor={id} className={cn(labelBase, iconLeft && 'left-10', hasValue && labelFilled)}>
        {label}
      </label>
      {error ? (
        <p className="text-danger-400 text-xs mt-1.5 ml-1">{error}</p>
      ) : hint ? (
        <p className="text-gray-500 text-xs mt-1.5 ml-1">{hint}</p>
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
        className={cn(fieldBase, 'min-h-24 pt-6', error && 'border-danger-500/60')}
      />
      <label htmlFor={id} className={cn(labelBase, hasValue && labelFilled)}>
        {label}
      </label>
      {error ? (
        <p className="text-danger-400 text-xs mt-1.5 ml-1">{error}</p>
      ) : hint ? (
        <p className="text-gray-500 text-xs mt-1.5 ml-1">{hint}</p>
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
        className={cn(fieldBase, 'pr-10 appearance-none cursor-pointer', error && 'border-danger-500/60')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label htmlFor={id} className={cn(labelBase, labelFilled)}>
        {label}
      </label>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▾</span>
      {error ? (
        <p className="text-danger-400 text-xs mt-1.5 ml-1">{error}</p>
      ) : hint ? (
        <p className="text-gray-500 text-xs mt-1.5 ml-1">{hint}</p>
      ) : null}
    </div>
  );
};
