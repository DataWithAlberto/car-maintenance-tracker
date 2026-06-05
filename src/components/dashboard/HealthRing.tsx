import { memo } from 'react';

interface HealthRingProps {
  /** Puntuación 0-100. */
  score: number;
  size?: number;
  stroke?: number;
}

/**
 * Indicador radial de salud (SVG puro, sin dependencias). El color del arco
 * pasa de rojo → ámbar → verde según la puntuación. Accesible vía `role` +
 * `aria-valuenow`.
 */
export const HealthRing = memo(({ score, size = 132, stroke = 10 }: HealthRingProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color = clamped >= 85 ? '#34d399' : clamped >= 70 ? '#fbbf24' : '#f87171';

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
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold leading-none text-white tabular-nums">
          {clamped}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          / 100
        </span>
      </div>
    </div>
  );
});
HealthRing.displayName = 'HealthRing';
