import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import type { TripChecklistItem } from '../../types';

interface Props {
  items: TripChecklistItem[];
  onAdd: (text: string) => Promise<void>;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const SUGGESTIONS = [
  'Revisar presión de neumáticos',
  'Comprobar nivel de aceite',
  'Llevar segunda llave',
  'Documentación + carnet',
  'Cargar líquidos (parabrisas, refrigerante)',
];

export const TripChecklist = ({ items, onAdd, onToggle, onDelete }: Props) => {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (value: string) => {
    if (!value.trim()) return;
    setAdding(true);
    try {
      await onAdd(value.trim());
      setText('');
    } finally {
      setAdding(false);
    }
  };

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div
      className="bg-snow"
      style={{
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 18,
        padding: '20px 24px',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '.16em' }}
        >
          § Preparativos del viaje
        </span>
        <span className="font-mono tabular-nums text-graphite" style={{ fontSize: 12 }}>
          {done}/{items.length} · {pct}%
        </span>
      </div>

      <div
        style={{
          height: 4,
          background: '#f5f5f7',
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: 10,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#1cb05c',
            transition: 'width .25s ease',
          }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-2"
        style={{ marginTop: 14 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Añadir tarea…"
          className="flex-1 bg-snow border border-silver-mist rounded-[12px] px-3 py-2 text-ink font-text focus:outline-none focus:border-azure"
          style={{ fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={adding || !text.trim()}
          className="transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{
            background: '#1d1d1f',
            color: '#fff',
            borderRadius: 999,
            border: 'none',
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus className="h-4 w-4" /> Añadir
        </button>
      </form>

      {items.length === 0 && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="transition-colors hover:bg-fog"
              style={{
                background: '#fff',
                border: '1px dashed var(--color-silver-mist)',
                borderRadius: 999,
                padding: '5px 10px',
                fontSize: 12,
                color: '#707070',
                cursor: 'pointer',
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <ul style={{ marginTop: 14, listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-center"
            style={{
              gap: 10,
              padding: '10px 0',
              borderTop: '1px solid var(--color-silver-mist)',
            }}
          >
            <button
              type="button"
              onClick={() => onToggle(item.id, !item.done)}
              aria-label={item.done ? 'Marcar como pendiente' : 'Completar'}
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                border: `1.5px solid ${item.done ? '#1cb05c' : 'var(--color-silver-mist)'}`,
                background: item.done ? '#1cb05c' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {item.done && <Check className="h-3 w-3" color="#fff" strokeWidth={3} />}
            </button>
            <span
              style={{
                flex: 1,
                fontSize: 14,
                color: item.done ? '#a1a1a6' : 'var(--color-ink)',
                textDecoration: item.done ? 'line-through' : 'none',
              }}
            >
              {item.text}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              aria-label="Eliminar tarea"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-graphite hover:text-[#b64400]"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
