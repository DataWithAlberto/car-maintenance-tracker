import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import type { Alert } from '../../types';
import { cn } from '../../utils/cn';

const severityConfig = {
  high: {
    icon: AlertCircle,
    iconCls: 'text-sunset-orange',
    text: 'text-ink-black',
    label: 'text-sunset-orange',
    bg: 'bg-sunset-orange/10 border-sunset-orange/40',
    bar: 'bg-sunset-orange',
    code: 'ALT',
  },
  medium: {
    icon: AlertTriangle,
    iconCls: 'text-warn-500',
    text: 'text-ink-charcoal',
    label: 'text-warn-500',
    bg: 'bg-warn-400/15 border-warn-400/40',
    bar: 'bg-warn-500',
    code: 'WARN',
  },
  low: {
    icon: Info,
    iconCls: 'text-sky-dark',
    text: 'text-ink-charcoal',
    label: 'text-sky-dark',
    bg: 'bg-sky-blueprint/10 border-sky-blueprint/40',
    bar: 'bg-sky-blueprint',
    code: 'INFO',
  },
};

interface Props {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export const AlertCard = ({ alert, onDismiss }: Props) => {
  const config = severityConfig[alert.severity ?? 'low'];
  const Icon = config.icon;

  return (
    <div className={cn(
      'relative flex items-start gap-3 pl-4 pr-3 py-3 rounded-lg border overflow-hidden',
      config.bg,
    )}>
      {/* Left severity bar */}
      <span className={cn('absolute left-0 inset-y-0 w-[3px]', config.bar)} />

      {/* Icon */}
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', config.iconCls)} strokeWidth={2.2} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('text-[9px] font-mono font-bold tracking-[0.15em]', config.label)}>
            {config.code}
          </span>
          <span className="text-ink-charcoal/65 text-[9px]">·</span>
          <span className="text-[9px] font-mono text-ink-charcoal/80 truncate">
            {alert.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <p className={cn('text-xs leading-relaxed', config.text)}>
          {alert.description}
        </p>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-ink-charcoal/80 hover:text-ink-black p-1 -m-1 rounded transition-colors shrink-0"
          aria-label="Descartar alerta"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
