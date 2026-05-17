import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutGrid, Wrench, Receipt, FileText, Route, Share2, Settings,
} from 'lucide-react';
import { FloatingDock, type FloatingDockItem } from './FloatingDock';
import { BottomNav } from './BottomNav';
import { PageTransition } from '../ui/PageTransition';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAuthStore } from '../../store/authStore';
import { useVehicle } from '../../hooks/useVehicle';

export const Layout = () => {
  const location = useLocation();
  const { selectedVehicle, vehicles } = useVehicleStore();
  const { user } = useAuthStore();
  const { fetchVehicles } = useVehicle();

  /* Make sure the vehicle list is populated regardless of which page the user
     lands on first. The hook short-circuits when called twice. */
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  /* Vehicle context for the dock: selected → first available. */
  const activeVehicle = selectedVehicle ?? vehicles[0] ?? null;

  const dockItems = useMemo<FloatingDockItem[]>(() => ([
    { id: 'overview',    label: 'Vista general', icon: LayoutGrid, href: '/car' },
    { id: 'maintenance', label: 'Mantenimiento', icon: Wrench,     href: '/maintenance' },
    { id: 'expenses',    label: 'Gastos',        icon: Receipt,    href: '/expenses' },
    { id: 'documents',   label: 'Documentos',    icon: FileText,   href: '/documents' },
    { id: 'trips',       label: 'Viajes',        icon: Route,      href: '/trips' },
    { id: 'sharing',     label: 'Compartir',     icon: Share2,     href: '/sharing' },
    { id: 'settings',    label: 'Ajustes',       icon: Settings,   href: '/settings' },
  ]), []);

  const activeId = useMemo(() => {
    const p = location.pathname;
    if (p === '/car' || p.startsWith('/car/'))                   return 'overview';
    if (p === '/maintenance' || p.startsWith('/maintenance/'))   return 'maintenance';
    if (p === '/expenses' || p.startsWith('/expenses/'))         return 'expenses';
    if (p === '/documents' || p.startsWith('/documents/'))       return 'documents';
    if (p === '/trips' || p.startsWith('/trips/'))               return 'trips';
    if (p === '/sharing' || p.startsWith('/sharing/'))           return 'sharing';
    if (p === '/settings' || p.startsWith('/settings/'))         return 'settings';
    return '';
  }, [location.pathname]);

  const userMeta = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const email = user?.email ?? '';
    const parts = full.trim().split(/\s+/).filter(Boolean);
    const fromName = parts.length
      ? (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase()
      : '';
    const fromEmail = email.split('@')[0]?.slice(0, 2).toUpperCase() ?? 'FH';
    return {
      initials: fromName || fromEmail || 'FH',
      name: full || email.split('@')[0] || 'Piloto',
    };
  }, [user]);

  /* No vehicles yet — minimal shell (login/empty-garage state lives in pages). */
  if (!activeVehicle) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-fog)' }}>
        <main className="overflow-x-hidden">
          <ErrorBoundary key={location.pathname}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  const vehicleMeta = {
    brand: activeVehicle.brand,
    model: activeVehicle.model,
    plate: activeVehicle.license_plate ?? '—',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-fog)' }}>
      <FloatingDock
        items={dockItems}
        activeId={activeId}
        vehicle={vehicleMeta}
        user={userMeta}
        backHref="/dashboard"
      />
      {/* Desktop: reserve 100px on the left for the dock (60px dock + 20px
          offset + 20px breathing room). Mobile: dock is hidden, BottomNav
          takes over — reserve bottom space instead. */}
      <main className="pl-0 md:pl-[100px] pb-24 md:pb-0 overflow-x-hidden">
        <ErrorBoundary key={location.pathname}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  );
};
