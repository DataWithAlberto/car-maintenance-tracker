import { useState } from 'react';
import { QrCode, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface Props {
  url: string;
  filename?: string;
}

const buildQrUrl = (url: string, size = 512) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(url)}`;

/* QR de un solo clic.
 * Renderiza inline (PNG remoto) y descarga el archivo al pulsar. */
export const SurpriseQRCode = ({ url, filename = 'sorpresa-qr.png' }: Props) => {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(buildQrUrl(url, 1024));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success('QR descargado');
    } catch {
      toast.error('No se pudo descargar el QR');
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
        <QrCode className="h-3.5 w-3.5" />
        QR
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
              padding: 28,
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,.24)',
            }}
          >
            <p
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '.22em', marginBottom: 14 }}
            >
              ✦ QR de la sorpresa
            </p>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--color-silver-mist, #e5e5ea)',
                borderRadius: 16,
                padding: 12,
                margin: '0 auto 16px',
                width: 260,
                height: 260,
              }}
            >
              <img
                src={buildQrUrl(url, 512)}
                alt="QR de la sorpresa"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>
            <p
              className="text-graphite"
              style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.4 }}
            >
              Imprime y mete el QR en un sobre físico.
              <br />
              Al escanearlo se abre la sorpresa.
            </p>
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
