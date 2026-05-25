import { useEffect, useState } from 'react';
import { Album } from 'lucide-react';
import toast from 'react-hot-toast';
import { albumsService } from '../../services/albums.service';
import type { TripAlbum } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { GalleryAlbumCard } from './GalleryAlbumCard';

interface Props {
  userId: string;
  onOpen: (album: TripAlbum) => void;
}

export const GalleryAlbumGrid = ({ userId, onOpen }: Props) => {
  const [albums, setAlbums] = useState<TripAlbum[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAlbums(null);
    albumsService
      .listForUser(userId)
      .then((rows) => {
        if (!cancelled) setAlbums(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setAlbums([]);
          toast.error(err.message ?? 'No se pudieron cargar los álbumes');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (albums === null) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '4 / 5' }}>
            <Skeleton className="rounded-[20px] w-full h-full" />
          </div>
        ))}
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <EmptyState
        icon={Album}
        title="Sin álbumes todavía"
        description="Crea un viaje en la sección «Viajes» y empieza a añadir fotos para que aparezca aquí su álbum."
      />
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}
    >
      {albums.map((a, i) => (
        <div
          key={a.trip.id}
          className="stagger-item"
          style={{ ['--i' as never]: i } as React.CSSProperties}
        >
          <GalleryAlbumCard album={a} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
};
