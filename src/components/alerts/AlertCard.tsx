import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import type { Alert } from '../../types';
import { cn } from '../../utils/cn';

const severityConfig = {
  high: {
    icon: AlertCircle,
    iconCls: 'text-danger-400',
    text: 'text-danger-300',
    label: 'text-danger-400',
    bg: 'bg-danger-500/8 border-danger-500/30',
    bar: 'bg-danger-500',
    code: 'ALT',
  },
  medium: {
    icon: AlertTriangle,
    iconCls: 'text-warn-400',
    text: 'text-warn-300/80',
    label: 'text-warn-400',
    bg: 'bg-warn-500/8 border-warn-500/25',
    bar: 'bg-warn-500',
    code: 'WARN',
  },
  low: {
    icon: Info,
    iconCls: 'text-brand-400',
    text: 'text-gray-400',
    label: 'text-brand-400',
    bg: 'bg-surface border-border/80',
    bar: 'bg-brand-500',
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
          <span className="text-gray-700 text-[9px]">·</span>
          <span className="text-[9px] font-mono text-gray-600 truncate">
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
          className="text-gray-600 hover:text-white p-1 -m-1 rounded transition-colors shrink-0"
          aria-label="Descartar alerta"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
