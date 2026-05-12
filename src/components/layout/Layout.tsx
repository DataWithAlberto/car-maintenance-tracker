import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutGrid, Wrench, Receipt, FileText, Route, Share2, Settings,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { FloatingDock, type FloatingDockItem } from './FloatingDock';
import { PageTransition } from '../ui/PageTransition';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAuthStore } from '../../store/authStore';

/* Vehicle-scoped route prefixes — when active, render FloatingDock. */
const VEHICLE_ROUTES = [
  '/car', '/maintenance', '/expenses',
  '/documents', '/trips', '/sharing', '/settings',
];

const TOASTER = (
  <Toaster
    position="top-right"
    toastOptions={{
      style: {
        background: '#0f1013',
        color: '#d4d4d8',
        border: '1px solid #242629',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'var(--font-mono)',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      },
      success: { iconTheme: { primary: '#10b981', secondary: '#0f1013' } },
      error:   { iconTheme: { primary: '#ef4444', secondary: '#0f1013' } },
    }}
  />
);

export const Layout = () => {
  const location = useLocation();
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();

  const isVehicleRoute = VEHICLE_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );

  // ─── Build dock data only when we'll render it ──────────────────────────
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

  // Fall back to the standard layout if we're on a vehicle route but no vehicle
  // has been selected yet — keeps the sidebar/navbar visible so the user can go
  // back to the dashboard.
  if (isVehicleRoute && selectedVehicle) {
    const vehicleMeta = {
      brand: selectedVehicle.brand,
      model: selectedVehicle.model,
      plate: selectedVehicle.license_plate ?? '—',
    };
    return (
      <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
        <FloatingDock
          items={dockItems}
          activeId={activeId}
          vehicle={vehicleMeta}
          user={userMeta}
          backHref="/dashboard"
        />
        {/* Reserve 100px on the left so children don't sit under the dock.
            (60px dock + 20px offset + 20px breathing room.) */}
        <main className="pl-[100px] overflow-x-hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        {TOASTER}
      </div>
    );
  }

  // ─── Default (dashboard / no selected vehicle) ──────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <BottomNav />
      {TOASTER}
    </div>
  );
};
