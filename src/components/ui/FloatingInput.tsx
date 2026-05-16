import type {
  InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode,
} from 'react';
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  iconLeft?: ReactNode;
}

type InputProps    = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'>;
type TextareaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'>;
type SelectProps   = BaseProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'placeholder'> & {
  options: Array<{ value: string; label: string }>;
};

/* ─── Apple-style fields ──────────────────────────────────────────────────────
 *
 * - Surface: #ffffff (snow) over #f5f5f7 canvas
 * - Border: 1px #e8e8ed (silver-mist); focus → 1px #0071e3 (azure)
 * - Radius: 14px (between buttons and cards)
 * - Floating label uses graphite (#707070) → ink (#1d1d1f) on focus / fill
 * - Error: 1px #b64400 (caution) border + helper text
 * - Zero box-shadows.
 * ──────────────────────────────────────────────────────────────────────────── */

const fieldBase =
  'peer w-full bg-snow border border-silver-mist rounded-[14px] ' +
  'px-4 pt-[22px] pb-2 text-ink text-body font-text ' +
  'placeholder:text-transparent ' +
  'focus:outline-none focus:border-azure ' +
  'transition-colors duration-150';

const labelBase =
  'absolute left-4 pointer-events-none font-text text-graphite ' +
  'transition-all duration-150 ' +
  // resting (when input is empty / not focused)
  'top-1/2 -translate-y-1/2 text-body ' +
  // floating (input focused or filled)
  'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-caption peer-focus:text-azure ' +
  'peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-caption';

const labelFilled =
  'top-2 -translate-y-0 text-caption';

const helperBase =
  'mt-2 px-1 font-text text-caption';

/* ── INPUT ───────────────────────────────────────────────────────────────── */
export const FloatingInput = ({
  label, error, hint, className, iconLeft, value, ...rest
}: InputProps) => {
  const id = useId();
  const hasValue = value !== undefined && value !== '';
  return (
    <div className={cn('relative', className)}>
      {iconLeft && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite pointer-events-none">
          {iconLeft}
        </span>
      )}
      <input
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        className={cn(
          fieldBase,
          iconLeft && 'pl-12',
          error && 'border-caution focus:border-caution',
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          labelBase,
          iconLeft && 'left-12',
          hasValue && labelFilled,
        )}
      >
        {label}
      </label>
      {error ? (
        <p className={cn(helperBase, 'text-caution')}>{error}</p>
      ) : hint ? (
        <p className={cn(helperBase, 'text-graphite')}>{hint}</p>
      ) : null}
    </div>
  );
};

/* ── TEXTAREA ────────────────────────────────────────────────────────────── */
export const FloatingTextarea = ({
  label, error, hint, className, value, ...rest
}: TextareaProps) => {
  const id = useId();
  const hasValue = value !== undefined && value !== '';
  return (
    <div className={cn('relative', className)}>
      <textarea
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        className={cn(
          fieldBase,
          'min-h-24 pt-7 rounded-[18px] resize-y',
          error && 'border-caution focus:border-caution',
        )}
      />
      {/* For textarea the label sits at the top of the field rather than
         vertically centered (textareas grow downward). */}
      <label
        htmlFor={id}
        className={cn(
          'absolute left-4 top-2 pointer-events-none font-text text-caption text-graphite',
          'transition-colors duration-150',
          'peer-focus:text-azure',
          hasValue && 'text-azure',
        )}
      >
        {label}
      </label>
      {error ? (
        <p className={cn(helperBase, 'text-caution')}>{error}</p>
      ) : hint ? (
        <p className={cn(helperBase, 'text-graphite')}>{hint}</p>
      ) : null}
    </div>
  );
};

/* ── SELECT ──────────────────────────────────────────────────────────────── */
export const FloatingSelect = ({
  label, error, hint, className, options, value, ...rest
}: SelectProps) => {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <select
        {...rest}
        id={id}
        value={value}
        className={cn(
          fieldBase,
          'pr-10 appearance-none cursor-pointer',
          error && 'border-caution focus:border-caution',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label htmlFor={id} className={cn(labelBase, labelFilled, 'text-azure')}>
        {label}
      </label>
      <ChevronDown
        className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-graphite"
        strokeWidth={1.8}
      />
      {error ? (
        <p className={cn(helperBase, 'text-caution')}>{error}</p>
      ) : hint ? (
        <p className={cn(helperBase, 'text-graphite')}>{hint}</p>
      ) : null}
    </div>
  );
};
