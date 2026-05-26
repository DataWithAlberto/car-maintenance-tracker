import { useMemo } from 'react';
import { Cpu, Battery, Thermometer, Fuel, Gauge, Camera, X } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOBD2Store } from '../../store/obd2Store';
import { useTripOBD2SnapshotsStore } from '../../store/tripOBD2SnapshotsStore';
import { Button } from '../ui/Button';
import type { TripOBD2Snapshot } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  tripId: string;
  label?: TripOBD2Snapshot['label'];
}

const Stat = ({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: typeof Battery;
  label: string;
  value: number | null;
  unit: string;
  color: string;
}) => (
  <div
    className="bg-fog"
    style={{
      borderRadius: 14,
      padding: '10px 12px',
    }}
  >
    <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
      <span
        className="rounded-full"
        style={{ width: 5, height: 5, background: color, flexShrink: 0 }}
      />
      <span
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 9, letterSpacing: '.12em' }}
      >
        {label}
      </span>
      <Icon className="h-3 w-3 text-graphite ml-auto" strokeWidth={1.6} />
    </div>
    <p
      className="text-ink tabular-nums"
      style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px' }}
    >
      {value != null ? (Number.isInteger(value) ? value : value.toFixed(1)) : '—'}
      <span className="text-mist" style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>
        {unit}
      </span>
    </p>
  </div>
);

export const TripOBD2SnapshotCard = ({ tripId, label = 'start' }: Props) => {
  const liveData = useOBD2Store((s) => s.liveData);
  const status = useOBD2Store((s) => s.status);
  const snapshot = useTripOBD2SnapshotsStore((s) => s.getLatest(tripId, label));
  const capture = useTripOBD2SnapshotsStore((s) => s.capture);
  const clear = useTripOBD2SnapshotsStore((s) => s.clear);

  const isConnected = status === 'connected';
  const canCapture =
    isConnected &&
    (liveData.odometer != null ||
      liveData.fuelLevel != null ||
      liveData.batteryVoltage != null ||
      liveData.coolantTemp != null);

  const handleCapture = () => {
    if (!canCapture) {
      toast.error('Conecta el OBD2 y haz una lectura primero');
      return;
    }
    capture(tripId, {
      captured_at: new Date().toISOString(),
      odometer: liveData.odometer,
      fuel_level: liveData.fuelLevel,
      battery_voltage: liveData.batteryVoltage,
      coolant_temp: liveData.coolantTemp,
      engine_runtime: liveData.engineRuntime,
      rpm: liveData.rpm,
      speed: liveData.speed,
      label,
    });
    toast.success('Snapshot OBD2 capturado');
  };

  const handleClear = () => {
    clear(tripId);
    toast.success('Snapshots eliminados');
  };

  const subtitle = useMemo(() => {
    if (!snapshot) return null;
    try {
      return formatDistanceToNow(parseISO(snapshot.captured_at), {
        locale: es,
        addSuffix: true,
      });
    } catch {
      return null;
    }
  }, [snapshot]);

  return (
    <div
      className="bg-snow"
      style={{
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 24,
        padding: '20px 22px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 14 }}>
        <span
          className="font-mono uppercase text-graphite inline-flex items-center"
          style={{ fontSize: 10, letterSpacing: '.16em', gap: 6 }}
        >
          <Cpu className="h-3 w-3" strokeWidth={1.6} />
          Snapshot OBD2
        </span>
        {snapshot && (
          <button
            onClick={handleClear}
            className="text-graphite hover:text-ink transition-colors"
            title="Borrar snapshot"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        )}
      </div>

      {snapshot ? (
        <>
          <p className="text-mist font-mono" style={{ fontSize: 10, marginBottom: 10 }}>
            Capturado {subtitle}
          </p>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <Stat
              icon={Gauge}
              label="Odómetro"
              value={snapshot.odometer}
              unit="km"
              color="#0071e3"
            />
            <Stat
              icon={Fuel}
              label="Combustible"
              value={snapshot.fuel_level}
              unit="%"
              color="#ff9f0a"
            />
            <Stat
              icon={Battery}
              label="Batería"
              value={snapshot.battery_voltage}
              unit="V"
              color="#34c759"
            />
            <Stat
              icon={Thermometer}
              label="Refrigerante"
              value={snapshot.coolant_temp}
              unit="°C"
              color="#ff453a"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCapture}
            disabled={!canCapture}
            iconLeft={<Camera className="h-3.5 w-3.5" strokeWidth={1.7} />}
            style={{ marginTop: 12, width: '100%' }}
          >
            Recapturar
          </Button>
        </>
      ) : (
        <>
          <p className="text-graphite" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
            Conecta tu OBD2 antes del viaje para guardar el estado del vehículo (km, combustible,
            batería, temperatura) como punto de partida.
          </p>
          <Button
            variant="accent"
            size="sm"
            onClick={handleCapture}
            disabled={!canCapture}
            iconLeft={<Camera className="h-3.5 w-3.5" strokeWidth={1.7} />}
            style={{ width: '100%' }}
          >
            {isConnected ? 'Capturar ahora' : 'OBD2 no conectado'}
          </Button>
        </>
      )}
    </div>
  );
};
