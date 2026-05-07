import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, UserPlus, Trash2, Check, X } from 'lucide-react';
import { ShareModal } from '../components/sharing/ShareModal';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { sharingService } from '../services/sharing.service';
import type { SharedAccess } from '../types';
import toast from 'react-hot-toast';

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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Compartir</h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona accesos al vehículo</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Invitar
          </button>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                <p className="text-white text-sm">Invitación a vehículo como <span className="text-blue-400">{inv.role}</span></p>
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(inv.id, true)} className="text-green-400 hover:text-green-300 p-1">
                    <Check className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleRespond(inv.id, false)} className="text-red-400 hover:text-red-300 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Accesos actuales</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accesses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Share2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin accesos compartidos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accesses.map((acc) => (
              <div key={acc.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-white">{acc.user?.email ?? 'Usuario'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      acc.role === 'editor' ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {acc.role}
                    </span>
                    <span className={`text-xs ${acc.status === 'accepted' ? 'text-green-400' : acc.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {acc.status === 'accepted' ? 'Activo' : acc.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <button onClick={() => handleRemove(acc.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ShareModal vehicleId={selectedVehicle.id} onClose={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
};
