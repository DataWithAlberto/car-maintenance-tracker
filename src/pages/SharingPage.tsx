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
  owner: { Icon: Crown, label: 'Propietario', cls: 'bg-sky-blueprint/15 text-sky-dark border-sky-blueprint/30' },
  editor: { Icon: Pencil, label: 'Editor', cls: 'bg-success-500/15 text-success-400 border-success-500/30' },
  viewer: { Icon: Eye, label: 'Visor', cls: 'bg-canvas-50/80 text-ink-charcoal border-sky-blueprint/20' },
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="font-manrope text-caption text-sky-dark/80 tracking-wide mb-1">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">Compartir acceso</h1>
          <p className="font-manrope text-caption text-ink-charcoal/70 mt-1.5">
            Invita a tu pareja, familia o mecánico al control de este vehículo.
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowModal(true)} iconLeft={<UserPlus className="h-4 w-4" />}>
            Invitar
          </Button>
        )}
      </header>

      {pendingInvites.length > 0 && (
        <section className="mb-6">
          <h2 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold mb-3 flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            Invitaciones pendientes para ti
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-sky-blueprint/10 to-transparent border border-sky-blueprint/30 rounded-card p-4 flex items-center justify-between gap-3"
              >
                <p className="font-manrope text-body text-ink-black">
                  Invitación a vehículo como <span className="text-sky-dark font-semibold capitalize">{inv.role}</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleRespond(inv.id, true)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-success-500/15 border border-success-500/30 text-success-400 hover:bg-success-500/25 transition-colors"
                    aria-label="Aceptar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, false)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-danger-500/15 border border-danger-500/30 text-danger-400 hover:bg-danger-500/25 transition-colors"
                    aria-label="Rechazar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold mb-3">Accesos del vehículo</h2>
        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : accesses.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Sin accesos compartidos"
            description={isOwner
              ? 'Comparte el coche con quien necesite ver o registrar mantenimientos.'
              : 'El propietario aún no ha compartido el vehículo con nadie más.'}
            action={
              isOwner ? (
                <Button onClick={() => setShowModal(true)} iconLeft={<UserPlus className="h-4 w-4" />}>
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
              const initial = (acc.user?.email?.[0] ?? '?').toUpperCase();
              return (
                <li
                  key={acc.id}
                  className="bg-cloud-white border border-sky-blueprint/20 rounded-card p-4 flex items-center gap-4"
                >
                  <div className="shrink-0 h-11 w-11 rounded-full bg-gradient-to-br from-sky-blueprint to-vivid-blue text-cloud-white text-base font-semibold flex items-center justify-center">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-manrope text-body text-ink-black font-medium truncate">{acc.user?.email ?? 'Usuario'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', cfg.cls)}>
                        <RoleIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                          acc.status === 'accepted'
                            ? 'bg-success-500/10 text-success-400 border-success-500/30'
                            : acc.status === 'pending'
                            ? 'bg-warn-500/10 text-warn-400 border-warn-500/30'
                            : 'bg-danger-500/10 text-danger-400 border-danger-500/30',
                        )}
                      >
                        {acc.status === 'accepted' ? 'Activo' : acc.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(acc.id)}
                      className="p-2 text-ink-charcoal/80 hover:text-danger-400 hover:bg-danger-500/10 rounded-md transition-colors"
                      aria-label="Revocar acceso"
                    >
                      <Trash2 className="h-4 w-4" />
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
