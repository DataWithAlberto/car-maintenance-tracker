import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Car } from 'lucide-react';

export interface FloatingDockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

export interface FloatingDockProps {
  items: FloatingDockItem[];
  activeId: string;
  vehicle: { brand: string; model: string; plate: string };
  user: { initials: string; name: string };
  backHref: string;
}

/**
 * FloatingDock — vehicle-scoped left rail.
 *
 * - Hover-expands from 60 → 232px (pointer:fine only); permanently expanded on
 *   touch devices (pointer:coarse).
 * - Zero box-shadow (DESIGN.md elevation rule); container relies on the
 *   #ffffff card over #f5f5f7 canvas for separation.
 * - Pure presentational: all data comes via props.
 */
export const FloatingDock = ({
  items, activeId, vehicle, user, backHref,
}: FloatingDockProps) => {
  const [hovered, setHovered] = useState(false);

  const open = hovered;

  return (
    <aside
      className="hidden md:flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: open ? 232 : 60,
        maxHeight: 800,
        transition: 'width 320ms cubic-bezier(.4,0,.2,1)',
        background: '#ffffff',
        borderRadius: 28,
        border: '1px solid #e8e8ed',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* ─── Vehicle logo block ───────────────────────────────────────── */}
      <div style={{
        padding: open ? '18px 18px 12px' : '18px 0 12px',
        textAlign: open ? 'left' : 'center',
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: '#1d1d1f', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Car size={18} strokeWidth={1.6} />
        </span>
        {open && (
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 600, fontSize: 14, lineHeight: 1.2,
              color: '#1d1d1f',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {vehicle.brand} {vehicle.model}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500, fontSize: 10, lineHeight: 1,
              letterSpacing: '0.06em',
              color: '#a1a1a6', marginTop: 4,
            }}>
              {vehicle.plate}
            </div>
          </div>
        )}
      </div>

      {/* hairline */}
      <div style={{
        height: 1, background: '#e8e8ed',
        margin: open ? '0 18px' : '0 12px',
      }} />

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
        {items.map((it) => {
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
                gap: 12,
                padding: open ? '9px 10px' : '9px 0',
                borderRadius: 14,
                cursor: 'pointer',
                textDecoration: 'none',
                background: isActive ? '#1d1d1f' : 'transparent',
                color: isActive ? '#fff' : '#474747',
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14, lineHeight: 1,
                justifyContent: open ? 'flex-start' : 'center',
                transition: 'background 180ms ease, color 180ms ease',
              }}
            >
              <span style={{
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                color: isActive ? '#fff' : '#1d1d1f',
              }}>
                <Icon size={18} strokeWidth={1.6} />
              </span>
              {open && (
                <span style={{
                  flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
                }}>
                  {it.label}
                </span>
              )}
              {it.badge != null && open && (
                <span style={{
                  minWidth: 18, height: 18, padding: '0 6px',
                  borderRadius: 999,
                  background: isActive ? '#fff' : '#b64400',
                  color: isActive ? '#1d1d1f' : '#fff',
                  fontFamily: 'Inter, var(--font-sf-pro-text)',
                  fontWeight: 600, fontSize: 10, lineHeight: '18px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {it.badge}
                </span>
              )}
              {it.badge != null && !open && (
                <span style={{
                  position: 'absolute',
                  right: 8, top: 8,
                  width: 6, height: 6,
                  borderRadius: 999,
                  background: '#b64400',
                }} aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* hairline */}
      <div style={{
        height: 1, background: '#e8e8ed',
        margin: open ? '0 18px' : '0 12px',
      }} />

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <div style={{
        padding: open ? '12px 10px' : '12px 8px',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: open ? 'flex-start' : 'center',
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 999,
          background: '#1d1d1f', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, var(--font-sf-pro-text)',
          fontWeight: 600, fontSize: 11, lineHeight: 1,
          flexShrink: 0,
        }}>
          {user.initials}
        </span>
        {open && (
          <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 500, fontSize: 13, lineHeight: 1.2,
              color: '#1d1d1f',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.name}
            </div>
            <Link
              to={backHref}
              style={{
                display: 'block',
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 400, fontSize: 11, lineHeight: 1,
                color: '#707070', marginTop: 3,
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
