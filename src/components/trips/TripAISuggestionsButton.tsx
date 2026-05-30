import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import {
  useApiKeyStore,
  selectAIConfig,
  isAIReady,
  aiReadinessMessage,
} from '../../store/apiKeyStore';
import { aiService } from '../../services/claude.service';
import type { CreateTripActivityInput, TripActivityType } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  onAdd: (data: CreateTripActivityInput) => Promise<void>;
}

const TYPE_MAP: Record<string, TripActivityType> = {
  experience: 'activity',
  museum: 'museum',
  food: 'restaurant',
  lodging: 'lodging',
};

export const TripAISuggestionsButton = ({ destination, startDate, endDate, onAdd }: Props) => {
  const config = useApiKeyStore(selectAIConfig);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!destination?.trim()) {
      toast.error('Define primero el destino del viaje');
      return;
    }
    if (!isAIReady(config)) {
      toast.error(aiReadinessMessage(config) ?? 'Configura un proveedor de IA');
      return;
    }
    setLoading(true);
    try {
      const days =
        startDate && endDate
          ? Math.max(1, Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000))
          : 2;
      const suggestions = await aiService.suggestTripActivities({
        config,
        destination,
        startDate,
        days,
      });
      if (suggestions.length === 0) {
        toast.error('La IA no devolvió sugerencias');
        return;
      }
      const baseDate = startDate ? new Date(startDate) : new Date();
      for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i];
        const when = new Date(baseDate.getTime() + i * 3 * 60 * 60 * 1000);
        await onAdd({
          title: s.title,
          type: TYPE_MAP[s.type] ?? 'experience',
          provider: 'standard',
          start_datetime: when.toISOString(),
          notes: s.notes,
          is_candidate: true,
        } as CreateTripActivityInput);
      }
      toast.success(`+${suggestions.length} propuestas añadidas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron generar sugerencias');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !destination}
      className="transition-opacity hover:opacity-85 disabled:opacity-40"
      style={{
        background: '#a64dff',
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 500,
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      title={!destination ? 'Define el destino primero' : 'Sugerir actividades con IA'}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      Sugerir con IA
    </button>
  );
};
