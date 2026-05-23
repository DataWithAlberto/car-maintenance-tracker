import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  LayoutDashboard,
  Wrench,
  Receipt,
  FileText,
  Route,
  Share2,
  Settings,
  ShieldCheck,
  CalendarClock,
  Wallet,
  Folder,
  Cpu,
  Store,
  Images,
} from 'lucide-react';
import { FloatingDock, type FloatingDockEntry } from './FloatingDock';
import { BottomNav } from './BottomNav';
import { PageTransition } from '../ui/PageTransition';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ThemeToggle } from '../ui/ThemeToggle';
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
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  /* Vehicle context for the dock: selected → first available. */
  const activeVehicle = selectedVehicle ?? vehicles[0] ?? null;

  const dockEntries = useMemo<FloatingDockEntry[]>(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        lordSrc: 'https://cdn.lordicon.com/dutqakce.json',
      },
      {
        id: 'overview',
        label: 'Mi vehículo',
        icon: LayoutGrid,
        href: '/car',
        lordSrc: 'https://cdn.lordicon.com/oeotfwsx.json',
      },
      {
        id: 'maintenance-group',
        label: 'Mantenimiento',
        icon: Wrench,
        lordSrc: 'https://cdn.lordicon.com/mudwpdhy.json',
        children: [
          {
            id: 'maintenance',
            label: 'Mantenimiento',
            icon: Wrench,
            href: '/maintenance',
            lordSrc: 'https://cdn.lordicon.com/mudwpdhy.json',
          },
          {
            id: 'plan',
            label: 'Plan predictivo',
            icon: CalendarClock,
            href: '/maintenance-plan',
            lordSrc: 'https://cdn.lordicon.com/uoljexdg.json',
          },
        ],
      },
      {
        id: 'finance-group',
        label: 'Finanzas',
        icon: Wallet,
        lordSrc: 'https://cdn.lordicon.com/lrzdmsmx.json',
        children: [
          {
            id: 'expenses',
            label: 'Gastos',
            icon: Receipt,
            href: '/expenses',
            lordSrc: 'https://cdn.lordicon.com/yycecovd.json',
          },
          {
            id: 'insurance',
            label: 'Seguro',
            icon: ShieldCheck,
            href: '/insurance',
            lordSrc: 'https://cdn.lordicon.com/yraqammt.json',
          },
        ],
      },
      {
        id: 'trips',
        label: 'Viajes',
        icon: Route,
        href: '/trips',
        lordSrc: 'https://cdn.lordicon.com/qtzfwijv.json',
      },
      {
        id: 'obd2',
        label: 'OBD-II',
        icon: Cpu,
        href: '/obd2',
        lordSrc: 'https://cdn.lordicon.com/fedbzost.json',
      },
      {
        id: 'mechanics',
        label: 'Talleres',
        icon: Store,
        href: '/mechanics',
        lordSrc: 'https://cdn.lordicon.com/vwwysvjs.json',
      },
      {
        id: 'gallery',
        label: 'Galería',
        icon: Images,
        href: '/galeria',
        lordSrc: 'https://cdn.lordicon.com/ggihhudh.json',
      },
      {
        id: 'management-group',
        label: 'Gestión',
        icon: Folder,
        lordSrc: 'https://cdn.lordicon.com/piurhpdv.json',
        children: [
          {
            id: 'documents',
            label: 'Documentos',
            icon: FileText,
            href: '/documents',
            lordSrc: 'https://cdn.lordicon.com/jqqjtvlf.json',
          },
          {
            id: 'sharing',
            label: 'Compartir',
            icon: Share2,
            href: '/sharing',
            lordSrc: 'https://cdn.lordicon.com/fhlrrido.json',
          },
        ],
      },
      {
        id: 'settings',
        label: 'Ajustes',
        icon: Settings,
        href: '/settings',
        lordSrc: 'https://cdn.lordicon.com/asyunleq.json',
      },
    ],
    [],
  );

  const activeId = useMemo(() => {
    const p = location.pathname;
    if (p === '/dashboard' || p.startsWith('/dashboard/')) return 'dashboard';
    if (p === '/car' || p.startsWith('/car/')) return 'overview';
    if (p === '/maintenance-plan' || p.startsWith('/maintenance-plan/')) return 'plan';
    if (p === '/maintenance' || p.startsWith('/maintenance/')) return 'maintenance';
    if (p === '/expenses' || p.startsWith('/expenses/')) return 'expenses';
    if (p === '/documents' || p.startsWith('/documents/')) return 'documents';
    if (p === '/insurance' || p.startsWith('/insurance/')) return 'insurance';
    if (p === '/trips' || p.startsWith('/trips/')) return 'trips';
    if (p === '/obd2' || p.startsWith('/obd2/')) return 'obd2';
    if (p === '/mechanics' || p.startsWith('/mechanics/')) return 'mechanics';
    if (p === '/sharing' || p.startsWith('/sharing/')) return 'sharing';
    if (p === '/galeria' || p.startsWith('/galeria/')) return 'gallery';
    if (p === '/settings' || p.startsWith('/settings/')) return 'settings';
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
        <ThemeToggle />
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
        entries={dockEntries}
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
      <ThemeToggle />
    </div>
  );
};
