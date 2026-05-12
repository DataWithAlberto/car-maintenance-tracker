import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export const Skeleton = ({ className = '', rounded = true }: SkeletonProps) => (
  <div className={cn('skeleton', rounded ? 'rounded-xl' : '', className)} />
);

export const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3" />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={cn('bg-surface border border-border/60 rounded-2xl p-5', className)}>
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonRow = () => (
  <div className="bg-surface border border-border/60 rounded-xl p-4 flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-4 w-20" />
  </div>
);
