import { useState } from 'react';
import { Plus, Trash2, Check, Sparkles } from 'lucide-react';
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

interface Template {
  key: string;
  label: string;
  emoji: string;
  items: string[];
}

const TEMPLATES: Template[] = [
  {
    key: 'cultural',
    label: 'Escapada cultural',
    emoji: '🏛️',
    items: [
      'Reservar entradas a museos',
      'Cargar mapa offline de la ciudad',
      'Llevar calzado cómodo',
      'Comprobar horario de visitas guiadas',
      'Sacar efectivo para propinas',
      'Llevar adaptador de cargador',
    ],
  },
  {
    key: 'carretera',
    label: 'Viaje de carretera',
    emoji: '🛣️',
    items: [
      'Revisar presión de neumáticos',
      'Comprobar nivel de aceite y refrigerante',
      'Cargar líquido del parabrisas',
      'Llevar triángulos y chaleco',
      'Cargar música y podcasts offline',
      'Snacks y botellas de agua',
      'Documentación + carnet',
      'Tarjeta de la grúa / seguro',
    ],
  },
  {
    key: 'romantica',
    label: 'Escapada romántica',
    emoji: '💖',
    items: [
      'Reservar restaurante con vistas',
      'Llevar ropa elegante para la cena',
      'Cargar la cámara / móvil',
      'Pequeño detalle sorpresa',
      'Playlist compartida en el coche',
      'Confirmar el check-in del hotel',
    ],
  },
];

export const TripChecklist = ({ items, onAdd, onToggle, onDelete }: Props) => {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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

  const applyTemplate = async (tpl: Template) => {
    setTemplatesOpen(false);
    const existing = new Set(items.map((i) => i.text.toLowerCase().trim()));
    for (const t of tpl.items) {
      if (!existing.has(t.toLowerCase().trim())) {
        await onAdd(t);
      }
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
          background: 'var(--surface-canvas)',
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: 10,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--color-success-500, #1cb05c)',
            transition: 'width .25s ease',
          }}
        />
      </div>

      <div
        className="flex items-center justify-between"
        style={{ marginTop: 14, gap: 8, position: 'relative' }}
      >
        <span className="text-graphite" style={{ fontSize: 11 }}>
          ¿Empezar desde una plantilla?
        </span>
        <button
          type="button"
          onClick={() => setTemplatesOpen((v) => !v)}
          className="transition-colors hover:bg-fog"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-graphite)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Sparkles className="h-3 w-3" />
          Plantillas
        </button>
        {templatesOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: '#fff',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 14,
              boxShadow: '0 12px 32px rgba(0,0,0,.12)',
              padding: 6,
              minWidth: 220,
              zIndex: 20,
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t)}
                className="transition-colors hover:bg-fog"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span>
                  {t.label}
                  <br />
                  <span style={{ fontSize: 11, color: '#a1a1a6', fontWeight: 400 }}>
                    + {t.items.length} tareas
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-2"
        style={{ marginTop: 10 }}
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
            background: 'var(--color-ink)',
            color: 'var(--color-snow)',
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
                background: 'var(--surface-card)',
                border: '1px dashed var(--color-silver-mist)',
                borderRadius: 999,
                padding: '5px 10px',
                fontSize: 12,
                color: 'var(--color-graphite)',
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
                border: `1.5px solid ${item.done ? 'var(--color-success-500, #1cb05c)' : 'var(--color-silver-mist)'}`,
                background: item.done ? 'var(--color-success-500, #1cb05c)' : 'var(--surface-card)',
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
                color: item.done ? 'var(--color-mist)' : 'var(--color-ink)',
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
