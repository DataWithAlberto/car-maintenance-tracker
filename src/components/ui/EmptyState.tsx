import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}>
    <div className="relative mb-5">
      <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full" />
      <div className="relative bg-surface-2 border border-border rounded-2xl p-5">
        <Icon className="h-10 w-10 text-brand-300" strokeWidth={1.5} />
      </div>
    </div>
    <h3 className="text-white text-lg font-semibold tracking-tight">{title}</h3>
    {description && (
      <p className="text-gray-400 text-sm mt-2 max-w-sm leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
