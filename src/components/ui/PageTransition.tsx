import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Lightweight CSS-only page transition. Re-mounts on route change
 * via key, replaying the `page-enter` animation.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
};
