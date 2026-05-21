import { useEffect, useState } from 'react';
import { X, Send, MessageSquare, Trash2 } from 'lucide-react';
import { commentsService } from '../../services/comments.service';
import { useAuthStore } from '../../store/authStore';
import type { MaintenanceComment, MaintenanceRecord } from '../../types';
import { formatRelative } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Props {
  record: MaintenanceRecord;
  onClose: () => void;
}

export const MaintenanceCommentsModal = ({ record, onClose }: Props) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<MaintenanceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    commentsService.getByRecord(record.id)
      .then(setComments)
      .catch(() => toast.error('Error al cargar comentarios'))
      .finally(() => setLoading(false));
  }, [record.id]);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      const c = await commentsService.create(record.id, user.id, text.trim());
      setComments((prev) => [...prev, c]);
      setText('');
    } catch {
      toast.error('Error al enviar comentario');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await commentsService.delete(id);
    } catch {
      setComments(snapshot);
      toast.error('Error al eliminar');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--color-snow)', borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--color-silver-mist)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-ink)' }}>{record.type}</div>
            <div style={{ fontSize: 12, color: 'var(--color-mist)', marginTop: 2 }}>
              Comentarios · {record.date}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'var(--color-fog)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-mist)', fontSize: 14 }}>Cargando…</div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-mist)' }}>
              <MessageSquare size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>Sin comentarios aún. ¡Sé el primero!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.map((c) => {
                const isOwn = c.user_id === user?.id;
                const name = c.user?.full_name || c.user?.email?.split('@')[0] || 'Usuario';
                return (
                  <div key={c.id} style={{
                    background: isOwn ? 'var(--color-fog)' : 'white',
                    border: '1px solid var(--color-silver-mist)',
                    borderRadius: 14,
                    padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                        {isOwn ? 'Tú' : name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-mist)' }}>{formatRelative(c.created_at)}</span>
                        {isOwn && (
                          <button onClick={() => handleDelete(c.id)} style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-mist)' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--color-slate)', margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-silver-mist)', display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Añadir comentario…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--color-silver-mist)', background: 'var(--color-fog)', fontSize: 14 }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{
              padding: '10px 14px', borderRadius: 12, border: 'none',
              background: text.trim() ? 'var(--color-ink)' : 'var(--color-silver-mist)',
              color: text.trim() ? '#fff' : 'var(--color-mist)',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 600, fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            <Send size={14} />
            {sending ? '…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};
