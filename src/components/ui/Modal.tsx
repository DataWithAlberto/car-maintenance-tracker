import { useEffect, type ReactNode } from 'react';
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

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal = ({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'fade-in 0.2s ease-out' }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink-black/40 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full bg-cloud-white border border-sky-blueprint/30 rounded-t-card sm:rounded-card shadow-card',
          sizeMap[size],
        )}
        style={{ animation: 'slide-up 0.35s var(--ease-out-expo)' }}
      >
        <div className="flex items-start justify-between p-20 sm:p-48 border-b border-sky-blueprint/20">
          <div className="min-w-0 pr-4">
            {title && (
              <h2 className="font-simeiz text-heading font-light text-ink-black tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="font-manrope text-body text-ink-charcoal mt-2">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 -mr-1 -mt-1 h-9 w-9 inline-flex items-center justify-center rounded-button text-ink-charcoal hover:text-ink-black hover:bg-canvas-50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-20 sm:p-48 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-20 sm:p-48 border-t border-sky-blueprint/20">{footer}</div>}
      </div>
    </div>
  );
};
