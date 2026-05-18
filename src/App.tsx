import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CarPage } from './pages/CarPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { MaintenancePlanPage } from './pages/MaintenancePlanPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InsurancePage } from './pages/InsurancePage';
import { SharingPage } from './pages/SharingPage';
import { SettingsPage } from './pages/SettingsPage';
import { TripsPage } from './pages/TripsPage';
import { MechanicsPage } from './pages/MechanicsPage';
import { MechanicDetailPage } from './pages/MechanicDetailPage';
import { OBD2Page } from './pages/OBD2Page';
import { InvitePage } from './pages/InvitePage';
import { WorkshopPage } from './pages/WorkshopPage';
import { authService } from './services/auth.service';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

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

    const { data: { subscription } } = authService.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--color-snow)', color: 'var(--color-ink)', border: '1px solid var(--color-silver-mist)', boxShadow: 'none', borderRadius: '20px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/taller/:token" element={<WorkshopPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="car" element={<CarPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="maintenance-plan" element={<MaintenancePlanPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="mechanics" element={<MechanicsPage />} />
          <Route path="mechanics/detail" element={<MechanicDetailPage />} />
          <Route path="obd2" element={<OBD2Page />} />
          <Route path="sharing" element={<SharingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
