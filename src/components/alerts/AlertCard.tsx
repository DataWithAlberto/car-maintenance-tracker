import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import type { Alert } from '../../types';

const severityConfig = {
  high: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  medium: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
};

interface Props {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export const AlertCard = ({ alert, onDismiss }: Props) => {
  const config = severityConfig[alert.severity ?? 'low'];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
      <p className={`text-sm flex-1 ${config.color}`}>{alert.description}</p>
      {onDismiss && (
        <button onClick={() => onDismiss(alert.id)} className="text-gray-600 hover:text-gray-400">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
