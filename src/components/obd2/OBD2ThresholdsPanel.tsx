import { useMemo, useState } from 'react';
import { Sliders, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_VEHICLE_THRESHOLDS, type VehicleThresholds } from '../../types';
import { useOBD2ThresholdsStore } from '../../store/obd2ThresholdsStore';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface Props {
  vehicleId: string;
}

interface FieldDef {
  key: keyof VehicleThresholds;
  label: string;
  unit: string;
  /** Si es true, una lectura `<= threshold` dispara la alerta; si false, `>=`. */
  inverse?: boolean;
  /** Step para el input numérico. */
  step?: number;
  /** Categoría para agrupar en la UI. */
  group: 'engine' | 'electrical' | 'fuel';
  /** Texto auxiliar mostrado bajo el campo. */
  hint?: string;
}

const FIELDS: FieldDef[] = [
  {
    key: 'coolantTempWarn',
    label: 'Temp. refrigerante — Aviso',
    unit: '°C',
    group: 'engine',
    hint: 'Por encima de este valor se muestra advertencia',
  },
  {
    key: 'coolantTempCritical',
    label: 'Temp. refrigerante — Crítico',
    unit: '°C',
    group: 'engine',
    hint: 'Sobrecalentamiento del motor',
  },
  {
    key: 'oilPressureWarn',
    label: 'Presión aceite — Aviso',
    unit: 'kPa',
    inverse: true,
    group: 'engine',
    hint: 'Por debajo de este valor se muestra advertencia',
  },
  {
    key: 'oilPressureCritical',
    label: 'Presión aceite — Crítico',
    unit: 'kPa',
    inverse: true,
    group: 'engine',
    hint: 'Presión peligrosamente baja',
  },
  {
    key: 'rpmWarn',
    label: 'RPM máximas',
    unit: 'rev/min',
    step: 100,
    group: 'engine',
    hint: 'Avisa si las RPM superan este valor',
  },
  {
    key: 'engineLoadCritical',
    label: 'Carga del motor — Crítico',
    unit: '%',
    group: 'engine',
  },
  {
    key: 'batteryVoltageWarn',
    label: 'Batería — Aviso',
    unit: 'V',
    inverse: true,
    step: 0.1,
    group: 'electrical',
    hint: 'Voltaje bajo, posible problema',
  },
  {
    key: 'batteryVoltageCritical',
    label: 'Batería — Crítico',
    unit: 'V',
    inverse: true,
    step: 0.1,
    group: 'electrical',
    hint: 'Voltaje crítico, no arrancará pronto',
  },
  {
    key: 'fuelLevelCritical',
    label: 'Combustible — Crítico',
    unit: '%',
    inverse: true,
    group: 'fuel',
    hint: 'Reserva en zona de peligro',
  },
];

const GROUP_LABELS: Record<FieldDef['group'], string> = {
  engine: 'Motor',
  electrical: 'Eléctrico',
  fuel: 'Combustible',
};

export const OBD2ThresholdsPanel = ({ vehicleId }: Props) => {
  const [expanded, setExpanded] = useState(false);
  // IMPORTANTE: el selector devuelve el partial bruto del store (referencia
  // estable) y la fusión con defaults va en useMemo. Si la fusión se hace
  // dentro del selector, devolvería un objeto nuevo en cada render y
  // dispararía un bucle infinito.
  const partial = useOBD2ThresholdsStore((s) => s.byVehicle[vehicleId]);
  const setFor = useOBD2ThresholdsStore((s) => s.setFor);
  const resetFor = useOBD2ThresholdsStore((s) => s.resetFor);
  const thresholds = useMemo<VehicleThresholds>(
    () => ({ ...DEFAULT_VEHICLE_THRESHOLDS, ...(partial ?? {}) }),
    [partial],
  );

  const handleChange = (key: keyof VehicleThresholds, value: string) => {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return;
    setFor(vehicleId, { [key]: num });
  };

  const handleReset = () => {
    resetFor(vehicleId);
    toast.success('Umbrales restablecidos a los valores por defecto');
  };

  const hasOverrides = (
    Object.keys(DEFAULT_VEHICLE_THRESHOLDS) as Array<keyof VehicleThresholds>
  ).some((k) => thresholds[k] !== DEFAULT_VEHICLE_THRESHOLDS[k]);

  return (
    <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full gap-3"
      >
        <div className="flex items-center gap-3">
          <Sliders className="h-4 w-4 text-graphite" strokeWidth={1.7} />
          <h2
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            Umbrales de anomalías
          </h2>
          {hasOverrides && (
            <span
              className="font-mono uppercase rounded-full px-2 py-0.5"
              style={{
                fontSize: 9,
                letterSpacing: '0.1em',
                background: '#e3f0e3',
                color: '#2f6b34',
              }}
            >
              Personalizado
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-graphite" strokeWidth={1.7} />
        ) : (
          <ChevronDown className="h-4 w-4 text-graphite" strokeWidth={1.7} />
        )}
      </button>

      {expanded && (
        <>
          <p className="font-text text-graphite" style={{ fontSize: 13 }}>
            Ajusta los valores a los rangos normales de tu vehículo. Se guardan localmente por
            vehículo. La detección de anomalías usará estos umbrales en cada lectura.
          </p>

          {(['engine', 'electrical', 'fuel'] as const).map((group) => (
            <div key={group} className="space-y-3">
              <h3
                className="font-mono uppercase text-graphite"
                style={{ fontSize: 10, letterSpacing: '0.12em' }}
              >
                {GROUP_LABELS[group]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELDS.filter((f) => f.group === group).map((f) => (
                  <div key={f.key} className="bg-fog rounded-[16px] p-4">
                    <label
                      htmlFor={`th-${f.key}`}
                      className="font-mono uppercase text-graphite block mb-1.5"
                      style={{ fontSize: 9, letterSpacing: '0.1em' }}
                    >
                      {f.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`th-${f.key}`}
                        type="number"
                        step={f.step ?? 1}
                        value={thresholds[f.key]}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className="bg-snow rounded-[10px] px-3 py-2 w-full tabular-nums font-text text-ink"
                        style={{ fontSize: 15 }}
                      />
                      <span
                        className="font-text text-graphite"
                        style={{ fontSize: 12, minWidth: 50 }}
                      >
                        {f.unit}
                      </span>
                    </div>
                    {f.hint && (
                      <p className="font-text text-graphite mt-1.5" style={{ fontSize: 11 }}>
                        {f.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasOverrides && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                iconLeft={<RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />}
              >
                Restablecer valores
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
