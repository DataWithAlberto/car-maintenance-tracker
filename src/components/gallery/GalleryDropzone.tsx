import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  progressLabel?: string;
  disabled?: boolean;
}

const ACCEPT = 'image/*';

export const GalleryDropzone = ({ onFiles, uploading, progressLabel, disabled }: Props) => {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const arr = Array.from(list).filter((f) => f.type.startsWith('image/'));
      if (arr.length) onFiles(arr);
    },
    [onFiles],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !uploading) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 w-full rounded-[28px] border-2 border-dashed px-6 py-10 sm:py-14 text-center cursor-pointer transition-colors',
        over ? 'border-[var(--color-azure)]' : 'border-[var(--color-silver-mist)]',
        uploading || disabled
          ? 'cursor-not-allowed opacity-80'
          : 'hover:border-[var(--color-azure)]',
      )}
      style={{ background: over ? 'rgba(0,113,227,0.04)' : 'var(--surface-card)' }}
      aria-disabled={disabled || uploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'var(--surface-canvas)', color: 'var(--color-ink)' }}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : over ? (
          <ImagePlus className="w-6 h-6" />
        ) : (
          <UploadCloud className="w-6 h-6" />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-ink font-medium" style={{ fontSize: 'var(--text-subheading)' }}>
          {uploading
            ? (progressLabel ?? 'Subiendo fotos…')
            : over
              ? 'Suelta aquí para subir'
              : 'Arrastra fotos o haz clic para seleccionar'}
        </p>
        <p className="text-graphite" style={{ fontSize: 'var(--text-body-sm)' }}>
          JPG, PNG, WEBP, HEIC · varias a la vez
        </p>
      </div>
    </div>
  );
};
