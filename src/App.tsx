import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SkeletonCard } from './components/ui/Skeleton';
import { authService } from './services/auth.service';
import { syncQueueService } from './services/syncQueue.service';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

// Páginas autenticadas en chunks separados — reduce bundle inicial (Leaflet,
// Recharts, WebBluetooth y resto de dependencias pesadas no se descargan hasta
// que el usuario navega a la página correspondiente). Incluye el Dashboard,
// que arrastra calculateAlerts y los servicios de maintenance/expenses/trips/
// documents, todos innecesarios en /login y /register.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const CarPage = lazy(() => import('./pages/CarPage').then((m) => ({ default: m.CarPage })));
const MaintenancePage = lazy(() =>
  import('./pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage })),
);
const MaintenancePlanPage = lazy(() =>
  import('./pages/MaintenancePlanPage').then((m) => ({ default: m.MaintenancePlanPage })),
);
const ExpensesPage = lazy(() =>
  import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })),
);
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const InsurancePage = lazy(() =>
  import('./pages/InsurancePage').then((m) => ({ default: m.InsurancePage })),
);
const TripsPage = lazy(() => import('./pages/TripsPage').then((m) => ({ default: m.TripsPage })));
const SurpriseRevealPage = lazy(() =>
  import('./pages/SurpriseRevealPage').then((m) => ({ default: m.SurpriseRevealPage })),
);
const MechanicsPage = lazy(() =>
  import('./pages/MechanicsPage').then((m) => ({ default: m.MechanicsPage })),
);
const MechanicDetailPage = lazy(() =>
  import('./pages/MechanicDetailPage').then((m) => ({ default: m.MechanicDetailPage })),
);
const OBD2Page = lazy(() => import('./pages/OBD2Page').then((m) => ({ default: m.OBD2Page })));
const SharingPage = lazy(() =>
  import('./pages/SharingPage').then((m) => ({ default: m.SharingPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const InvitePage = lazy(() =>
  import('./pages/InvitePage').then((m) => ({ default: m.InvitePage })),
);
const WorkshopPage = lazy(() =>
  import('./pages/WorkshopPage').then((m) => ({ default: m.WorkshopPage })),
);
const GalleryPage = lazy(() =>
  import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })),
);
const PrestamoPage = lazy(() =>
  import('./pages/PrestamoPage').then((m) => ({ default: m.PrestamoPage })),
);

const PageFallback = () => (
  <div className="px-6 sm:px-10 py-10 space-y-4">
    <SkeletonCard />
    <SkeletonCard />
  </div>
);

const lazyRoute = (node: React.ReactNode) => (
  <Suspense fallback={<PageFallback />}>{node}</Suspense>
);

function App() {
  const { setUser, setLoading } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    authService.getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Arranca el reintento automático de escrituras OBD2 fallidas.
    syncQueueService.startAutoSync();

    return () => {
      subscription.unsubscribe();
      syncQueueService.stopAutoSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-snow)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-silver-mist)',
            boxShadow: 'none',
            borderRadius: '20px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={lazyRoute(<InvitePage />)} />
        <Route path="/taller/:token" element={lazyRoute(<WorkshopPage />)} />
        <Route path="/viajes/surprise/:token" element={lazyRoute(<SurpriseRevealPage />)} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={lazyRoute(<DashboardPage />)} />
          <Route path="car" element={lazyRoute(<CarPage />)} />
          <Route path="maintenance" element={lazyRoute(<MaintenancePage />)} />
          <Route path="maintenance-plan" element={lazyRoute(<MaintenancePlanPage />)} />
          <Route path="expenses" element={lazyRoute(<ExpensesPage />)} />
          <Route path="documents" element={lazyRoute(<DocumentsPage />)} />
          <Route path="insurance" element={lazyRoute(<InsurancePage />)} />
          <Route path="trips" element={lazyRoute(<TripsPage />)} />
          <Route path="mechanics" element={lazyRoute(<MechanicsPage />)} />
          <Route path="mechanics/detail" element={lazyRoute(<MechanicDetailPage />)} />
          <Route path="obd2" element={lazyRoute(<OBD2Page />)} />
          <Route path="sharing" element={lazyRoute(<SharingPage />)} />
          <Route path="galeria" element={lazyRoute(<GalleryPage />)} />
          <Route path="prestamo" element={lazyRoute(<PrestamoPage />)} />
          <Route path="settings" element={lazyRoute(<SettingsPage />)} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
