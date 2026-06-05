import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Calendar, Plus } from 'lucide-react';
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
import { fmtN } from '../components/dashboard/format';
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

  // Tarjeta 3 (próximo servicio): prioriza cita con fecha, si no km restantes.
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

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        {/* Barra de utilidad: añadir vehículo */}
        <div className="mb-8 flex justify-end sm:mb-10">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
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
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section
              aria-label="Vehículo principal"
              className="grid grid-cols-1 items-center gap-8 md:grid-cols-2"
            >
              <div className="order-2 md:order-1">
                <h1 className="font-semibold leading-[0.92] tracking-tight text-black text-5xl sm:text-6xl lg:text-7xl">
                  {primary.year} {primary.brand}
                  <br />
                  {primary.model}
                </h1>
                <p className="mt-4 text-base text-zinc-500">{heroStatus}</p>
              </div>
              <div className="order-1 flex justify-center md:order-2 md:justify-end">
                <img
                  src="/ford-focus.png"
                  alt={`${primary.brand} ${primary.model}`}
                  className="w-full max-w-xl object-contain"
                />
              </div>
            </section>

            {/* ── KPIs ──────────────────────────────────────────────────── */}
            <section
              aria-label="Métricas principales"
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
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
              <h2 className="mb-5 text-xl font-semibold tracking-tight text-black sm:text-2xl">
                Vista 3D
              </h2>
              {viewer3dInView ? (
                <Suspense fallback={<Viewer3dSkeleton />}>
                  <FordFocusModel3D className="overflow-hidden rounded-2xl border border-black" />
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

// ─── Skeletons (B&W) ──────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-12">
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
      <div className="h-32 w-3/4 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border border-black bg-white" />
      ))}
    </div>
  </div>
);

const Viewer3dSkeleton = () => (
  <div
    aria-hidden="true"
    className="animate-pulse rounded-2xl border border-black bg-white"
    style={{ minHeight: 'clamp(420px, 52vw, 700px)' }}
  />
);
