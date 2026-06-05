import { memo } from 'react';
import { cn } from '../../utils/cn';
import { CARD, EYEBROW } from './styles';
import { fmtN } from './format';

interface UsageSparklineProps {
  dailyKm: number[];
  axisDates: [string, string, string];
  thisMonthKm: number;
  avgPerDay: number;
  pctVsAvg: number;
  moreOrLess: 'más' | 'menos';
}

/**
 * Gráfica de uso (km/día, ventana de 30 días). SVG inline ligero — NO usa
 * recharts, así no añade peso al bundle inicial ni bloquea el render. El área
 * usa un degradado para el look "tech".
 */
export const UsageSparkline = memo(
  ({ dailyKm, axisDates, thisMonthKm, avgPerDay, pctVsAvg, moreOrLess }: UsageSparklineProps) => {
    const width = 480;
    const height = 130;
    const max = Math.max(...dailyKm, 1);
    const stepX = dailyKm.length > 1 ? width / (dailyKm.length - 1) : width;
    const pts = dailyKm.map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 10) - 5;
      return [x, y] as const;
    });
    const line = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;

    return (
      <section className={cn(CARD, 'flex flex-col p-5 sm:p-6')} aria-label="Uso del vehículo">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={EYEBROW}>Uso · últimos 30 días</span>
            <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-white">
              +{fmtN(thisMonthKm)}{' '}
              <span className="text-sm font-normal text-slate-400">km este mes</span>
            </div>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[11px] text-slate-400">
            {avgPerDay.toFixed(1).replace('.', ',')} km/día
          </span>
        </div>

        <div className="mt-5">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#usageFill)" />
            <path d={line} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-600">
            {axisDates.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <p className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-400">
          {pctVsAvg > 0 ? (
            <>
              Conduciendo un{' '}
              <span
                className={
                  moreOrLess === 'más'
                    ? 'font-semibold text-sky-400'
                    : 'font-semibold text-emerald-400'
                }
              >
                {pctVsAvg}% {moreOrLess}
              </span>{' '}
              que tu media anual.
            </>
          ) : (
            <>Aún no hay datos suficientes para comparar con la media anual.</>
          )}
        </p>
      </section>
    );
  },
);
UsageSparkline.displayName = 'UsageSparkline';
