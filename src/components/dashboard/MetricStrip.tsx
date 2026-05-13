export interface Metric {
  label: string;
  value: string;
  caption: string;
}

interface Props {
  metrics: Metric[];
  ariaLabel: string;
}

// Frosted KPI strip used in the indigo hero. Responsive: 2x2 on phones,
// 1x4 from 900px. Each cell is a listitem for screen-reader navigation.
export const MetricStrip = ({ metrics, ariaLabel }: Props) => (
  <div
    className="indigo-kpis"
    role="list"
    aria-label={ariaLabel}
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      background: 'rgba(255,255,255,0.14)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.28)',
      borderRadius: 20,
      overflow: 'hidden',
    }}
  >
    <style>{`
      @media (min-width: 900px) {
        .indigo-kpis { grid-template-columns: repeat(4, 1fr) !important; }
        .indigo-kpis > div:nth-child(n+2) { border-left: 1px solid rgba(255,255,255,0.22); }
      }
      @media (max-width: 899px) {
        .indigo-kpis > div:nth-child(2n) { border-left: 1px solid rgba(255,255,255,0.22); }
        .indigo-kpis > div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,0.22); }
      }
    `}</style>
    {metrics.map((m) => (
      <div key={m.label} role="listitem" style={{ padding: '18px 22px' }}>
        <div className="label" style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: '0.08em',
        }}>{m.label}</div>
        <div style={{
          fontFamily: 'Inter, var(--font-sf-pro-display)',
          fontWeight: 700, fontSize: 28, lineHeight: 1,
          letterSpacing: '-0.3px', marginTop: 6, color: '#fff',
        }}>{m.value}</div>
        <div style={{
          fontFamily: 'Inter, var(--font-sf-pro-text)',
          fontWeight: 400, fontSize: 12, lineHeight: 1.4,
          color: 'rgba(255,255,255,0.85)', marginTop: 4,
        }}>{m.caption}</div>
      </div>
    ))}
  </div>
);
