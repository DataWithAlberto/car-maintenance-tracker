import { memo } from 'react';

interface HealthRingProps {
  /** Puntuación 0-100. */
  score: number;
  size?: number;
  stroke?: number;
}

/**
 * Indicador radial de salud (SVG puro, sin dependencias): arco en el acento de
 * la app (azure) sobre pista tenue (silver-mist), con el valor centrado. Usa
 * tokens CSS, por lo que se adapta solo al modo oscuro. Accesible vía `role` +
 * `aria-valuenow`.
 */
export const HealthRing = memo(({ score, size = 96, stroke = 6 }: HealthRingProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Salud del vehículo: ${clamped} sobre 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-silver-mist)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-azure)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span
        className="absolute font-semibold tabular-nums text-ink"
        style={{ fontSize: size * 0.26 }}
      >
        {clamped}%
      </span>
    </div>
  );
});
HealthRing.displayName = 'HealthRing';
