import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

/* ─── Apple-style modal ───────────────────────────────────────────────────────
 *
 * - Surface: #ffffff card on var(--color-ink)/40 backdrop with backdrop-blur.
 * - Radius: 28px (card token).
 * - Zero box-shadow — elevation comes from the dark backdrop alone.
 * - Title: SF Pro Display 600 24/-0.36px (heading-sm).
 * - Description: SF Pro Text 17/400 var(--color-graphite).
 * - Hairline divider 1px var(--color-silver-mist) between header / body / footer.
 * ──────────────────────────────────────────────────────────────────────────── */

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  footer,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirst = () => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      const first = focusable?.[0] ?? dialogRef.current;
      first?.focus();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    window.setTimeout(focusFirst, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, animation: 'fade-in 0.2s ease-out' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — dark ink with subtle blur */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(29, 29, 31, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Sheet — Apple Liquid Glass */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className={cn(
          'liquid-glass relative w-full flex flex-col',
          'max-h-[92vh] sm:max-h-[88vh]',
          'rounded-t-[28px] sm:rounded-[28px]',
          sizeMap[size],
        )}
        style={{ animation: 'slide-up 0.35s var(--ease-out-expo)' }}
      >
        {/* Header */}
        {(title || description) && (
          <div className="shrink-0 flex items-start justify-between gap-4 p-7 border-b border-silver-mist">
            <div className="min-w-0 flex-1">
              {title && (
                <h2
                  className="font-display text-ink"
                  style={{
                    fontWeight: 600,
                    fontSize: 24,
                    lineHeight: 1.2,
                    letterSpacing: '-0.36px',
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className="font-text text-graphite mt-2"
                  style={{
                    fontWeight: 400,
                    fontSize: 17,
                    lineHeight: 1.4,
                    letterSpacing: '-0.1px',
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className={cn(
                'shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full',
                'text-ink hover:bg-silver-mist transition-colors duration-150 focus-ring',
              )}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-7 flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && <div className="shrink-0 p-7 border-t border-silver-mist">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
