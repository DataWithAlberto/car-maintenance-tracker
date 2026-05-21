import { useEffect, useState, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { tripsService } from '../services/trips.service';
import { documentsService } from '../services/documents.service';
import { insuranceService } from '../services/insurance.service';
import { sharingService } from '../services/sharing.service';
import { calculateAchievements, totalXP, xpLevel } from '../utils/achievements';
import type { Achievement, MaintenanceRecord, Expense, Trip, Document, InsurancePolicy } from '../types';
import { SkeletonRow } from '../components/ui/Skeleton';

const CATEGORY_COLORS: Record<string, string> = {
  mantenimiento: '#0071e3',
  viajes: '#1cb05c',
  economia: '#c77700',
  social: '#7b4de0',
  especial: '#b64400',
};

const CATEGORY_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  viajes: 'Viajes',
  economia: 'Economía',
  social: 'Social',
  especial: 'Especial',
};

const BadgeCard = ({ a }: { a: Achievement }) => {
  const color = CATEGORY_COLORS[a.category] ?? '#666';
  const pct = a.target ? Math.min(100, Math.round(((a.progress ?? 0) / a.target) * 100)) : 100;

  return (
    <div style={{
      background: a.unlocked ? 'var(--color-snow)' : 'var(--color-fog)',
      border: `1px solid ${a.unlocked ? color + '40' : 'var(--color-silver-mist)'}`,
      borderRadius: 20,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: a.unlocked ? 1 : 0.6,
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {a.unlocked && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '20px 20px 0 0' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>{a.icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: color + '18', color: color, letterSpacing: '0.06em',
        }}>
          +{a.xp} XP
        </span>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-ink)', marginBottom: 4 }}>
          {a.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-slate)', lineHeight: 1.4 }}>
          {a.description}
        </div>
      </div>
      {a.target && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-mist)', marginBottom: 4 }}>
            <span>{a.category === 'viajes' && a.id.includes('km') ? `${(a.progress ?? 0).toLocaleString('es-ES')}` : (a.progress ?? 0)} / {a.category === 'viajes' && a.id.includes('km') ? a.target.toLocaleString('es-ES') : a.target}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'var(--color-silver-mist)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: a.unlocked ? color : color + '60', width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
        color: CATEGORY_COLORS[a.category],
        textTransform: 'uppercase',
      }}>
        {CATEGORY_LABELS[a.category]}
      </span>
    </div>
  );
};

export const AchievementsPage = () => {
  const { vehicles } = useVehicleStore();
  const { user } = useAuthStore();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [hasShared, setHasShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!user || vehicles.length === 0) { setLoading(false); return; }
    const v = vehicles[0];
    setLoading(true);
    Promise.all([
      maintenanceService.getByVehicle(v.id).catch(() => [] as MaintenanceRecord[]),
      expensesService.getByVehicle(v.id).catch(() => [] as Expense[]),
      tripsService.getByVehicle(v.id).catch(() => [] as Trip[]),
      documentsService.getByVehicle(v.id).catch(() => [] as Document[]),
      insuranceService.getByVehicle(v.id).catch(() => [] as InsurancePolicy[]),
      sharingService.getByVehicle(v.id).catch(() => []),
    ]).then(([rec, exp, trp, doc, pol, shared]) => {
      setRecords(rec);
      setExpenses(exp);
      setTrips(trp);
      setDocuments(doc);
      setPolicies(pol);
      setHasShared(shared.filter((s: { status: string }) => s.status === 'accepted').length > 0);
    }).finally(() => setLoading(false));
  }, [vehicles, user]);

  const achievements = useMemo(() =>
    calculateAchievements({ vehicles, records, expenses, trips, documents, policies, hasSharedVehicle: hasShared }),
    [vehicles, records, expenses, trips, documents, policies, hasShared],
  );

  const xp = totalXP(achievements);
  const { level, title: lvlTitle, nextLevelXp } = xpLevel(xp);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  const xpPct = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return (
    <div style={{ padding: '32px 24px 80px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: 8 }}>
          Tu perfil
        </p>
        <h1 style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: '-1px', lineHeight: 1, margin: 0, color: 'var(--color-ink)' }}>
          Logros
        </h1>
      </div>

      {/* XP + Level card */}
      <div style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%)', borderRadius: 24, padding: '28px 32px', marginBottom: 32, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>NIVEL {level}</div>
            <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.5px', lineHeight: 1 }}>
              {lvlTitle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>XP TOTAL</div>
            <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.5px', lineHeight: 1 }}>
              {xp.toLocaleString('es-ES')}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
            <span>{unlocked} / {achievements.length} logros desbloqueados</span>
            <span>{xp} / {nextLevelXp} XP</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #0071e3, #00c4ff)', width: `${xpPct}%`, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'unlocked', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 999, border: '1px solid var(--color-silver-mist)',
              background: filter === f ? 'var(--color-ink)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--color-graphite)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? 'Todos' : f === 'unlocked' ? `Desbloqueados (${unlocked})` : `Pendientes (${achievements.length - unlocked})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((a) => <BadgeCard key={a.id} a={a} />)}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-mist)' }}>
          <Trophy size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 16 }}>
            {filter === 'unlocked' ? 'Todavía no has desbloqueado ningún logro.' : 'Has desbloqueado todos los logros. ¡Increíble!'}
          </p>
        </div>
      )}
    </div>
  );
};
