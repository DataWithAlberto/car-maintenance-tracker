import { useState } from 'react';
import { Ticket, Download, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface Props {
  destination: string;
  startDate?: string | null;
  startLocation?: string | null;
  passengerName?: string | null;
  shareToken?: string | null;
  /** Color de acento — coincide con el rojo de la marca por defecto. */
  accentColor?: string;
}

const safe = (s: string | null | undefined, fallback: string) => (s?.trim() ? s : fallback);

const formatDate = (iso?: string | null) => {
  if (!iso) return { day: '—', month: '—', time: '—' };
  try {
    const d = parseISO(iso);
    return {
      day: format(d, 'dd'),
      month: format(d, 'MMM yyyy', { locale: es }).toUpperCase(),
      time: format(d, 'HH:mm'),
    };
  } catch {
    return { day: '—', month: '—', time: '—' };
  }
};

const cityCode = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3) || 'XXX';

const seatCode = (token?: string | null) => {
  if (!token) return '23A';
  const hex = token.replace(/[^0-9a-f]/gi, '');
  const row = (parseInt(hex.slice(0, 2) || '0', 16) % 30) + 1;
  const letter = String.fromCharCode(65 + (parseInt(hex.slice(2, 4) || '0', 16) % 6));
  return `${row}${letter}`;
};

/* Boarding pass impreso en SVG (1200x500) → descargable como PNG.
 * Estética minimal: dos zonas separadas por borde punteado, like the real thing. */
export const SurpriseBoardingPass = ({
  destination,
  startDate,
  startLocation,
  passengerName,
  shareToken,
  accentColor = '#FF5A5F',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  const fromCode = cityCode(safe(startLocation, 'ORI'));
  const toCode = cityCode(destination);
  const dateParts = formatDate(startDate);
  const seat = seatCode(shareToken);
  const flight = `FC${(seat.charCodeAt(0) % 9) + 1}${seat.replace(/[A-Z]/, '')}`;
  const passenger = safe(passengerName, 'Tú').toUpperCase();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="1200" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fafaf9"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1" fill="#c7c7cc"/>
    </pattern>
  </defs>

  <rect x="0" y="0" width="1200" height="500" rx="24" fill="url(#bg)" stroke="#e5e5ea" stroke-width="1"/>

  <!-- Banda lateral derecha (stub) -->
  <rect x="900" y="0" width="300" height="500" rx="0" fill="${accentColor}" opacity="0.06"/>
  <line x1="900" y1="20" x2="900" y2="480" stroke="#c7c7cc" stroke-width="2" stroke-dasharray="4 6"/>

  <!-- Marca arriba -->
  <text x="40" y="50" fill="${accentColor}" font-family="ui-monospace, monospace" font-size="14" font-weight="700" letter-spacing="4">✦ FOCUSHUB · BOARDING PASS</text>
  <text x="40" y="72" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">SURPRISE TRIP · NON-TRANSFERABLE</text>

  <!-- Códigos IATA -->
  <text x="40" y="200" fill="#1d1d1f" font-family="Inter, sans-serif" font-size="120" font-weight="700" letter-spacing="-4">${fromCode}</text>
  <text x="40" y="240" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2">${safe(startLocation, 'ORIGEN').toUpperCase().slice(0, 22)}</text>

  <!-- Línea con avión -->
  <line x1="320" y1="160" x2="540" y2="160" stroke="#1d1d1f" stroke-width="2" stroke-dasharray="2 6"/>
  <text x="430" y="148" text-anchor="middle" fill="${accentColor}" font-size="28">✈</text>

  <text x="560" y="200" fill="${accentColor}" font-family="Inter, sans-serif" font-size="120" font-weight="700" letter-spacing="-4">${toCode}</text>
  <text x="560" y="240" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2">${destination.toUpperCase().slice(0, 22)}</text>

  <!-- Detalles -->
  <g font-family="ui-monospace, monospace">
    <text x="40" y="320" fill="#a1a1a6" font-size="11" letter-spacing="2">PASAJERO</text>
    <text x="40" y="346" fill="#1d1d1f" font-size="22" font-weight="700">${passenger.slice(0, 22)}</text>

    <text x="280" y="320" fill="#a1a1a6" font-size="11" letter-spacing="2">FECHA</text>
    <text x="280" y="346" fill="#1d1d1f" font-size="22" font-weight="700">${dateParts.day} ${dateParts.month}</text>

    <text x="500" y="320" fill="#a1a1a6" font-size="11" letter-spacing="2">SALIDA</text>
    <text x="500" y="346" fill="#1d1d1f" font-size="22" font-weight="700">${dateParts.time}</text>

    <text x="650" y="320" fill="#a1a1a6" font-size="11" letter-spacing="2">VUELO</text>
    <text x="650" y="346" fill="#1d1d1f" font-size="22" font-weight="700">${flight}</text>

    <text x="40" y="400" fill="#a1a1a6" font-size="11" letter-spacing="2">PUERTA</text>
    <text x="40" y="426" fill="#1d1d1f" font-size="22" font-weight="700">B${seat.charAt(0)}</text>

    <text x="280" y="400" fill="#a1a1a6" font-size="11" letter-spacing="2">ASIENTO</text>
    <text x="280" y="426" fill="${accentColor}" font-size="32" font-weight="700">${seat}</text>

    <text x="450" y="400" fill="#a1a1a6" font-size="11" letter-spacing="2">EMBARQUE</text>
    <text x="450" y="426" fill="#1d1d1f" font-size="22" font-weight="700">30 MIN ANTES</text>
  </g>

  <!-- Stub derecho -->
  <g>
    <text x="950" y="60" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">DESTINO</text>
    <text x="950" y="170" fill="${accentColor}" font-family="Inter, sans-serif" font-size="80" font-weight="700" letter-spacing="-2">${toCode}</text>

    <text x="950" y="240" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">FECHA</text>
    <text x="950" y="270" fill="#1d1d1f" font-family="Inter, sans-serif" font-size="22" font-weight="700">${dateParts.day} ${dateParts.month}</text>

    <text x="950" y="320" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">ASIENTO</text>
    <text x="950" y="350" fill="#1d1d1f" font-family="Inter, sans-serif" font-size="22" font-weight="700">${seat}</text>

    <text x="950" y="460" fill="#a1a1a6" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${(shareToken ?? '').slice(0, 18).toUpperCase()}</text>
  </g>

  <!-- Barcode estético -->
  <g transform="translate(40, 450)">
    ${Array.from({ length: 60 }, (_, i) => {
      const w = (i * 7919) % 5 < 2 ? 2 : 3;
      const x = i * 6;
      return `<rect x="${x}" y="0" width="${w}" height="30" fill="#1d1d1f"/>`;
    }).join('')}
  </g>
</svg>`;

  const download = async () => {
    setDownloading(true);
    try {
      // Convertir SVG a PNG via canvas
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('No se pudo cargar el SVG'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) {
          toast.error('No se pudo generar el PNG');
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(png);
        a.download = `boarding-pass-${toCode}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        toast.success('Boarding pass descargado');
      }, 'image/png');
    } catch {
      toast.error('No se pudo descargar');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="transition-opacity hover:opacity-75"
        style={{
          background: 'transparent',
          color: 'var(--color-ink, #1d1d1f)',
          borderRadius: 999,
          border: '1px solid var(--color-silver-mist, #e5e5ea)',
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Ticket className="h-3.5 w-3.5" />
        Boarding pass
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9000,
            padding: 24,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 24,
              maxWidth: 900,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,.24)',
            }}
          >
            <p
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '.22em', marginBottom: 14 }}
            >
              ✦ Boarding pass de la sorpresa
            </p>
            <div
              style={{
                margin: '0 auto 16px',
                maxWidth: 800,
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="flex items-center justify-center" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={download}
                disabled={downloading}
                className="transition-opacity hover:opacity-85"
                style={{
                  background: '#1d1d1f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: downloading ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Descargar PNG
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-ink, #1d1d1f)',
                  border: '1px solid var(--color-silver-mist, #e5e5ea)',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
