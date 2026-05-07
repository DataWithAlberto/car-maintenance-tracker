import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import type { Alert } from '../../types';
import { cn } from '../../utils/cn';

const severityConfig = {
  high: {
    icon: AlertCircle,
    iconCls: 'text-danger-400',
    text: 'text-danger-400',
    bg: 'bg-danger-500/10 border-danger-500/30',
    accent: 'bg-danger-500',
  },
  medium: {
    icon: AlertTriangle,
    iconCls: 'text-warn-400',
    text: 'text-warn-400',
    bg: 'bg-warn-500/10 border-warn-500/30',
    accent: 'bg-warn-500',
  },
  low: {
    icon: Info,
    iconCls: 'text-brand-300',
    text: 'text-brand-200',
    bg: 'bg-brand-500/10 border-brand-500/30',
    accent: 'bg-brand-500',
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
      'relative flex items-start gap-3 p-3.5 pr-3 rounded-xl border overflow-hidden',
      config.bg,
    )}>
      <span className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r-full', config.accent)} />
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.iconCls)} strokeWidth={2.2} />
      <p className={cn('text-sm flex-1 leading-relaxed', config.text)}>{alert.description}</p>
      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-500 hover:text-white p-1 -m-1 rounded-md hover:bg-white/5 transition-colors"
          aria-label="Descartar alerta"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
