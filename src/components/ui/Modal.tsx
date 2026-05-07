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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full glass-strong border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl',
          sizeMap[size],
        )}
        style={{ animation: 'slide-up 0.35s var(--ease-out-expo)' }}
      >
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/60">
          <div className="min-w-0 pr-4">
            {title && <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>}
            {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 -mr-1 -mt-1 h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-surface-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-5 sm:p-6 border-t border-border/60">{footer}</div>}
      </div>
    </div>
  );
};
