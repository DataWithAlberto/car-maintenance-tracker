import type { TripStatus } from '../../types';

const STYLE: Record<TripStatus, { fg: string; bg: string; dot: string; label: string }> = {
  planning: { fg: '#7a4d00', bg: '#fff6e0', dot: '#febb02', label: 'En planificación' },
  confirmed: { fg: '#0066cc', bg: 'rgba(0,102,204,.10)', dot: '#0066cc', label: 'Confirmado' },
  completed: { fg: '#1cb05c', bg: 'rgba(28,176,92,.12)', dot: '#1cb05c', label: 'Realizado' },
};

export const TripStatusBadge = ({ status }: { status: TripStatus }) => {
  const s = STYLE[status];
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.10em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
};
