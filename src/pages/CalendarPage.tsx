import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Wrench,
  ShieldCheck,
  FileText,
  Route as RouteIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  format,
  parseISO,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useVehicle } from '../hooks/useVehicle';
import { maintenanceService } from '../services/maintenance.service';
import { insuranceService } from '../services/insurance.service';
import { documentsService } from '../services/documents.service';
import { tripsService } from '../services/trips.service';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';

type EventType = 'maintenance' | 'insurance' | 'document' | 'trip';

interface CalendarEvent {
  id: string;
  date: Date;
  endDate?: Date;
  type: EventType;
  title: string;
  subtitle?: string;
  vehicleId: string;
  vehicleLabel: string;
  href: string;
}

const TYPE_META: Record<EventType, { label: string; color: string; icon: LucideIcon }> = {
  maintenance: { label: 'Mantenimiento', color: '#c77700', icon: Wrench },
  insurance: { label: 'Seguro', color: '#0071e3', icon: ShieldCheck },
  document: { label: 'Documento', color: '#7c3aed', icon: FileText },
  trip: { label: 'Viaje', color: '#1a9e3f', icon: RouteIcon },
};

const ALL_TYPES: EventType[] = ['maintenance', 'insurance', 'document', 'trip'];
const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export const CalendarPage = () => {
  const { vehicles, fetchVehicles, loading } = useVehicle();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [view, setView] = useState<'agenda' | 'month'>('agenda');
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [typeFilter, setTypeFilter] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [vehicleFilter, setVehicleFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (vehicles.length === 0) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    Promise.all(
      vehicles.map(async (v) => {
        const label = `${v.brand} ${v.model}`;
        const [records, policies, docs, trips] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => []),
          insuranceService.getByVehicle(v.id).catch(() => []),
          documentsService.getByVehicle(v.id).catch(() => []),
          tripsService.getByVehicle(v.id).catch(() => []),
        ]);
        const out: CalendarEvent[] = [];
        for (const r of records) {
          if (!r.next_service_date) continue;
          out.push({
            id: `m-${r.id}`,
            date: parseISO(r.next_service_date),
            type: 'maintenance',
            title: r.type,
            subtitle: 'Próximo servicio',
            vehicleId: v.id,
            vehicleLabel: label,
            href: '/maintenance',
          });
        }
        for (const p of policies) {
          if (!p.end_date) continue;
          out.push({
            id: `i-${p.id}`,
            date: parseISO(p.end_date),
            type: 'insurance',
            title: `Renovar póliza · ${p.provider}`,
            subtitle: p.coverage_type.replace(/_/g, ' '),
            vehicleId: v.id,
            vehicleLabel: label,
            href: '/insurance',
          });
        }
        for (const d of docs) {
          if (!d.expiry_date) continue;
          out.push({
            id: `d-${d.id}`,
            date: parseISO(d.expiry_date),
            type: 'document',
            title: d.doc_type,
            subtitle: d.file_name ?? 'Vence',
            vehicleId: v.id,
            vehicleLabel: label,
            href: '/documents',
          });
        }
        for (const t of trips) {
          if (!t.start_datetime) continue;
          const statusLabel =
            t.status === 'planning'
              ? 'Planificado'
              : t.status === 'confirmed'
                ? 'Confirmado'
                : 'Completado';
          out.push({
            id: `t-${t.id}`,
            date: parseISO(t.start_datetime),
            endDate: t.end_datetime ? parseISO(t.end_datetime) : undefined,
            type: 'trip',
            title: t.title ?? `${t.start_location ?? '—'} → ${t.end_location ?? '—'}`,
            subtitle: statusLabel,
            vehicleId: v.id,
            vehicleLabel: label,
            href: '/trips',
          });
        }
        return out;
      }),
    )
      .then((arrays) => {
        const flat = arrays.flat().sort((a, b) => a.date.getTime() - b.date.getTime());
        setEvents(flat);
      })
      .finally(() => setEventsLoading(false));
  }, [vehicles]);

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (e) => typeFilter.has(e.type) && (vehicleFilter === 'all' || e.vehicleId === vehicleFilter),
      ),
    [events, typeFilter, vehicleFilter],
  );

  const today = useMemo(() => startOfDay(new Date()), []);

  const agendaGroups = useMemo(() => {
    const byKey = new Map<string, { label: string; date: Date; items: CalendarEvent[] }>();
    const groups: { label: string; date: Date; items: CalendarEvent[] }[] = [];
    for (const e of filteredEvents) {
      const k = format(e.date, 'yyyy-MM-dd');
      let g = byKey.get(k);
      if (!g) {
        g = {
          label: format(e.date, "EEEE d 'de' MMMM yyyy", { locale: es }),
          date: startOfDay(e.date),
          items: [],
        };
        byKey.set(k, g);
        groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }, [filteredEvents]);

  const upcomingGroups = useMemo(
    () => agendaGroups.filter((g) => g.date.getTime() >= today.getTime()),
    [agendaGroups, today],
  );
  const pastGroups = useMemo(
    () => agendaGroups.filter((g) => g.date.getTime() < today.getTime()).reverse(),
    [agendaGroups, today],
  );

  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of filteredEvents) {
      if (e.endDate && e.type === 'trip') {
        const days = eachDayOfInterval({
          start: startOfDay(e.date),
          end: startOfDay(e.endDate),
        });
        for (const d of days) {
          const k = format(d, 'yyyy-MM-dd');
          const arr = m.get(k) ?? [];
          arr.push(e);
          m.set(k, arr);
        }
      } else {
        const k = format(e.date, 'yyyy-MM-dd');
        const arr = m.get(k) ?? [];
        arr.push(e);
        m.set(k, arr);
      }
    }
    return m;
  }, [filteredEvents]);

  const toggleType = (t: EventType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      // Nunca dejamos el filtro vacío: si el usuario quita el último,
      // restablecemos todos los tipos para no mostrar una pantalla en blanco.
      if (next.size === 0) return new Set(ALL_TYPES);
      return next;
    });
  };

  const totalUpcoming = upcomingGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="px-6 sm:px-10 py-10">
      <header className="flex items-end justify-between mb-8 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            Tu garaje · {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Calendario.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{totalUpcoming}</span> eventos por
            delante · mantenimientos, seguros, documentos y viajes en un solo lugar.
          </p>
        </div>

        <div
          className="liquid-glass-secondary"
          style={{ display: 'inline-flex', padding: 4, borderRadius: 999, gap: 2 }}
        >
          {(['agenda', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="focus-ring"
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontSize: 13,
                fontWeight: view === v ? 600 : 400,
                color: view === v ? 'var(--color-snow)' : 'var(--color-ink)',
                background: view === v ? 'var(--color-ink)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {v === 'agenda' ? 'Agenda' : 'Mes'}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {ALL_TYPES.map((t) => {
          const meta = TYPE_META[t];
          const active = typeFilter.has(t);
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className="focus-ring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 500,
                fontSize: 12,
                background: active ? meta.color : 'var(--color-snow)',
                color: active ? 'var(--color-snow)' : 'var(--color-slate)',
                border: `1px solid ${active ? meta.color : 'var(--color-silver-mist)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={12} strokeWidth={2} /> {meta.label}
            </button>
          );
        })}
        {vehicles.length > 1 && (
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{
              marginLeft: 'auto',
              padding: '7px 14px',
              borderRadius: 999,
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--color-snow)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-silver-mist)',
              cursor: 'pointer',
            }}
          >
            <option value="all">Todos los vehículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model}
                {v.license_plate ? ` · ${v.license_plate}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading || eventsLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin eventos programados"
          description="Cuando añadas fechas a mantenimientos, seguros, documentos o viajes, aparecerán aquí."
        />
      ) : view === 'agenda' ? (
        <AgendaView
          upcoming={upcomingGroups}
          past={pastGroups}
          today={today}
          onSelect={(e) => navigate(e.href)}
        />
      ) : (
        <MonthView
          cursor={cursor}
          setCursor={setCursor}
          days={gridDays}
          eventsByDay={eventsByDay}
          today={today}
          onSelect={(e) => navigate(e.href)}
        />
      )}
    </div>
  );
};

// ─── Agenda view ────────────────────────────────────────────────────────────

interface AgendaGroup {
  label: string;
  date: Date;
  items: CalendarEvent[];
}

const AgendaView = ({
  upcoming,
  past,
  today,
  onSelect,
}: {
  upcoming: AgendaGroup[];
  past: AgendaGroup[];
  today: Date;
  onSelect: (e: CalendarEvent) => void;
}) => {
  const [showPast, setShowPast] = useState(false);
  return (
    <>
      <span
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 11, letterSpacing: '0.14em', display: 'block', marginBottom: 12 }}
      >
        Próximos
      </span>
      {upcoming.length === 0 ? (
        <p className="font-text text-graphite" style={{ fontSize: 14 }}>
          Nada en el horizonte. Disfruta de la calma.
        </p>
      ) : (
        <ul className="space-y-6">
          {upcoming.map((g) => (
            <AgendaDay key={g.date.toISOString()} group={g} today={today} onSelect={onSelect} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="font-mono uppercase text-graphite focus-ring"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            {showPast ? '▾' : '▸'} Pasados ({past.reduce((s, g) => s + g.items.length, 0)})
          </button>
          {showPast && (
            <ul className="space-y-6" style={{ marginTop: 12, opacity: 0.7 }}>
              {past.map((g) => (
                <AgendaDay key={g.date.toISOString()} group={g} today={today} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
};

const AgendaDay = ({
  group,
  today,
  onSelect,
}: {
  group: AgendaGroup;
  today: Date;
  onSelect: (e: CalendarEvent) => void;
}) => {
  const daysFromNow = differenceInCalendarDays(group.date, today);
  const relative =
    daysFromNow === 0
      ? 'hoy'
      : daysFromNow === 1
        ? 'mañana'
        : daysFromNow === -1
          ? 'ayer'
          : daysFromNow > 0
            ? `en ${daysFromNow} días`
            : `hace ${Math.abs(daysFromNow)} días`;
  return (
    <li>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 12,
        }}
      >
        <span
          className="font-text text-ink"
          style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}
        >
          {group.label}
        </span>
        <span
          className="font-mono uppercase text-mist"
          style={{ fontSize: 10, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}
        >
          {relative}
        </span>
      </div>
      <ul className="space-y-2">
        {group.items.map((e) => (
          <EventRow key={e.id} event={e} onSelect={onSelect} />
        ))}
      </ul>
    </li>
  );
};

const EventRow = ({
  event,
  onSelect,
}: {
  event: CalendarEvent;
  onSelect: (e: CalendarEvent) => void;
}) => {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  return (
    <li>
      <button
        onClick={() => onSelect(event)}
        className="bg-snow border border-silver-mist focus-ring"
        style={{
          width: '100%',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={(ev) => {
          (ev.currentTarget as HTMLElement).style.borderColor = meta.color;
        }}
        onMouseLeave={(ev) => {
          (ev.currentTarget as HTMLElement).style.borderColor = 'var(--color-silver-mist)';
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${meta.color}1f`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={1.8} style={{ color: meta.color }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-text text-ink"
            style={{
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.title}
          </div>
          <div
            className="font-text text-graphite"
            style={{
              fontSize: 12,
              marginTop: 2,
              lineHeight: 1.3,
              textTransform: 'capitalize',
            }}
          >
            {event.vehicleLabel}
            {event.subtitle ? ` · ${event.subtitle}` : ''}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-text)',
            fontSize: 16,
            color: 'var(--color-mist)',
          }}
        >
          →
        </span>
      </button>
    </li>
  );
};

// ─── Month view ─────────────────────────────────────────────────────────────

const MonthView = ({
  cursor,
  setCursor,
  days,
  eventsByDay,
  today,
  onSelect,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: Date;
  onSelect: (e: CalendarEvent) => void;
}) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];
  }, [selectedDay, eventsByDay]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          aria-label="Mes anterior"
          className="focus-ring"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'var(--color-snow)',
            border: '1px solid var(--color-silver-mist)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.8} />
        </button>
        <h2
          className="font-display text-ink"
          style={{
            fontSize: 22,
            fontWeight: 600,
            textTransform: 'capitalize',
            letterSpacing: '-0.3px',
            margin: 0,
          }}
        >
          {format(cursor, "MMMM 'de' yyyy", { locale: es })}
        </h2>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="Mes siguiente"
          className="focus-ring"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'var(--color-snow)',
            border: '1px solid var(--color-silver-mist)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => {
            setCursor(startOfMonth(today));
            setSelectedDay(today);
          }}
          className="font-mono uppercase text-graphite focus-ring"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Hoy →
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 6,
        }}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="font-mono text-mist"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textAlign: 'center',
              padding: '6px 0',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d) => {
          const k = format(d, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(k) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isSelected = selectedDay != null && isSameDay(d, selectedDay);
          return (
            <button
              key={k}
              onClick={() => setSelectedDay(d)}
              className="focus-ring"
              style={{
                background: isSelected
                  ? 'var(--color-ink)'
                  : isToday
                    ? 'var(--color-fog)'
                    : 'var(--color-snow)',
                color: isSelected
                  ? 'var(--color-snow)'
                  : inMonth
                    ? 'var(--color-ink)'
                    : 'var(--color-mist)',
                border: `1px solid ${isToday && !isSelected ? 'var(--color-azure)' : 'var(--color-silver-mist)'}`,
                borderRadius: 10,
                minHeight: 68,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: inMonth ? 1 : 0.45,
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, var(--font-sf-pro-text)',
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {format(d, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    marginTop: 'auto',
                    alignItems: 'center',
                  }}
                >
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: TYPE_META[e.type].color,
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span
                      style={{
                        fontSize: 9,
                        color: isSelected ? 'var(--color-snow)' : 'var(--color-graphite)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1,
                      }}
                    >
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop: 28 }}>
          <span
            className="font-mono uppercase text-graphite"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              display: 'block',
              marginBottom: 12,
            }}
          >
            {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
          </span>
          {selectedEvents.length === 0 ? (
            <p className="font-text text-graphite" style={{ fontSize: 14 }}>
              Sin eventos este día.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <EventRow key={e.id} event={e} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
