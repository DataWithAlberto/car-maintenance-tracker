import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, Gauge, Receipt, Route, Wallet, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

import { useVehicleStore } from '../store/vehicleStore';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { TripAnniversaryBanner } from '../components/trips/TripAnniversaryBanner';
import { getErrorMessage } from '../utils/errors';

import { useDashboardData } from '../components/dashboard/useDashboardData';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { UrgentBanner } from '../components/dashboard/UrgentBanner';
import { KpiTile } from '../components/dashboard/KpiTile';
import { VehicleSpotlight } from '../components/dashboard/VehicleSpotlight';
import { ActionCard } from '../components/dashboard/ActionCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { UsageSparkline } from '../components/dashboard/UsageSparkline';
import { ExpenseBreakdown } from '../components/dashboard/ExpenseBreakdown';
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist';
import { AlertCenter } from '../components/dashboard/AlertCenter';
import { FleetGrid } from '../components/dashboard/FleetGrid';
import { EmptyGarage } from '../components/dashboard/EmptyGarage';
import { CARD, EYEBROW } from '../components/dashboard/styles';
import { fmtN, fmtEur } from '../components/dashboard/format';
import type { VehicleWithAccess } from '../types';

// Visor 3D — carga diferida: mantiene el bundle de Three.js fuera del chunk
// inicial del dashboard.
const FordFocusModel3D = lazy(() =>
  import('../components/3d/FordFocusModel3D').then((m) => ({ default: m.FordFocusModel3D })),
);

export const DashboardPage = () => {
  const data = useDashboardData();
  const {
    vehicles,
    loading,
    statsLoading,
    stats,
    primary,
    primaryStats,
    aggregate,
    nextMaintenance,
    nextAppointment,
    healthScore,
    healthCopy,
    criticalCount,
    overdueCount,
    tripStats,
    expensesByCat,
    totalYtdPrimary,
    firstName,
    lastSyncLabel,
    createVehicle,
  } = data;

  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  // Visor 3D — montaje diferido hasta que la sección entra en viewport.
  const viewer3dRef = useRef<HTMLDivElement>(null);
  const [viewer3dInView, setViewer3dInView] = useState(false);

  useEffect(() => {
    const el = viewer3dRef.current;
    if (!el || viewer3dInView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setViewer3dInView(true);
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewer3dInView]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => setShowForm(true), []);

  const handleCreate = async (input: Parameters<typeof createVehicle>[0]) => {
    try {
      const v = await createVehicle(input);
      toast.success('Vehículo añadido');
      storeSet({ ...v, role: 'owner' });
      navigate('/car');
    } catch (err: unknown) {
      console.error('Error al crear vehículo:', err);
      toast.error(getErrorMessage(err, 'Error al crear vehículo'));
    }
  };

  const selectVehicle = useCallback(
    (vehicle: VehicleWithAccess) => {
      storeSet(vehicle);
      navigate('/car');
    },
    [navigate, storeSet],
  );

  const openPrimary = useCallback(() => {
    if (primary) selectVehicle(primary);
  }, [primary, selectVehicle]);

  // ─── Pasos de onboarding (necesitan navegación → viven en la página) ────────
  const onboardingSteps = useMemo(() => {
    if (!primary) return [];
    const records = primaryStats?.records ?? [];
    const documents = primaryStats?.documents ?? [];
    const expenses = primaryStats?.expenses ?? [];
    return [
      {
        id: 'mileage',
        label: 'Kilometraje base',
        detail: 'Define el km actual para que las alertas sean fiables.',
        done: primary.current_km > 0,
        actionLabel: 'Editar vehículo',
        onAction: openPrimary,
        icon: Gauge,
      },
      {
        id: 'maintenance',
        label: 'Primer mantenimiento',
        detail: 'Registra el último aceite o revisión para calcular próximos servicios.',
        done: records.length > 0,
        actionLabel: 'Añadir mantenimiento',
        onAction: () => navigate('/maintenance'),
        icon: Wrench,
      },
      {
        id: 'documents',
        label: 'Documentos clave',
        detail: 'Sube seguro, ITV o permiso para recibir avisos de vencimiento.',
        done: documents.length > 0,
        actionLabel: 'Subir documento',
        onAction: () => navigate('/documents'),
        icon: FileText,
      },
      {
        id: 'expenses',
        label: 'Primer gasto',
        detail: 'Añade combustible, seguro o reparación para medir el coste real.',
        done: expenses.length > 0,
        actionLabel: 'Añadir gasto',
        onAction: () => navigate('/expenses'),
        icon: Receipt,
      },
    ];
  }, [navigate, openPrimary, primary, primaryStats]);

  const alertCount = primaryStats?.alerts.length ?? 0;

  // ─── Tarjetas de estado/acción del vehículo principal ───────────────────────
  const actionCards = useMemo(
    () =>
      [
        {
          eyebrow: alertCount ? 'Atención inmediata' : 'Estado del coche',
          title: alertCount
            ? `${alertCount} alerta${alertCount === 1 ? '' : 's'} activa${alertCount === 1 ? '' : 's'}`
            : 'Sin alertas activas',
          body: alertCount
            ? 'Revisa vencimientos y mantenimientos antes de seguir sumando kilómetros.'
            : 'Añade una cita o consulta el historial para dejarlo al día.',
          cta: alertCount ? 'Revisar' : 'Ver historial',
          href: '/maintenance',
          tone: (alertCount ? 'urgent' : 'neutral') as 'urgent' | 'neutral',
        },
        {
          eyebrow: 'Siguiente servicio',
          title: nextMaintenance
            ? `${fmtN(nextMaintenance.kmRemaining)} km restantes`
            : 'Plan despejado',
          body: nextMaintenance
            ? `Programa ${nextMaintenance.label} antes de agotar el intervalo recomendado.`
            : 'No hay mantenimientos próximos calculados para este vehículo.',
          cta: nextMaintenance ? 'Programar' : 'Añadir servicio',
          href: '/maintenance',
          tone: (nextMaintenance ? 'warn' : 'neutral') as 'warn' | 'neutral',
        },
        {
          eyebrow: 'Coste real',
          title: fmtEur(totalYtdPrimary),
          body: 'Gasto por km, combustible, seguro y mantenimiento en una sola vista.',
          cta: 'Ver costes',
          href: '/coste',
          tone: 'neutral' as const,
        },
        {
          eyebrow: 'Taller',
          title: nextAppointment ? nextAppointment.dayLabel : 'Sin cita',
          body: nextAppointment
            ? `${nextAppointment.type} a las ${nextAppointment.time}.`
            : 'Comparte el estado del vehículo con un taller o crea una cita.',
          cta: nextAppointment ? 'Ver cita' : 'Compartir',
          href: nextAppointment ? '/maintenance' : '/sharing',
          tone: 'neutral' as const,
        },
      ] as const,
    [alertCount, nextMaintenance, nextAppointment, totalYtdPrimary],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter min-h-screen bg-[#0a0b12] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-6 lg:px-8 lg:py-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DashboardHeader
          firstName={firstName}
          lastSyncLabel={lastSyncLabel}
          vehicles={vehicles}
          primary={primary}
          onSelectVehicle={selectVehicle}
          onAddVehicle={handleAdd}
        />

        {/* ── Banner de urgencia (solo si hay algo crítico) ──────────────── */}
        <UrgentBanner
          criticalCount={criticalCount}
          overdueCount={overdueCount}
          onReview={() => navigate('/maintenance')}
        />

        {/* ── KPIs de flota ──────────────────────────────────────────────── */}
        <section
          aria-label="Indicadores de flota"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <KpiTile
            icon={Gauge}
            label="Km totales"
            value={fmtN(aggregate.totalKm)}
            hint="Flota completa"
            tone="brand"
            loading={statsLoading}
          />
          <KpiTile
            icon={Wrench}
            label="Mantenimientos"
            value={String(aggregate.totalRecords)}
            hint="Histórico"
            loading={statsLoading}
          />
          <KpiTile
            icon={Wallet}
            label={`Gasto ${aggregate.ytd}`}
            value={fmtEur(aggregate.totalSpentYtd)}
            hint="Año en curso"
            tone="success"
            loading={statsLoading}
          />
          <KpiTile
            icon={AlertTriangle}
            label="Alertas"
            value={String(aggregate.totalAlerts)}
            hint="Requieren atención"
            tone={aggregate.totalAlerts > 0 ? 'danger' : 'neutral'}
            loading={statsLoading}
          />
        </section>

        {/* ── Cuerpo principal ───────────────────────────────────────────── */}
        {!primary ? (
          loading ? (
            <HeroSkeleton />
          ) : (
            <EmptyGarage onAdd={handleAdd} />
          )
        ) : (
          <>
            {/* Estado actual destacado: spotlight + tarjetas de acción */}
            <section
              aria-label="Estado del vehículo"
              className="grid gap-4 lg:grid-cols-[1.35fr_1fr]"
            >
              <VehicleSpotlight
                vehicle={primary}
                alertCount={alertCount}
                healthScore={healthScore}
                healthCopy={healthCopy}
                onOpen={openPrimary}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {actionCards.map((c) => (
                  <ActionCard
                    key={`${c.eyebrow}-${c.href}`}
                    eyebrow={c.eyebrow}
                    title={c.title}
                    body={c.body}
                    cta={c.cta}
                    tone={c.tone}
                    onClick={() => navigate(c.href)}
                  />
                ))}
              </div>
            </section>

            {/* Accesos rápidos */}
            <QuickActions onNavigate={navigate} />

            {/* Puesta a punto (se auto-oculta cuando está completa) */}
            <OnboardingChecklist steps={onboardingSteps} />

            {/* Centro de alertas */}
            {alertCount > 0 && <AlertCenter alerts={primaryStats!.alerts} onNavigate={navigate} />}

            {/* Aniversario de viaje (si aplica) */}
            {primaryStats?.trips && primaryStats.trips.length > 0 && (
              <TripAnniversaryBanner trips={primaryStats.trips} />
            )}

            {/* Análisis: uso + gasto */}
            <section aria-label="Análisis" className="grid gap-4 lg:grid-cols-2">
              <UsageSparkline
                dailyKm={tripStats.dailyKm}
                axisDates={tripStats.axisDates}
                thisMonthKm={tripStats.thisMonthKm}
                avgPerDay={tripStats.avgPerDay}
                pctVsAvg={tripStats.pctVsAvg}
                moreOrLess={tripStats.moreOrLess}
              />
              <ExpenseBreakdown
                data={expensesByCat}
                total={totalYtdPrimary}
                year={aggregate.ytd}
                onDetail={() => navigate('/coste')}
              />
            </section>
          </>
        )}

        {/* ── Flota registrada ───────────────────────────────────────────── */}
        <FleetGrid
          vehicles={vehicles}
          stats={stats}
          primaryId={primary?.id}
          onSelect={selectVehicle}
        />

        {/* ── Visor 3D (lazy, fuera del bundle inicial) ──────────────────── */}
        <section ref={viewer3dRef} aria-label="Visor 3D del vehículo">
          <div className="mb-3 flex items-center gap-2">
            <Route className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
            <span className={EYEBROW}>Vista 3D</span>
          </div>
          {viewer3dInView ? (
            <Suspense fallback={<Viewer3dSkeleton />}>
              <FordFocusModel3D className="overflow-hidden rounded-2xl" />
            </Suspense>
          ) : (
            <Viewer3dSkeleton />
          )}
        </section>
      </div>

      {showForm && <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────
const HeroSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
    <div className={`${CARD} h-80 animate-pulse`} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${CARD} h-40 animate-pulse`} />
      ))}
    </div>
  </div>
);

const Viewer3dSkeleton = () => (
  <div
    aria-hidden="true"
    className={`${CARD} animate-pulse`}
    style={{ minHeight: 'clamp(420px, 52vw, 700px)' }}
  />
);
