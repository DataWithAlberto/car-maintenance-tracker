import { useState } from 'react';
import { UserPlus, Copy, Check, Link2, Send } from 'lucide-react';
import { sharingService } from '../../services/sharing.service';
import type { UserRole } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingSelect } from '../ui/FloatingInput';
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
      toast.success(existing ? `Invitación enviada a ${email}` : `Link generado para ${email}`);
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
    <Modal open onClose={onClose} title="Compartir acceso" description="Invita por email o genera un link" size="md">
      <form onSubmit={handleInvite} className="space-y-4">
        <FloatingInput
          type="email"
          label="Email del invitado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FloatingSelect
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={[
            { value: 'editor', label: 'Editor — puede añadir registros' },
            { value: 'viewer', label: 'Visor — solo lectura' },
          ]}
        />

        <Button
          type="submit"
          loading={loading}
          fullWidth
          iconLeft={<Send className="h-4 w-4" />}
          disabled={!email}
        >
          {loading ? 'Generando...' : 'Generar link de invitación'}
        </Button>
      </form>

      {inviteLink && (
        <div
          className="mt-5 bg-gradient-to-br from-success-500/10 to-transparent border border-success-500/30 rounded-2xl p-4 space-y-3"
          style={{ animation: 'slide-up 0.3s var(--ease-out-expo)' }}
        >
          <div className="flex items-center gap-2 text-success-400 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            <span>Link de invitación listo</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-gray-300 text-xs truncate focus:outline-none focus:border-brand-400"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 h-9 w-9 inline-flex items-center justify-center bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition-colors"
              aria-label="Copiar"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            Envía este link. Si el invitado no tiene cuenta podrá registrarse y el acceso se activará automáticamente.
          </p>
        </div>
      )}
    </Modal>
  );
};
