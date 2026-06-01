import { useState } from 'react';
import { Plus, Trash2, MapPin, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/* Editor de paradas de la ruta del tour animado del reveal.
 * Orden importa: el mapa vuela parada a parada en esta secuencia. */
export const SurpriseRouteStopsEditor = ({ value, onChange }: Props) => {
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    onChange([...value, text.trim()]);
    setText('');
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
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
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '.18em' }}
        >
          Ruta del vuelo · opcional
        </span>
        <span className="font-mono text-graphite" style={{ fontSize: 10 }}>
          {value.length} {value.length === 1 ? 'parada' : 'paradas'}
        </span>
      </div>

      {value.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
          {value.map((stop, i) => (
            <li
              key={i}
              className="group flex items-center"
              style={{
                gap: 8,
                padding: '6px 8px',
                background: 'var(--color-fog, #f5f5f7)',
                borderRadius: 8,
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: '#FF5A5F',
                  fontWeight: 700,
                  minWidth: 18,
                }}
              >
                {i + 1}
              </span>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF5A5F' }} />
              <span style={{ flex: 1, color: 'var(--color-ink)' }}>{stop}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Subir"
                className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1a6',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label="Bajar"
                className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1a6',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Quitar parada"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1a6',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center"
        style={{ gap: 6 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={value.length === 0 ? 'Gijón' : value.length === 1 ? 'Valladolid' : 'Segovia'}
          style={{
            flex: 1,
            background: 'var(--surface-card)',
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{
            background: 'var(--color-ink)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Añadir
        </button>
      </form>
      <p className="text-graphite" style={{ fontSize: 10, marginTop: 8 }}>
        El mapa volará parada a parada en este orden. Si lo dejas vacío, usa origen → destino.
      </p>
    </div>
  );
};
