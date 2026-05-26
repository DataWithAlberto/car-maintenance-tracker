import { Car, Gauge, Fuel } from 'lucide-react';
import type { Vehicle } from '../../types';

interface Props {
  vehicle: Vehicle | null;
}

const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export const TripVehicleSummaryCard = ({ vehicle }: Props) => {
  if (!vehicle) {
    return (
      <div
        className="bg-snow"
        style={{
          border: '1px dashed var(--color-silver-mist)',
          borderRadius: 24,
          padding: '20px 22px',
          textAlign: 'center',
        }}
      >
        <p className="text-graphite" style={{ fontSize: 13 }}>
          Sin vehículo asignado
        </p>
      </div>
    );
  }

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
      <span
        className="font-mono uppercase text-graphite inline-flex items-center"
        style={{ fontSize: 10, letterSpacing: '.16em', gap: 6 }}
      >
        <Car className="h-3 w-3" strokeWidth={1.6} />
        Vehículo asignado
      </span>

      <div className="flex items-center" style={{ gap: 12, marginTop: 14 }}>
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'var(--color-fog)',
            border: '1px solid var(--color-silver-mist)',
            flexShrink: 0,
          }}
        >
          <Car className="h-5 w-5 text-ink" strokeWidth={1.6} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '-0.2px',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {vehicle.brand} {vehicle.model}
          </p>
          <p className="text-graphite font-mono" style={{ fontSize: 11, marginTop: 2 }}>
            {vehicle.year} · {vehicle.license_plate ?? '— —'}
          </p>
        </div>
      </div>

      <dl
        className="grid grid-cols-2"
        style={{
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--color-silver-mist)',
        }}
      >
        <div>
          <dt
            className="font-mono uppercase text-mist inline-flex items-center"
            style={{ fontSize: 9, letterSpacing: '.16em', gap: 4 }}
          >
            <Gauge className="h-3 w-3" strokeWidth={1.6} />
            Odómetro
          </dt>
          <dd
            className="text-ink tabular-nums"
            style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}
          >
            {nf0.format(vehicle.current_km)}
            <span className="text-mist" style={{ fontSize: 11, marginLeft: 3, fontWeight: 400 }}>
              km
            </span>
          </dd>
        </div>
        {vehicle.fuel_type && (
          <div>
            <dt
              className="font-mono uppercase text-mist inline-flex items-center"
              style={{ fontSize: 9, letterSpacing: '.16em', gap: 4 }}
            >
              <Fuel className="h-3 w-3" strokeWidth={1.6} />
              Combustible
            </dt>
            <dd className="text-ink" style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
              {vehicle.fuel_type}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
};
