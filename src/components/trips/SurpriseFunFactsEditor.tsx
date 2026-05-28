import { useState } from 'react';
import { Wand2, Trash2, Loader2, KeyRound } from 'lucide-react';
import { useApiKeyStore } from '../../store/apiKeyStore';
import { aiService } from '../../services/claude.service';
import toast from 'react-hot-toast';

interface Props {
  destination?: string | null;
  value: string[];
  onChange: (next: string[]) => void;
}

export const SurpriseFunFactsEditor = ({ destination, value, onChange }: Props) => {
  const { geminiApiKey } = useApiKeyStore();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!destination?.trim()) {
      toast.error('Define primero el destino del viaje');
      return;
    }
    if (!geminiApiKey) {
      toast.error('Configura tu API key de Gemini en Ajustes');
      return;
    }
    setLoading(true);
    try {
      const facts = await aiService.surpriseFunFacts({
        apiKey: geminiApiKey,
        destination,
      });
      if (facts.length === 0) {
        toast.error('La IA no devolvió curiosidades');
        return;
      }
      onChange(facts);
      toast.success('Curiosidades generadas');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron generar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface-card, #fff)',
        border: '1px dashed var(--color-silver-mist, #e5e5ea)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 10 }}>
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '.18em' }}
        >
          Curiosidades del destino · IA · opcional
        </span>
        <div className="flex items-center" style={{ gap: 6 }}>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              aria-label="Borrar curiosidades"
              style={{
                background: 'none',
                border: 'none',
                color: '#a1a1a6',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={loading || !destination}
            className="transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{
              background: '#a64dff',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {value.length > 0 ? 'Regenerar' : 'Generar con IA'}
          </button>
        </div>
      </div>

      {!geminiApiKey && (
        <p
          className="flex items-center text-graphite"
          style={{ fontSize: 11, gap: 6, marginBottom: 8 }}
        >
          <KeyRound className="h-3 w-3" />
          Añade tu API key de Gemini en Ajustes para activar esta función.
        </p>
      )}

      {value.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {value.map((f, i) => (
            <li
              key={i}
              style={{
                padding: '8px 10px',
                background: 'rgba(166,77,255,.06)',
                borderRadius: 8,
                marginBottom: 4,
                fontSize: 13,
                color: 'var(--color-ink)',
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: '#a64dff', fontWeight: 700, marginRight: 6 }}>✦ {i + 1}.</span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
