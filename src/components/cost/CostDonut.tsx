interface DonutSegment {
  color: string;
  pct: number;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  /** Etiqueta superior dentro del donut (p. ej. "Mayor partida"). */
  centerLabel?: string;
  centerValue?: string;
  centerSub?: string;
  /** Color del aro de fondo (hueco no cubierto). */
  trackColor?: string;
  /** Color del texto central. */
  textColor?: string;
  subColor?: string;
}

// Radio con circunferencia ≈ 100, para que stroke-dasharray hable en %.
const R = 15.915;

/**
 * Donut de segmentos en SVG puro (sin dependencias). Cada segmento se dibuja
 * con `stroke-dasharray = "pct (100-pct)"` y se posiciona acumulando offsets,
 * empezando arriba (12 en punto) y girando en sentido horario.
 */
export const CostDonut = ({
  segments,
  size = 168,
  centerLabel,
  centerValue,
  centerSub,
  trackColor = 'rgba(255,255,255,0.12)',
  textColor = '#fff',
  subColor = 'rgba(255,255,255,0.5)',
}: Props) => {
  // Offset de cada segmento = suma de los pct anteriores (sin mutar nada).
  const arcs = segments.map((s, i) => {
    const before = segments.slice(0, i).reduce((sum, x) => sum + x.pct, 0);
    return { ...s, offset: 25 - before };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 42 42" role="img" aria-label="Desglose de coste">
        <circle cx="21" cy="21" r={R} fill="none" stroke={trackColor} strokeWidth="5.5" />
        {arcs.map((s, i) => (
          <circle
            key={i}
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="5.5"
            strokeDasharray={`${s.pct} ${100 - s.pct}`}
            strokeDashoffset={s.offset}
          />
        ))}
      </svg>
      {(centerLabel || centerValue || centerSub) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 18px',
          }}
        >
          {centerLabel && (
            <span
              className="font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: '0.12em', color: subColor }}
            >
              {centerLabel}
            </span>
          )}
          {centerValue && (
            <span
              className="font-display"
              style={{
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: '-0.3px',
                color: textColor,
                marginTop: 3,
              }}
            >
              {centerValue}
            </span>
          )}
          {centerSub && (
            <span
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.04em', color: subColor, marginTop: 4 }}
            >
              {centerSub}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
