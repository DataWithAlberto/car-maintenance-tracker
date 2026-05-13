import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, RotateCcw } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { DashboardWidget } from '../../hooks/useDashboardPrefs';
import { useAnalytics } from '../../hooks/useAnalytics';

interface Props {
  hidden: DashboardWidget[];
  order: DashboardWidget[];
  toggle: (w: DashboardWidget) => void;
  reorder: (next: DashboardWidget[]) => void;
  reset: () => void;
  onClose: () => void;
}

const WIDGET_KEYS: DashboardWidget[] = [
  'kilometraje', 'mantenimiento', 'gastos', 'flota',
];

export const CustomizePanel = ({
  hidden, order, toggle, reorder, reset, onClose,
}: Props) => {
  const { t } = useTranslation();
  const { track } = useAnalytics();

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as DashboardWidget);
    const newIndex = order.indexOf(over.id as DashboardWidget);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    reorder(next);
    track('dashboard_customize_reorder', {
      widget: String(active.id),
      from: oldIndex,
      to: newIndex,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20,22,28,0.42)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fade-in 0.2s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 24,
        border: '1px solid #e8e8ed',
        maxWidth: 480, width: '100%', maxHeight: '90vh',
        padding: 28, overflowY: 'auto',
        fontFamily: 'Inter, var(--font-sf-pro-text)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 id="customize-title" style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 600, fontSize: 20, letterSpacing: '-0.3px',
            color: '#1d1d1f', margin: 0,
          }}>
            {t('dashboard.customize.title')}
          </h3>
          <button
            type="button"
            onClick={() => {
              reset();
              track('dashboard_customize_reset');
            }}
            aria-label={t('dashboard.customize.resetAria')}
            style={{
              all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: '#0071e3', fontWeight: 500,
            }}
          >
            <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
            {t('dashboard.customize.reset')}
          </button>
        </div>
        <p style={{
          margin: '0 0 18px', fontSize: 13, color: '#707070', lineHeight: 1.45,
        }}>
          {t('dashboard.customize.subtitle')}
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.map((key) => (
                <SortableRow
                  key={key}
                  widget={key}
                  visible={!hidden.includes(key)}
                  onToggle={() => {
                    toggle(key);
                    track('dashboard_customize_toggle', {
                      widget: key,
                      visible: hidden.includes(key),
                    });
                  }}
                />
              ))}
              {/* Forward-compat: any widget not yet in the saved order — */}
              {WIDGET_KEYS.filter((k) => !order.includes(k)).map((key) => (
                <SortableRow
                  key={key}
                  widget={key}
                  visible={!hidden.includes(key)}
                  onToggle={() => toggle(key)}
                  notSortable
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button type="button" className="pill-dark" onClick={onClose}>
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  widget: DashboardWidget;
  visible: boolean;
  onToggle: () => void;
  notSortable?: boolean;
}

const SortableRow = ({ widget, visible, onToggle, notSortable }: RowProps) => {
  const { t } = useTranslation();
  const sortable = useSortable({ id: widget, disabled: notSortable });
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = sortable;

  const label = t(`dashboard.customize.widgets.${widget}`);
  const description = t(`dashboard.customize.widgets.${widget}Desc`);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 14,
          background: isDragging ? '#fff' : '#f5f5f7',
          border: isDragging ? '1px solid #0071e3' : '1px solid transparent',
        }}
      >
        <button
          type="button"
          aria-label={t('dashboard.customize.dragHandleAria', { label })}
          {...attributes}
          {...listeners}
          disabled={notSortable}
          style={{
            all: 'unset',
            cursor: notSortable ? 'not-allowed' : 'grab',
            color: notSortable ? '#d2d2d7' : '#a1a1a6',
            display: 'inline-flex', padding: 4,
            borderRadius: 6,
            touchAction: 'none',
          }}
        >
          <GripVertical size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 14, flex: 1,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={visible}
            onChange={onToggle}
            aria-label={t('dashboard.customize.visibilityAria', {
              label,
              state: visible
                ? t('dashboard.customize.visible')
                : t('dashboard.customize.hidden'),
            })}
            style={{ width: 18, height: 18, accentColor: '#0071e3', cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>
              {label}
            </div>
            <div style={{ fontSize: 12, color: '#707070', marginTop: 2 }}>
              {description}
            </div>
          </div>
        </label>
      </div>
    </li>
  );
};
