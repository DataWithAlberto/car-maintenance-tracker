import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Calendar, CalendarClock, Plus, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

import { useVehicleStore } from '../store/vehicleStore';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { getErrorMessage } from '../utils/errors';

import { useDashboardData } from '../components/dashboard/useDashboardData';
import { MetricCard } from '../components/dashboard/MetricCard';
import { UpcomingMaintenance } from '../components/dashboard/UpcomingMaintenance';
import { HealthRing } from '../components/dashboard/HealthRing';
import { FleetGrid } from '../components/dashboard/FleetGrid';
import { EmptyGarage } from '../components/dashboard/EmptyGarage';
import { FOCUS_RING } from '../components/dashboard/styles';
import { fmtN, fmtEur } from '../components/dashboard/format';
import type { VehicleWithAccess } from '../types';

// Visor 3D — carga diferida: mantiene el bundle de Three.js fuera del chunk
// inicial del dashboard.
const FordFocusModel3D = lazy(() =>
  import('../components/3d/FordFocusModel3D').then((m) => ({ default: m.FordFocusModel3D })),
);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DashboardPage = () => {
  const {
    vehicles,
    loading,
    statsLoading,
    stats,
    primary,
    healthScore,
    healthCopy,
    nextMaintenance,
    nextAppointment,
    tripStats,
    upcomingMaintenance,
    nextDocExpiry,
    totalYtdPrimary,
    createVehicle,
  } = useDashboardData();

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

  // ─── Copys derivados del vehículo principal ─────────────────────────────────
  const heroStatus = useMemo(() => {
    if (!primary) return '';
    return [primary.fuel_type, primary.license_plate, cap(healthCopy)].filter(Boolean).join(' · ');
  }, [primary, healthCopy]);

  // Tarjeta "Próximo servicio": prioriza cita con fecha, si no km restantes.
  const nextService = useMemo(() => {
    if (nextAppointment) {
      return {
        value: cap(nextAppointment.dayLabel),
        sub: `${nextAppointment.type} · ${nextAppointment.time}`,
      };
    }
    if (nextMaintenance) {
      return { value: `${fmtN(nextMaintenance.kmRemaining)} km`, sub: cap(nextMaintenance.label) };
    }
    return { value: 'Al día', sub: 'Sin servicios pendientes' };
  }, [nextAppointment, nextMaintenance]);

  const efficiencySub =
    tripStats.pctVsAvg > 0
      ? `${tripStats.pctVsAvg}% ${tripStats.moreOrLess} que tu media`
      : 'Conducción registrada';

  // Tarjeta "Próximo vencimiento" (ITV / seguro / permiso).
  const docValue = !nextDocExpiry
    ? 'Sin vencimientos'
    : nextDocExpiry.days < 0
      ? 'Vencido'
      : nextDocExpiry.days === 0
        ? 'Hoy'
        : `${nextDocExpiry.days} día${nextDocExpiry.days === 1 ? '' : 's'}`;
  const docSub = nextDocExpiry
    ? `${nextDocExpiry.docType} · ${nextDocExpiry.dateLabel}`
    : 'Sube tu ITV o seguro';

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter min-h-screen bg-fog text-ink">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        {/* Barra de utilidad: añadir vehículo */}
        <div className="mb-8 flex justify-end sm:mb-10">
          <button
            type="button"
            onClick={handleAdd}
            className={`${FOCUS_RING} inline-flex items-center gap-2 rounded-full border border-ink bg-snow px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-ink hover:text-snow`}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Añadir vehículo
          </button>
        </div>

        {!primary ? (
          loading ? (
            <DashboardSkeleton />
          ) : (
            <EmptyGarage onAdd={handleAdd} />
          )
        ) : (
          <div className="flex flex-col gap-12 sm:gap-16">
            {/* ── Hero (clicable → detalle del vehículo) ─────────────────── */}
            <button
              type="button"
              onClick={openPrimary}
              aria-label={`Abrir ${primary.brand} ${primary.model}`}
              className={`${FOCUS_RING} group grid grid-cols-1 items-center gap-8 rounded-2xl text-left md:grid-cols-2`}
            >
              <div className="order-2 md:order-1">
                <h1 className="font-semibold leading-[0.92] tracking-tight text-ink text-5xl sm:text-6xl lg:text-7xl">
                  {primary.year} {primary.brand}
                  <br />
                  {primary.model}
                </h1>
                <p className="mt-4 text-base text-graphite">{heroStatus}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-[gap] duration-200 group-hover:gap-3">
                  Ver vehículo
                  <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </span>
              </div>
              <div className="order-1 flex justify-center md:order-2 md:justify-end">
                <img
                  src="/ford-focus.png"
                  alt={`${primary.brand} ${primary.model}`}
                  className="w-full max-w-xl object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </button>

            {/* ── Métricas ──────────────────────────────────────────────── */}
            <section
              aria-label="Métricas principales"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <MetricCard
                label="Salud del vehículo"
                value={`${healthScore}%`}
                sub={cap(healthCopy)}
                ring={<HealthRing score={healthScore} size={92} stroke={6} />}
                loading={statsLoading}
                onClick={openPrimary}
              />
              <MetricCard
                label="Uso este mes"
                value={`${fmtN(tripStats.thisMonthKm)} km`}
                sub={efficiencySub}
                icon={<ArrowUpRight className="h-5 w-5" strokeWidth={1.8} />}
                loading={statsLoading}
                onClick={() => navigate('/trips')}
              />
              <MetricCard
                label="Próximo servicio"
                value={nextService.value}
                sub={nextService.sub}
                icon={<Calendar className="h-5 w-5" strokeWidth={1.8} />}
                loading={statsLoading}
                onClick={() => navigate('/maintenance')}
              />
              <MetricCard
                label="Coste real (año)"
                value={fmtEur(totalYtdPrimary)}
                sub="Combustible, mantenimiento y seguro"
                icon={<Wallet className="h-5 w-5" strokeWidth={1.8} />}
                loading={statsLoading}
                onClick={() => navigate('/coste')}
              />
              <MetricCard
                label="Próximo vencimiento"
                value={docValue}
                sub={docSub}
                icon={<CalendarClock className="h-5 w-5" strokeWidth={1.8} />}
                loading={statsLoading}
                onClick={() => navigate('/documents')}
              />
            </section>

            {/* ── Próximos mantenimientos ───────────────────────────────── */}
            <UpcomingMaintenance
              items={upcomingMaintenance}
              onSelect={() => navigate('/maintenance')}
            />

            {/* ── Flota (solo con varios vehículos) ─────────────────────── */}
            {vehicles.length > 1 && (
              <FleetGrid
                vehicles={vehicles}
                stats={stats}
                primaryId={primary.id}
                onSelect={selectVehicle}
              />
            )}

            {/* ── Visor 3D (lazy, fuera del bundle inicial) ─────────────── */}
            <section ref={viewer3dRef} aria-label="Visor 3D del vehículo">
              <h2 className="mb-5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                Vista 3D
              </h2>
              {viewer3dInView ? (
                <Suspense fallback={<Viewer3dSkeleton />}>
                  <FordFocusModel3D className="overflow-hidden rounded-2xl border border-ink" />
                </Suspense>
              ) : (
                <Viewer3dSkeleton />
              )}
            </section>
          </div>
        )}
      </div>

      {showForm && <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
};

// ─── Skeletons (theme-aware) ──────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-12">
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
      <div className="skeleton h-32 w-3/4 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-40 rounded-2xl border border-ink" />
      ))}
    </div>
  </div>
);

const Viewer3dSkeleton = () => (
  <div
    aria-hidden="true"
    className="skeleton rounded-2xl border border-ink"
    style={{ minHeight: 'clamp(420px, 52vw, 700px)' }}
  />
);
