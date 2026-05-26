import { FileEdit, Sparkles, Link2, Lock } from 'lucide-react';
import type { TripStatus } from '../../types';

interface Props {
  status: TripStatus;
  isSurprise: boolean;
  isPublic: boolean;
}

interface Pill {
  icon: typeof FileEdit;
  label: string;
  fg: string;
  bg: string;
  border: string;
  dotted?: boolean;
}

const planningPill: Pill = {
  icon: FileEdit,
  label: 'Borrador en planificación',
  fg: '#7a4d00',
  bg: '#fff6e0',
  border: 'rgba(254,187,2,0.35)',
};

const surprisePill: Pill = {
  icon: Sparkles,
  label: 'Modo Sorpresa activo',
  fg: '#af52de',
  bg: 'rgba(175,82,222,0.10)',
  border: 'rgba(175,82,222,0.30)',
  dotted: true,
};

const publicPill: Pill = {
  icon: Link2,
  label: 'Enlace público',
  fg: '#0071e3',
  bg: 'rgba(0,113,227,0.10)',
  border: 'rgba(0,113,227,0.28)',
};

const privatePill: Pill = {
  icon: Lock,
  label: 'Privado',
  fg: '#707070',
  bg: 'var(--color-fog)',
  border: 'var(--color-silver-mist)',
};

export const TripStatusPills = ({ status, isSurprise, isPublic }: Props) => {
  const pills: Pill[] = [];
  if (status === 'planning') pills.push(planningPill);
  if (isSurprise) pills.push(surprisePill);
  pills.push(isPublic ? publicPill : privatePill);

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
        className="font-mono uppercase text-graphite block"
        style={{ fontSize: 10, letterSpacing: '.16em' }}
      >
        Estado
      </span>

      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
        {pills.map(({ icon: Icon, label, fg, bg, border, dotted }) => (
          <span
            key={label}
            className="inline-flex items-center"
            style={{
              gap: 6,
              padding: '6px 11px',
              borderRadius: 999,
              border: `1px ${dotted ? 'dashed' : 'solid'} ${border}`,
              background: bg,
              color: fg,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '-0.1px',
            }}
          >
            <Icon className="h-3 w-3" strokeWidth={1.8} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};
