import type { ComponentType, SVGProps } from 'react';
import { AlertTriangle } from 'lucide-react';

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

export const WidgetLoading = ({ height = 120 }: { height?: number }) => (
  <div
    className="skeleton"
    role="status"
    aria-label="Cargando datos"
    style={{ height, borderRadius: 12 }}
  />
);

export const WidgetEmpty = ({
  icon: Icon, message, ctaLabel, onCta,
}: {
  icon: IconCmp; message: string; ctaLabel?: string; onCta?: () => void;
}) => (
  <div style={{
    height: 120, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    background: '#fafafa', border: '1px dashed #e8e8ed',
    borderRadius: 12, color: '#707070',
    fontFamily: 'Inter, var(--font-sf-pro-text)', fontSize: 13,
  }}>
    <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
    <span>{message}</span>
    {ctaLabel && onCta && (
      <button
        type="button"
        onClick={onCta}
        style={{
          all: 'unset', cursor: 'pointer',
          color: '#0071e3', fontWeight: 500, fontSize: 12,
          textDecoration: 'underline',
        }}
      >
        {ctaLabel}
      </button>
    )}
  </div>
);

export const WidgetError = ({
  onRetry, message, retryLabel,
}: {
  onRetry: () => void; message: string; retryLabel: string;
}) => (
  <div
    role="alert"
    style={{
      height: 120, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      background: '#fff1ea', border: '1px solid #f4cdb6',
      borderRadius: 12, color: '#b64400', fontSize: 13,
      fontFamily: 'Inter, var(--font-sf-pro-text)',
    }}
  >
    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
    <span>{message}</span>
    <button
      type="button"
      onClick={onRetry}
      style={{
        all: 'unset', cursor: 'pointer', color: '#b64400',
        fontWeight: 500, fontSize: 12, textDecoration: 'underline',
      }}
    >
      {retryLabel}
    </button>
  </div>
);
