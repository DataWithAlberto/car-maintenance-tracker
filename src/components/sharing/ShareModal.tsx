import { useState } from 'react';
import { X, UserPlus, Copy, Check, Link } from 'lucide-react';
import { sharingService } from '../../services/sharing.service';
import type { UserRole } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  vehicleId: string;
  onClose: () => void;
}

export const ShareModal = ({ vehicleId, onClose }: Props) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { token, existing } = await sharingService.invite(vehicleId, email, role);
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);

      if (existing) {
        toast.success(`Invitación enviada a ${email}`);
      } else {
        toast.success(`Link generado — ${email} no está registrado/a aún`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al invitar');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Compartir acceso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="usuario@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="editor">Editor — puede añadir registros</option>
                <option value="viewer">Visor — solo lectura</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? 'Generando...' : 'Generar link de invitación'}
            </button>
          </form>

          {inviteLink && (
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <Link className="h-4 w-4" />
                <span>Link de invitación listo</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-gray-300 text-xs truncate focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-gray-500 text-xs">
                Envía este link. Si no tiene cuenta, puede registrarse y el acceso se activa automáticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
