import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Wrench, Sparkles, MapPin, Phone, Globe, Navigation, AlertTriangle, KeyRound,
  ChevronRight,
} from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useSettingsStore } from '../store/settingsStore';
import { useMechanicsStore } from '../store/mechanicsStore';
import { useMechanicRatingsStore } from '../store/mechanicRatingsStore';
import { maintenanceService } from '../services/maintenance.service';
import { mechanicsService } from '../services/mechanics.service';
import { claudeService } from '../services/claude.service';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FloatingTextarea } from '../components/ui/FloatingInput';
import { MechanicsMap } from '../components/mechanics/MechanicsMap';
import type { Mechanic, AlertSeverity } from '../types';
import toast from 'react-hot-toast';

const URGENCY: Record<AlertSeverity, { label: string; bg: string; fg: string }> = {
  high:   { label: 'Urgente',   bg: '#fce8e0', fg: '#b64400' },
  medium: { label: 'Moderado',  bg: '#fdf1d9', fg: '#9a6700' },
  low:    { label: 'Sin prisa', bg: '#e3f0e3', fg: '#2f6b34' },
};

export const MechanicsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { anthropicApiKey } = useSettingsStore();
  const {
    symptom, origin, mechanics, diagnosis, selectedId,
    setSymptom, setSearchResult, setSelectedId,
  } = useMechanicsStore();
  const { ratings } = useMechanicRatingsStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!selectedVehicle) {
    return (
      <div className="px-6 sm:px-10 py-16">
        <EmptyState
          icon={Car}
          title="Selecciona un vehículo"
          description="Elige un vehículo desde el Dashboard para buscar talleres."
          action={
            <Button variant="accent" onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const recommendedIds = diagnosis?.recommendations.map((r) => r.mechanicId) ?? [];
  const mechanicById = (id: string) => mechanics.find((m) => m.id === id);

  const openDetail = (id: string) => {
    setSelectedId(id);
    navigate('/mechanics/detail');
  };

  const handleDiagnose = async () => {
    if (!anthropicApiKey) {
      toast.error('Configura tu API key de Claude en Ajustes');
      return;
    }
    if (symptom.trim().length < 8) {
      toast.error('Describe el problema con un poco más de detalle');
      return;
    }

    setLoading(true);
    setSearchResult({ origin: null, mechanics: [], diagnosis: null });
    setSelectedId(undefined);
    try {
      setStatusMsg('Obteniendo tu ubicación…');
      const loc = await mechanicsService.getCurrentLocation();

      setStatusMsg('Buscando talleres cercanos…');
      const found = await mechanicsService.findNearby(loc.lat, loc.lng);
      if (found.length === 0) {
        setSearchResult({ origin: loc, mechanics: [], diagnosis: null });
        toast.error('No se encontraron talleres en 15 km a la redonda');
        return;
      }

      setStatusMsg('Cargando historial del vehículo…');
      const records = await maintenanceService.getByVehicle(selectedVehicle.id).catch(() => []);

      setStatusMsg('Claude está analizando el problema…');
      const result = await claudeService.diagnose({
        apiKey: anthropicApiKey,
        vehicle: selectedVehicle,
        records,
        symptom: symptom.trim(),
        mechanics: found,
      });
      setSearchResult({ origin: loc, mechanics: found, diagnosis: result });
      toast.success('Diagnóstico listo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Algo salió mal');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="px-6 sm:px-10 py-10 space-y-8">
      <header>
        <span className="eyebrow">
          {selectedVehicle.brand} {selectedVehicle.model}
          {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
        </span>
        <h1
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 'clamp(40px, 6vw, 56px)',
            lineHeight: 1.07,
            letterSpacing: '-0.9px',
            margin: '12px 0 0',
          }}
        >
          Talleres IA.
        </h1>
        <p className="font-text text-graphite mt-3 max-w-xl" style={{ fontSize: 15, lineHeight: 1.45 }}>
          Describe qué le pasa a tu coche. Claude analiza el historial y te recomienda
          los talleres más adecuados cerca de ti.
        </p>
      </header>

      {/* API key warning */}
      {!anthropicApiKey && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-graphite" strokeWidth={1.6} />
            </div>
            <div className="flex-1">
              <h3
                className="font-display text-ink"
                style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
              >
                Falta tu API key de Claude
              </h3>
              <p
                className="font-text text-graphite mt-2 mb-4 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Esta función usa la API de Anthropic. Añade tu clave en Ajustes para
                activar el diagnóstico inteligente.
              </p>
              <Button variant="accent" size="sm" onClick={() => navigate('/settings')}>
                Ir a Ajustes
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Symptom form */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2
          className="font-mono uppercase text-graphite mb-4"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          ¿Qué le pasa al coche?
        </h2>
        <FloatingTextarea
          label="Describe el síntoma"
          hint="Ej: hace un ruido metálico al frenar, sobre todo en frío"
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          disabled={loading}
        />
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <Button
            variant="accent"
            onClick={handleDiagnose}
            loading={loading}
            disabled={!anthropicApiKey}
            iconLeft={!loading ? <Sparkles className="h-4 w-4" strokeWidth={1.8} /> : undefined}
          >
            Diagnosticar y buscar talleres
          </Button>
          {loading && statusMsg && (
            <span className="font-text text-graphite" style={{ fontSize: 14 }}>
              {statusMsg}
            </span>
          )}
        </div>
      </section>

      {/* Diagnosis result */}
      {diagnosis && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" style={{ color: URGENCY[diagnosis.urgency].fg }} strokeWidth={1.7} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="font-display text-ink"
                  style={{ fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.3px' }}
                >
                  Diagnóstico
                </h2>
                <span
                  className="font-mono uppercase rounded-full px-3 py-1"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    background: URGENCY[diagnosis.urgency].bg,
                    color: URGENCY[diagnosis.urgency].fg,
                  }}
                >
                  {URGENCY[diagnosis.urgency].label}
                </span>
              </div>
              <p className="font-text text-ink mt-2" style={{ fontSize: 15, lineHeight: 1.5 }}>
                {diagnosis.summary}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-fog rounded-[14px] px-4 py-3">
              <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                Causa probable
              </p>
              <p className="font-text text-ink mt-1.5" style={{ fontSize: 14, lineHeight: 1.4 }}>
                {diagnosis.likelyCause}
              </p>
            </div>
            <div className="bg-fog rounded-[14px] px-4 py-3">
              <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                Servicio estimado
              </p>
              <p className="font-text text-ink mt-1.5" style={{ fontSize: 14, lineHeight: 1.4 }}>
                {diagnosis.estimatedService}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Map + mechanics list */}
      {mechanics.length > 0 && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
          <h2
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            {mechanics.length} talleres cerca de ti
          </h2>

          <MechanicsMap
            origin={origin}
            mechanics={mechanics}
            recommendedIds={recommendedIds}
            selectedId={selectedId}
            onMechanicClick={openDetail}
            style={{ minHeight: 360 }}
          />

          {/* Recommended first */}
          {diagnosis && diagnosis.recommendations.length > 0 && (
            <div className="space-y-3">
              <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                Recomendados por Claude
              </p>
              {diagnosis.recommendations.map((rec, i) => {
                const m = mechanicById(rec.mechanicId);
                if (!m) return null;
                return (
                  <button
                    key={rec.mechanicId}
                    onClick={() => openDetail(m.id)}
                    className="w-full text-left rounded-[18px] p-4 transition-colors"
                    style={{ border: '1px solid var(--color-silver-mist)', background: 'var(--color-snow)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="h-7 w-7 rounded-full flex items-center justify-center font-text font-semibold shrink-0"
                        style={{ background: '#b64400', color: '#fff', fontSize: 13 }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-text text-ink font-semibold" style={{ fontSize: 15 }}>
                          {m.name}
                        </p>
                        <p className="font-text text-graphite mt-0.5" style={{ fontSize: 13 }}>
                          {m.distanceKm.toFixed(1)} km
                          {m.brand ? ` · Especialista ${m.brand}` : ''}
                        </p>
                        <p className="font-text text-ink mt-2" style={{ fontSize: 13, lineHeight: 1.45 }}>
                          {rec.reason}
                        </p>
                        <MechanicLinks mechanic={m} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-graphite shrink-0 mt-1" strokeWidth={1.7} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* All mechanics */}
          <div className="space-y-2">
            <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
              Todos los talleres
            </p>
            {mechanics.map((m) => (
              <button
                key={m.id}
                onClick={() => openDetail(m.id)}
                className="w-full text-left rounded-[14px] px-4 py-3 transition-colors hover:bg-fog"
                style={{ border: '1px solid var(--color-silver-mist)', background: 'var(--color-fog)' }}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-graphite shrink-0" strokeWidth={1.6} />
                  <div className="flex-1 min-w-0">
                    <p className="font-text text-ink font-medium truncate" style={{ fontSize: 14 }}>
                      {m.name}
                    </p>
                    {m.address && (
                      <p className="font-text text-graphite truncate" style={{ fontSize: 12 }}>
                        {m.address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ratings[m.id]?.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5" style={{ color: '#f5a623' }}>
                        {'★'.repeat(ratings[m.id].rating)}
                      </span>
                    )}
                    <span className="font-text text-graphite tabular-nums" style={{ fontSize: 13 }}>
                      {m.distanceKm.toFixed(1)} km
                    </span>
                    <ChevronRight className="h-4 w-4 text-graphite" strokeWidth={1.7} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const MechanicLinks = ({ mechanic }: { mechanic: Mechanic }) => {
  const items: { icon: typeof Phone; label: string; href: string }[] = [];
  if (mechanic.phone) {
    items.push({ icon: Phone, label: mechanic.phone, href: `tel:${mechanic.phone}` });
  }
  if (mechanic.website) {
    items.push({ icon: Globe, label: 'Web', href: mechanic.website });
  }
  items.push({
    icon: Navigation,
    label: 'Cómo llegar',
    href: `https://www.openstreetmap.org/directions?to=${mechanic.lat},${mechanic.lng}`,
  });
  if (mechanic.address) {
    items.unshift({ icon: MapPin, label: mechanic.address, href: '' });
  }

  return (
    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
      {items.map((it, idx) =>
        it.href ? (
          <a
            key={idx}
            href={it.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 font-text text-azure"
            style={{ fontSize: 12.5 }}
          >
            <it.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
            {it.label}
          </a>
        ) : (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 font-text text-graphite"
            style={{ fontSize: 12.5 }}
          >
            <it.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
            {it.label}
          </span>
        ),
      )}
    </div>
  );
};
