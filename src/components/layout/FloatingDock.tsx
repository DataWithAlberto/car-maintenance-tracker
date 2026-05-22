import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Car, ChevronDown } from 'lucide-react';

export interface FloatingDockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

export interface FloatingDockGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: FloatingDockItem[];
}

export type FloatingDockEntry = FloatingDockItem | FloatingDockGroup;

function isGroup(entry: FloatingDockEntry): entry is FloatingDockGroup {
  return 'children' in entry;
}

export interface FloatingDockProps {
  entries: FloatingDockEntry[];
  activeId: string;
  vehicle: { brand: string; model: string; plate: string };
  user: { initials: string; name: string };
  backHref: string;
}

/**
 * FloatingDock — vehicle-scoped left rail.
 *
 * - Hover-expands from 60 → 232px; only shows labels when expanded.
 * - Entries can be leaf links or collapsible groups (accordion submenu).
 *   Collapsed rail shows one icon per top-level entry; children appear
 *   only when the rail is expanded and the group is toggled open.
 * - Zero box-shadow (DESIGN.md elevation rule).
 */
export const FloatingDock = ({ entries, activeId, vehicle, user, backHref }: FloatingDockProps) => {
  const [hovered, setHovered] = useState(false);
  const open = hovered;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  /* Auto-expand the group that owns the active route. */
  useEffect(() => {
    const owner = entries.find(
      (e): e is FloatingDockGroup => isGroup(e) && e.children.some((c) => c.id === activeId),
    );
    if (!owner) return;
    setOpenGroups((prev) => {
      if (prev.has(owner.id)) return prev;
      const next = new Set(prev);
      next.add(owner.id);
      return next;
    });
  }, [activeId, entries]);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLeaf = (it: FloatingDockItem, nested = false) => {
    const isActive = it.id === activeId;
    const Icon = it.icon;
    return (
      <Link
        key={it.id}
        to={it.href}
        className="focus-ring"
        aria-current={isActive ? 'page' : undefined}
        title={!open ? it.label : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: nested ? 10 : 12,
          padding: open ? (nested ? '7px 10px' : '9px 10px') : '9px 0',
          borderRadius: nested ? 12 : 14,
          cursor: 'pointer',
          textDecoration: 'none',
          background: isActive ? 'var(--color-ink)' : 'transparent',
          color: isActive ? 'var(--color-snow)' : 'var(--color-slate)',
          fontFamily: 'Inter, var(--font-sf-pro-text)',
          fontWeight: isActive ? 600 : 400,
          fontSize: nested ? 13 : 14,
          lineHeight: 1,
          justifyContent: open ? 'flex-start' : 'center',
          transition: 'background 180ms ease, color 180ms ease',
        }}
      >
        <span
          style={{
            width: nested ? 20 : 24,
            height: nested ? 20 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isActive ? 'var(--color-snow)' : 'var(--color-ink)',
          }}
        >
          <Icon size={nested ? 16 : 18} strokeWidth={1.6} />
        </span>
        {open && (
          <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{it.label}</span>
        )}
        {it.badge != null && open && (
          <span
            style={{
              minWidth: 18,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: isActive ? 'var(--color-snow)' : '#b64400',
              color: isActive ? 'var(--color-ink)' : 'var(--color-snow)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 600,
              fontSize: 10,
              lineHeight: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {it.badge}
          </span>
        )}
        {it.badge != null && !open && (
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: '#b64400',
            }}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  };

  const renderGroup = (g: FloatingDockGroup) => {
    const Icon = g.icon;
    const childActive = g.children.some((c) => c.id === activeId);
    const isOpen = openGroups.has(g.id);
    const showChildren = open && isOpen;
    /* Dark header only when the active page is hidden inside a collapsed group. */
    const headerActive = childActive && !showChildren;

    return (
      <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          type="button"
          className="focus-ring"
          onClick={() => toggleGroup(g.id)}
          aria-expanded={isOpen}
          title={!open ? g.label : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: open ? '9px 10px' : '9px 0',
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            background: headerActive ? 'var(--color-ink)' : 'transparent',
            color: headerActive ? 'var(--color-snow)' : 'var(--color-slate)',
            fontFamily: 'Inter, var(--font-sf-pro-text)',
            fontWeight: childActive ? 600 : 400,
            fontSize: 14,
            lineHeight: 1,
            justifyContent: open ? 'flex-start' : 'center',
            transition: 'background 180ms ease, color 180ms ease',
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: headerActive ? 'var(--color-snow)' : 'var(--color-ink)',
            }}
          >
            <Icon size={18} strokeWidth={1.6} />
          </span>
          {open && (
            <>
              <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{g.label}</span>
              <ChevronDown
                size={15}
                strokeWidth={1.8}
                style={{
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 200ms ease',
                  color: headerActive ? 'var(--color-snow)' : 'var(--color-mist)',
                }}
              />
            </>
          )}
        </button>

        {showChildren && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              marginLeft: 22,
              paddingLeft: 10,
              borderLeft: '1px solid var(--color-silver-mist)',
            }}
          >
            {g.children.map((c) => renderLeaf(c, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="hidden md:flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: open ? 232 : 60,
        maxHeight: 'min(800px, calc(100vh - 40px))',
        transition: 'width 320ms cubic-bezier(.4,0,.2,1)',
        background: 'var(--color-snow)',
        borderRadius: 28,
        border: '1px solid var(--color-silver-mist)',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* ─── Vehicle logo block ───────────────────────────────────────── */}
      <div
        style={{
          padding: open ? '18px 18px 12px' : '18px 0 12px',
          textAlign: open ? 'left' : 'center',
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--color-ink)',
            color: 'var(--color-snow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Car size={18} strokeWidth={1.6} />
        </span>
        {open && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {vehicle.brand} {vehicle.model}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: '0.06em',
                color: 'var(--color-mist)',
                marginTop: 4,
              }}
            >
              {vehicle.plate}
            </div>
          </div>
        )}
      </div>

      {/* hairline */}
      <div
        style={{
          height: 1,
          background: 'var(--color-silver-mist)',
          margin: open ? '0 18px' : '0 12px',
        }}
      />

      {/* ─── Nav ──────────────────────────────────────────────────────── */}
      <nav
        aria-label="Vehículo"
        className="scrollbar-none"
        style={{
          flex: 1,
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {entries.map((entry) => (isGroup(entry) ? renderGroup(entry) : renderLeaf(entry)))}
      </nav>

      {/* hairline */}
      <div
        style={{
          height: 1,
          background: 'var(--color-silver-mist)',
          margin: open ? '0 18px' : '0 12px',
        }}
      />

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <div
        style={{
          padding: open ? '12px 10px' : '12px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: open ? 'flex-start' : 'center',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'var(--color-ink)',
            color: 'var(--color-snow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, var(--font-sf-pro-text)',
            fontWeight: 600,
            fontSize: 11,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {user.initials}
        </span>
        {open && (
          <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 500,
                fontSize: 13,
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.name}
            </div>
            <Link
              to={backHref}
              style={{
                display: 'block',
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 400,
                fontSize: 11,
                lineHeight: 1,
                color: 'var(--color-graphite)',
                marginTop: 3,
                textDecoration: 'none',
              }}
            >
              ← Garaje
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
