import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BookingCard } from './BookingCard';
import { BOOKING_TYPE_LABEL } from '../../utils/bookingTheme';
import type { TripBooking, TripBookingType } from '../../types';

interface Props {
  bookings: TripBooking[];
  onConfirm: (keepIds: string[]) => Promise<void>;
  onClose: () => void;
}

export const ConfirmTripModal = ({ bookings, onConfirm, onClose }: Props) => {
  const [keep, setKeep] = useState<Set<string>>(() => {
    const seenLodging = { value: false };
    const initial = new Set<string>();
    bookings.forEach((b) => {
      if (b.type === 'lodging') {
        if (!seenLodging.value) {
          initial.add(b.id);
          seenLodging.value = true;
        }
        return;
      }
      initial.add(b.id);
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) =>
    setKeep((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const grouped = bookings.reduce<Record<string, TripBooking[]>>((acc, b) => {
    (acc[b.type] ??= []).push(b);
    return acc;
  }, {});

  const submit = async () => {
    setLoading(true);
    try {
      await onConfirm([...keep]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Confirmar y lanzar viaje"
      description="Elige qué propuestas se quedan como definitivas. El resto se archiva pero no se pierde."
    >
      <div className="space-y-5">
        {Object.entries(grouped).map(([type, list]) => (
          <section key={type}>
            <p
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '.16em', marginBottom: 8 }}
            >
              {BOOKING_TYPE_LABEL[type as TripBookingType]}
              {list.length > 1 && type === 'lodging' && (
                <span className="text-azure" style={{ marginLeft: 8 }}>
                  · selecciona 1
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((b) => {
                const isKeep = keep.has(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    className="text-left transition-all"
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      outline: isKeep ? '2px solid #1cb05c' : '2px solid transparent',
                      outlineOffset: 2,
                      borderRadius: 22,
                      opacity: isKeep ? 1 : 0.55,
                    }}
                  >
                    <BookingCard booking={b} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid var(--color-silver-mist)', paddingTop: 14 }}
        >
          <p className="text-graphite" style={{ fontSize: 13 }}>
            <span className="text-ink" style={{ fontWeight: 600 }}>
              {keep.size}
            </span>{' '}
            {keep.size === 1 ? 'reserva' : 'reservas'} quedará
            {keep.size === 1 ? '' : 'n'} como definitivas
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              loading={loading}
              disabled={keep.size === 0}
              iconLeft={<Sparkles className="h-4 w-4" />}
            >
              Lanzar viaje
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
