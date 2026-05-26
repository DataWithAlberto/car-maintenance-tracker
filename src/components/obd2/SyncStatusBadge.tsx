import { useEffect, useState } from 'react';
import { CloudOff, Cloud } from 'lucide-react';
import { syncQueueService } from '../../services/syncQueue.service';

export const SyncStatusBadge = () => {
  const [pending, setPending] = useState(0);
  const [forcing, setForcing] = useState(false);

  useEffect(() => {
    return syncQueueService.subscribe(setPending);
  }, []);

  if (pending === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono uppercase rounded-full px-3 py-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          background: '#e3f0e3',
          color: '#2f6b34',
        }}
        title="Todos los datos están sincronizados"
      >
        <Cloud className="h-3 w-3" strokeWidth={1.7} />
        Sincronizado
      </span>
    );
  }

  const handleForce = async () => {
    if (forcing) return;
    setForcing(true);
    try {
      await syncQueueService.sync();
    } finally {
      setForcing(false);
    }
  };

  return (
    <button
      onClick={handleForce}
      className="inline-flex items-center gap-1.5 font-mono uppercase rounded-full px-3 py-1 hover:opacity-80 transition-opacity"
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        background: '#fdf1d9',
        color: '#9a6700',
      }}
      title="Click para forzar reenvío"
      disabled={forcing}
    >
      <CloudOff className="h-3 w-3" strokeWidth={1.7} />
      {forcing ? 'Sincronizando…' : `${pending} pendiente${pending > 1 ? 's' : ''}`}
    </button>
  );
};
