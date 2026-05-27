import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Car, ChevronDown } from 'lucide-react';
import { LordIcon } from '../ui/LordIcon';
import { useThemeStore } from '../../store/themeStore';

export interface FloatingDockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optional Lordicon CDN URL — if provided, animated icon is shown instead of Lucide */
  lordSrc?: string;
  href: string;
  badge?: number;
}

export interface FloatingDockGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optional Lordicon CDN URL for the group header icon */
  lordSrc?: string;
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
  const theme = useThemeStore((s) => s.theme);

  // Debounce del cierre: cuando react-router navega a una ruta lazy-loaded,
  // el Suspense fallback puede desplazar el layout 1-2px, disparando un
  // mouseleave transitorio sobre el rail que colapsa el submenu antes de
  // que el usuario complete la interacción. 220ms es suficiente para
  // absorber esos rebotes sin que se note "pegajoso" si el usuario se va
  // de verdad.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHovered(false), 220);
  };
  useEffect(() => () => cancelClose(), []);

  // Hex colors for Lordicon (no CSS vars allowed). When item is "active" we
  // invert the icon to match the inverted background (--color-ink).
  const themeInk = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';

  // Group currently under the cursor — opens its children on hover.
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  // Reset hovered group when the rail closes
  useEffect(() => {
    if (!open && hoveredGroup !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHoveredGroup(null);
    }
  }, [open, hoveredGroup]);

  const renderLeaf = (it: FloatingDockItem, nested = false) => {
    const isActive = it.id === activeId;
    const Icon = it.icon;
    return (
      <Link
        key={it.id}
        to={it.href}
        className={
          isActive ? 'dock-leaf focus-ring liquid-glass-secondary' : 'dock-leaf focus-ring'
        }
        aria-current={isActive ? 'page' : undefined}
        title={!open ? it.label : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: open ? (nested ? 10 : 12) : 0,
          padding: open ? (nested ? '7px 10px' : '9px 10px') : '9px 0',
          borderRadius: nested ? 12 : 14,
          cursor: 'pointer',
          textDecoration: 'none',
          color: isActive ? 'var(--color-azure)' : 'var(--color-slate)',
          fontFamily: 'Inter, var(--font-sf-pro-text)',
          fontWeight: isActive ? 600 : 400,
          fontSize: nested ? 13 : 14,
          lineHeight: 1,
          justifyContent: open ? 'flex-start' : 'center',
          transition:
            'padding 0.3s var(--ease-out-expo), color 0.2s ease-out, background-color 0.2s ease-out',
        }}
      >
        {/* Indicador del item activo — barrita pulsante a la izquierda.
            Solo en items top-level (no anidados) para no competir con la
            línea vertical del submenu. */}
        {isActive && !nested && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 18,
              borderRadius: 999,
              background: 'var(--color-azure)',
              animation: 'var(--animate-counter-in)',
            }}
          />
        )}
        <span
          className="dock-leaf-icon"
          style={{
            width: nested ? 20 : 24,
            height: nested ? 20 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isActive ? 'var(--color-azure)' : 'var(--color-ink)',
          }}
        >
          {it.lordSrc ? (
            <LordIcon
              src={it.lordSrc}
              trigger={isActive ? 'loop' : 'hover'}
              size={nested ? 16 : 18}
              primaryColor={isActive ? '#0071e3' : themeInk}
              secondaryColor={isActive ? '#0071e3' : themeInk}
              stroke="regular"
            />
          ) : (
            <Icon size={nested ? 16 : 18} strokeWidth={1.6} />
          )}
        </span>
        {/* Label: siempre montado, su visibilidad y desplazamiento se animan.
            maxWidth colapsa el espacio cuando el rail está cerrado para que
            el icono pueda centrarse. */}
        <span
          aria-hidden={!open}
          style={{
            flex: open ? 1 : '0 0 auto',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: open ? 320 : 0,
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(-6px)',
            transition:
              'opacity 0.22s ease-out, transform 0.28s var(--ease-out-expo), max-width 0.32s var(--ease-out-expo)',
            transitionDelay: open ? '0.12s' : '0s',
          }}
        >
          {it.label}
        </span>
        {it.badge != null && open && (
          <span
            style={{
              minWidth: 18,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: isActive ? 'var(--color-azure)' : '#b64400',
              color: 'var(--color-snow)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 600,
              fontSize: 10,
              lineHeight: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'opacity 0.22s ease-out, transform 0.28s var(--ease-out-expo)',
              transitionDelay: open ? '0.18s' : '0s',
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
    /* Children show when: rail is open AND (this group is hovered OR contains the active route). */
    const showChildren = open && (hoveredGroup === g.id || childActive);
    /* Inverted header only when the active page is hidden inside a collapsed group. */
    const headerActive = childActive && !showChildren;

    return (
      <div
        key={g.id}
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        onMouseEnter={() => setHoveredGroup(g.id)}
        onMouseLeave={() => setHoveredGroup(null)}
      >
        <button
          type="button"
          className={
            headerActive ? 'dock-leaf focus-ring liquid-glass-secondary' : 'dock-leaf focus-ring'
          }
          aria-expanded={showChildren}
          title={!open ? g.label : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: open ? 12 : 0,
            width: '100%',
            padding: open ? '9px 10px' : '9px 0',
            borderRadius: 14,
            cursor: 'pointer',
            color: headerActive ? 'var(--color-azure)' : 'var(--color-slate)',
            fontFamily: 'Inter, var(--font-sf-pro-text)',
            fontWeight: childActive ? 600 : 400,
            fontSize: 14,
            lineHeight: 1,
            justifyContent: open ? 'flex-start' : 'center',
            transition:
              'padding 0.3s var(--ease-out-expo), color 0.2s ease-out, background-color 0.2s ease-out',
          }}
        >
          <span
            className="dock-leaf-icon"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: headerActive ? 'var(--color-azure)' : 'var(--color-ink)',
            }}
          >
            {g.lordSrc ? (
              <LordIcon
                src={g.lordSrc}
                trigger="hover"
                size={18}
                primaryColor={headerActive ? '#0071e3' : themeInk}
                secondaryColor={headerActive ? '#0071e3' : themeInk}
                stroke="regular"
              />
            ) : (
              <Icon size={18} strokeWidth={1.6} />
            )}
          </span>
          <span
            aria-hidden={!open}
            style={{
              flex: open ? 1 : '0 0 auto',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: open ? 320 : 0,
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-6px)',
              transition:
                'opacity 0.22s ease-out, transform 0.28s var(--ease-out-expo), max-width 0.32s var(--ease-out-expo)',
              transitionDelay: open ? '0.12s' : '0s',
            }}
          >
            {g.label}
          </span>
          {open && (
            <ChevronDown
              size={15}
              strokeWidth={1.8}
              style={{
                flexShrink: 0,
                transform: showChildren ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                color: headerActive ? 'var(--color-azure)' : 'var(--color-mist)',
                opacity: open ? 1 : 0,
                transitionDelay: open ? '0.18s' : '0s',
              }}
            />
          )}
        </button>

        {/* Collapsible children — smooth height animation via grid-template-rows.
            Always mounted so the transition runs; visibility is controlled by
            grid row size, opacity and pointer-events. */}
        <div
          aria-hidden={!showChildren}
          style={{
            display: 'grid',
            gridTemplateRows: showChildren ? '1fr' : '0fr',
            opacity: showChildren ? 1 : 0,
            transform: showChildren ? 'translateY(0)' : 'translateY(-4px)',
            transition:
              'grid-template-rows 260ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease-out, transform 240ms ease-out',
            pointerEvents: showChildren ? 'auto' : 'none',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginLeft: 22,
                paddingLeft: 10,
                paddingTop: 4,
                borderLeft: '1px solid var(--color-silver-mist)',
              }}
            >
              {g.children.map((c) => renderLeaf(c, true))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      className="liquid-glass dock-rail hidden md:flex"
      onMouseEnter={() => {
        cancelClose();
        setHovered(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        cancelClose();
        setHovered(true);
      }}
      onBlurCapture={scheduleClose}
      style={{
        position: 'fixed',
        left: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: open ? 232 : 60,
        maxHeight: 'min(800px, calc(100vh - 40px))',
        borderRadius: 38,
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
