import { Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

/* ─── Apple-style skeletons ──────────────────────────────────────────────────
 *
 * Achromatic shimmer over surface tokens — el gradiente fluye con dark/light
 * sin necesidad de overrides. Card containers match the 20/14px radii used
 * por KpiCard / row variants. Zero shadows.
 * ──────────────────────────────────────────────────────────────────────────── */

export const Skeleton = ({ className = '', rounded = true }: SkeletonProps) => (
  <div className={cn('skeleton', rounded ? 'rounded-[10px]' : '', className)} />
);

export const SkeletonText = ({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3" />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={cn('bg-snow border border-silver-mist rounded-[20px] p-5', className)}>
    <div className="flex items-start justify-between mb-4 gap-3">
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
  <div className="bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-4 w-20" />
  </div>
);

interface SkeletonRevealProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * SkeletonReveal — muestra `skeleton` mientras `loading=true` y, cuando pasa
 * a `false`, los `children` aparecen con un stagger (cada hijo top-level
 * recibe `--i` para escalonar 65 ms). El cambio de `key` re-monta el árbol
 * de contenido real para que la animación dispare incluso en re-renders.
 */
export const SkeletonReveal = ({ loading, skeleton, children, className }: SkeletonRevealProps) => {
  if (loading) {
    return <div className={className}>{skeleton}</div>;
  }

  const stamped = Children.map(children, (child, i) => {
    if (!isValidElement<{ style?: React.CSSProperties; className?: string }>(child)) {
      return (
        <span
          className="skeleton-reveal-item"
          style={{ ['--i' as string]: i } as React.CSSProperties}
        >
          {child}
        </span>
      );
    }
    const prevStyle = child.props.style ?? {};
    const prevClass = child.props.className ?? '';
    return cloneElement(child, {
      className: cn('skeleton-reveal-item', prevClass),
      style: { ...prevStyle, ['--i' as string]: i } as React.CSSProperties,
    });
  });

  return (
    <div key="content" className={className}>
      {stamped}
    </div>
  );
};
