import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, Phone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { InsuranceForm } from '../components/insurance/InsuranceForm';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { insuranceService } from '../services/insurance.service';
import { INSURANCE_COVERAGE_LABELS, INSURANCE_PAYMENT_LABELS } from '../utils/constants';
import type { InsurancePolicy } from '../types';
import type { InsuranceInput } from '../utils/validators';
import { formatDate, formatCurrency } from '../utils/formatters';
import { isBefore, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';

const toInput = (p: InsurancePolicy): Partial<InsuranceInput> => ({
  provider: p.provider,
  policy_number: p.policy_number ?? undefined,
  coverage_type: p.coverage_type,
  premium_amount: p.premium_amount ?? undefined,
  payment_frequency: p.payment_frequency ?? undefined,
  start_date: p.start_date,
  end_date: p.end_date,
  deductible: p.deductible ?? undefined,
  contact_phone: p.contact_phone ?? undefined,
  notes: p.notes ?? undefined,
});

type PolicyStatus = 'active' | 'soon' | 'expired';

const statusOf = (endDate: string): PolicyStatus => {
  const end = parseISO(endDate);
  if (isBefore(end, new Date())) return 'expired';
  if (isBefore(end, addDays(new Date(), 30))) return 'soon';
  return 'active';
};

const STATUS_META: Record<PolicyStatus, { label: string; color: string }> = {
  active: { label: '● Vigente', color: '#2f6b34' },
  soon: { label: '● Vence pronto', color: '#c77700' },
  expired: { label: '● Vencida', color: '#b64400' },
};

export const InsurancePage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    insuranceService.getByVehicle(selectedVehicle.id)
      .then(setPolicies)
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  if (!selectedVehicle || !user) return null;

  const handleSubmit = async (data: InsuranceInput) => {
    if (editing) {
      const updated = await insuranceService.update(editing.id, data);
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Póliza actualizada');
    } else {
      const p = await insuranceService.create(selectedVehicle.id, user.id, data);
      setPolicies((prev) => [p, ...prev]);
      toast.success('Póliza añadida');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta póliza?')) return;
    const snapshot = policies;
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    try {
      await insuranceService.delete(id);
      toast.success('Póliza eliminada');
    } catch {
      setPolicies(snapshot);
      toast.error('No se pudo eliminar la póliza');
    }
  };

  const activeCount = policies.filter((p) => statusOf(p.end_date) !== 'expired').length;

  return (
    <div className="px-6 sm:px-10 py-10">
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Seguro.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{activeCount}</span> pólizas vigentes ·{' '}
            <span className="text-ink font-medium tabular-nums">{policies.length}</span> en total
          </p>
        </div>
        <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
          Añadir póliza
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Sin pólizas registradas"
          description="Añade el seguro de tu vehículo para llevar el control de la cobertura, el coste y la fecha de renovación. Te avisaremos antes de que venza."
          action={
            <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
              Añadir primera póliza
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {policies.map((p, i) => {
            const status = statusOf(p.end_date);
            const meta = STATUS_META[status];
            return (
              <li
                key={p.id}
                onClick={() => setEditing(p)}
                className="stagger-item group bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4 transition-colors hover:bg-fog cursor-pointer"
                style={{ '--i': Math.min(i, 10) } as CSSProperties}
              >
                <div className="shrink-0 h-11 w-11 rounded-[10px] bg-fog flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-ink" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                      {p.provider}
                    </p>
                    <span
                      className="font-mono uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.12em', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-graphite font-text flex-wrap" style={{ fontSize: 13 }}>
                    <span>{INSURANCE_COVERAGE_LABELS[p.coverage_type] ?? p.coverage_type}</span>
                    <span className="text-silver-mist">·</span>
                    <span>Vence {formatDate(p.end_date)}</span>
                    {p.policy_number && (
                      <>
                        <span className="text-silver-mist">·</span>
                        <span className="truncate">Nº {p.policy_number}</span>
                      </>
                    )}
                    {p.contact_phone && (
                      <>
                        <span className="text-silver-mist">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" strokeWidth={1.6} />
                          {p.contact_phone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {p.premium_amount != null && (
                    <div className="text-right">
                      <span
                        className="font-display text-ink font-semibold tabular-nums block"
                        style={{ fontSize: 17, letterSpacing: '-0.1px' }}
                      >
                        {formatCurrency(p.premium_amount)}
                      </span>
                      {p.payment_frequency && (
                        <span className="font-text text-graphite" style={{ fontSize: 11 }}>
                          {INSURANCE_PAYMENT_LABELS[p.payment_frequency]}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={(ev) => { ev.stopPropagation(); handleDelete(p.id); }}
                    className="font-text text-graphite hover:text-caution transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(showForm || editing) && (
        <InsuranceForm
          initialData={editing ? toInput(editing) : undefined}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
};
