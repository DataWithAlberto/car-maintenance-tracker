import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, UserPlus, Trash2, Check, X, Mail, Crown, Pencil, Eye } from 'lucide-react';
import { ShareModal } from '../components/sharing/ShareModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { sharingService } from '../services/sharing.service';
import type { SharedAccess } from '../types';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const roleConfig = {
  owner:  { Icon: Crown,  label: 'Propietario' },
  editor: { Icon: Pencil, label: 'Editor' },
  viewer: { Icon: Eye,    label: 'Visor' },
} as const;

const statusConfig = {
  accepted: { label: 'Activo',    color: '#1a9e3f' },
  pending:  { label: 'Pendiente', color: '#c77700' },
  rejected: { label: 'Rechazado', color: '#b64400' },
} as const;

export const SharingPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [accesses, setAccesses] = useState<SharedAccess[]>([]);
  const [pendingInvites, setPendingInvites] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!selectedVehicle || !user) { navigate('/dashboard'); return; }
    load();
    loadInvites();
  }, [selectedVehicle?.id]);

  const load = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    sharingService.getByVehicle(selectedVehicle.id)
      .then(setAccesses)
      .finally(() => setLoading(false));
  };

  const loadInvites = async () => {
    if (!user) return;
    sharingService.getPendingInvites(user.id).then(setPendingInvites);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('¿Revocar acceso?')) return;
    await sharingService.remove(id);
    setAccesses((prev) => prev.filter((a) => a.id !== id));
    toast.success('Acceso revocado');
  };

  const handleRespond = async (id: string, accept: boolean) => {
    await sharingService.respondInvite(id, accept);
    setPendingInvites((prev) => prev.filter((i) => i.id !== id));
    toast.success(accept ? 'Invitación aceptada' : 'Invitación rechazada');
    if (accept) load();
  };

  if (!selectedVehicle) return null;
  const isOwner = selectedVehicle.role === 'owner';

  return (
    <div className="px-6 sm:px-10 py-10 max-w-4xl mx-auto">
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
            Compartir.
          </h1>
          <p
            className="font-text text-graphite mt-3 max-w-xl"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            Invita a tu pareja, familia o mecánico al control de este vehículo. Puedes asignar
            distintos niveles de permiso.
          </p>
        </div>
        {isOwner && (
          <Button variant="accent" onClick={() => setShowModal(true)} iconLeft={<UserPlus className="h-4 w-4" strokeWidth={1.8} />}>
            Invitar
          </Button>
        )}
      </header>

      {pendingInvites.length > 0 && (
        <section className="mb-10">
          <h2
            className="font-mono uppercase text-graphite mb-3 flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            <Mail className="h-3 w-3" strokeWidth={1.6} />
            Invitaciones pendientes para ti
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center justify-between gap-3"
              >
                <p className="font-text text-ink" style={{ fontSize: 15 }}>
                  Invitación a vehículo como{' '}
                  <span className="text-cobalt-link font-medium capitalize">{inv.role}</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleRespond(inv.id, true)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-snow border border-silver-mist hover:bg-fog text-ink transition-colors"
                    style={{ color: '#1a9e3f' }}
                    aria-label="Aceptar"
                  >
                    <Check className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, false)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-snow border border-silver-mist hover:bg-fog text-graphite transition-colors"
                    aria-label="Rechazar"
                  >
                    <X className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2
          className="font-mono uppercase text-graphite mb-3"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          Accesos del vehículo
        </h2>
        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : accesses.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Sin accesos compartidos"
            description={
              isOwner
                ? 'Comparte el coche con quien necesite ver o registrar mantenimientos.'
                : 'El propietario aún no ha compartido el vehículo con nadie más.'
            }
            action={
              isOwner ? (
                <Button variant="accent" onClick={() => setShowModal(true)} iconLeft={<UserPlus className="h-4 w-4" strokeWidth={1.8} />}>
                  Invitar a alguien
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {accesses.map((acc) => {
              const cfg = roleConfig[acc.role] ?? roleConfig.viewer;
              const RoleIcon = cfg.Icon;
              const status = statusConfig[acc.status];
              const initial = (acc.user?.email?.[0] ?? '?').toUpperCase();
              return (
                <li
                  key={acc.id}
                  className="bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4"
                >
                  <div
                    className="shrink-0 h-11 w-11 rounded-full bg-ink text-snow flex items-center justify-center font-text font-semibold"
                    style={{ fontSize: 14 }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-text text-ink font-medium truncate"
                      style={{ fontSize: 15 }}
                    >
                      {acc.user?.email ?? 'Usuario'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-graphite font-text" style={{ fontSize: 12 }}>
                        <RoleIcon className="h-3 w-3" strokeWidth={1.6} />
                        {cfg.label}
                      </span>
                      <span className="text-silver-mist">·</span>
                      <span
                        className="inline-flex items-center gap-1 font-mono uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.14em',
                          color: status.color,
                        }}
                      >
                        <span
                          className="rounded-full inline-block"
                          style={{ width: 5, height: 5, background: status.color }}
                        />
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(acc.id)}
                      className={cn(
                        'h-8 w-8 inline-flex items-center justify-center rounded-full',
                        'text-graphite hover:text-caution hover:bg-fog transition-colors',
                      )}
                      aria-label="Revocar acceso"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showModal && (
        <ShareModal vehicleId={selectedVehicle.id} onClose={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
};
