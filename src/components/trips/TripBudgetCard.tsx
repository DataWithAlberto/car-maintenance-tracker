import { Wallet } from 'lucide-react';

interface Props {
  spent: number;
  budget: number;
  itemCount: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

export const TripBudgetCard = ({ spent, budget, itemCount }: Props) => {
  const hasBudget = budget > 0;
  const pct = hasBudget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = hasBudget && spent > budget;
  const healthy = hasBudget && spent <= budget * 0.8;

  const barColor = over ? '#b64400' : healthy ? '#1cb05c' : '#1d1d1f';
  const remaining = hasBudget ? budget - spent : 0;

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
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase text-graphite inline-flex items-center"
          style={{ fontSize: 10, letterSpacing: '.16em', gap: 6 }}
        >
          <Wallet className="h-3 w-3" strokeWidth={1.6} />
          Presupuesto
        </span>
        <span className="font-mono text-mist tabular-nums" style={{ fontSize: 11 }}>
          {itemCount} {itemCount === 1 ? 'reserva' : 'reservas'}
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: 0 }}>
          <span
            className="text-ink tabular-nums"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: '-0.6px',
              color: over ? '#b64400' : 'var(--color-ink)',
            }}
          >
            {fmtMoney(spent)}
          </span>
          {hasBudget && (
            <span className="text-mist" style={{ fontSize: 13 }}>
              / {fmtMoney(budget)}
            </span>
          )}
        </p>
        <p
          className="text-graphite"
          style={{ fontSize: 12, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}
        >
          {!hasBudget ? (
            'Sin presupuesto definido'
          ) : over ? (
            <>
              Exceso de{' '}
              <span style={{ color: '#b64400', fontWeight: 600 }}>{fmtMoney(spent - budget)}</span>
            </>
          ) : (
            <>
              Restan <span style={{ fontWeight: 600 }}>{fmtMoney(remaining)}</span>
            </>
          )}
        </p>
      </div>

      <div
        style={{
          height: 6,
          background: 'var(--color-fog)',
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: 14,
        }}
      >
        <div
          style={{
            width: hasBudget ? `${pct}%` : '0%',
            height: '100%',
            background: barColor,
            borderRadius: 999,
            transition: 'width .3s ease',
          }}
        />
      </div>
    </div>
  );
};
