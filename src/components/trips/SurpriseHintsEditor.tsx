import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

const PLACEHOLDERS = [
  'Está en España',
  'Es ciudad universitaria con catedral',
  'Tiene un río atravesándola',
  'Famosa por su cordero asado',
];

/* Editor de pistas progresivas para la pantalla bloqueada de la sorpresa.
 * El backend revela 1 pista nueva cada día desde created_at hasta reveal_date. */
export const SurpriseHintsEditor = ({ value, onChange }: Props) => {
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    onChange([...value, text.trim()]);
    setText('');
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const placeholder = PLACEHOLDERS[value.length % PLACEHOLDERS.length];

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
          Pistas progresivas · opcional
        </span>
        <span className="font-mono text-graphite" style={{ fontSize: 10 }}>
          {value.length} {value.length === 1 ? 'pista' : 'pistas'}
        </span>
      </div>

      {value.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
          {value.map((h, i) => (
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
              <GripVertical className="h-3 w-3 text-graphite flex-shrink-0" />
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: '#FF5A5F',
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  minWidth: 26,
                }}
              >
                D{i + 1}
              </span>
              <span style={{ flex: 1, color: 'var(--color-ink)' }}>{h}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Quitar pista"
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
          placeholder={placeholder}
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
        Se desvela 1 pista nueva cada día hasta la fecha del reveal.
      </p>
    </div>
  );
};
