import exifr from 'exifr';
import { supabase } from './supabase';

const BUCKET = 'fotos-coche';
const TABLE = 'galeria_imagenes';

export interface GalleryImage {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  trip_id: string | null;
  activity_id: string | null;
  storage_path: string;
  public_url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  created_at: string;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const isHeic = (file: File) => {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/heic' || t === 'image/heif') return true;
  const n = file.name.toLowerCase();
  return n.endsWith('.heic') || n.endsWith('.heif');
};

interface ExifMeta {
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  width: number | null;
  height: number | null;
}

/* Lee GPS + DateTimeOriginal del archivo *original* (HEIC o el que sea).
 *
 * IMPORTANTE: GPS se lee con exifr.gps() porque pasar `pick` a parse()
 * filtra también las tags raw (GPSLatitude/Ref/…) que exifr necesita para
 * computar las propiedades virtuales latitude/longitude. exifr.gps() es un
 * helper que sabe exactamente qué leer. */
const readExif = async (file: File): Promise<ExifMeta> => {
  const meta: ExifMeta = {
    latitude: null,
    longitude: null,
    taken_at: null,
    width: null,
    height: null,
  };

  // GPS
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      meta.latitude = gps.latitude;
      meta.longitude = gps.longitude;
    }
  } catch (err) {
    console.warn('[gallery] exifr.gps failed', err);
  }

  // Fecha + dimensiones (pick aquí sí es seguro porque no son virtuales)
  try {
    const parsed = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ExifImageWidth', 'ExifImageHeight'],
    });
    if (parsed) {
      const taken = parsed.DateTimeOriginal ?? parsed.CreateDate;
      if (taken instanceof Date && !isNaN(taken.getTime())) {
        meta.taken_at = taken.toISOString();
      }
      if (typeof parsed.ExifImageWidth === 'number') meta.width = parsed.ExifImageWidth;
      if (typeof parsed.ExifImageHeight === 'number') meta.height = parsed.ExifImageHeight;
    }
  } catch (err) {
    console.warn('[gallery] exifr.parse (date/dims) failed', err);
  }

  console.info('[gallery] EXIF extraído', {
    file: file.name,
    gps: meta.latitude != null ? `${meta.latitude}, ${meta.longitude}` : 'no',
    taken_at: meta.taken_at ?? 'no',
    dims_exif: meta.width && meta.height ? `${meta.width}x${meta.height}` : 'no',
  });

  return meta;
};

/* Lee width/height reales del bitmap. Usamos createImageBitmap cuando exista
 * (más rápido y soporta blobs HEIC convertidos), si no, <img> fallback. */
const readImageDims = async (blob: Blob): Promise<{ width: number; height: number } | null> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      return dims;
    } catch {
      /* fallback */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};

/* Convierte HEIC → JPEG quality 1.0 (máxima). heic2any se carga dinámicamente
 * para no entrar en el bundle de la página si el usuario no sube HEIC. */
const convertHeicToJpeg = async (file: File): Promise<File> => {
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
  const blob = Array.isArray(out) ? out[0] : out;
  const baseName = file.name.replace(/\.(heic|heif)$/i, '');
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
};

export const galleryService = {
  async list(userId: string): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as GalleryImage[];
  },

  async upload(
    userId: string,
    file: File,
    opts?: {
      vehicleId?: string | null;
      tripId?: string | null;
      activityId?: string | null;
    },
  ): Promise<GalleryImage> {
    /* 1) EXIF se lee del original — la conversión HEIC→JPEG suele strippearlo */
    const exif = await readExif(file);

    /* 2) HEIC → JPEG quality 1.0 (sin pérdida visual, compatible con todo navegador) */
    const uploadFile = isHeic(file) ? await convertHeicToJpeg(file) : file;

    /* 3) Dimensiones SIEMPRE del bitmap real que se sube — las EXIF del HEIC
     *    original no coinciden con el JPEG tras la conversión (rotación
     *    aplicada) y eso provoca aspect-ratio incorrecto = crop visual. */
    const dims = await readImageDims(uploadFile);
    if (dims) {
      exif.width = dims.width;
      exif.height = dims.height;
    }

    /* 4) Subida a Storage */
    const safeName = slugify(uploadFile.name || 'foto');
    const path = `${userId}/${randomId()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type || undefined,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    /* 5) Insert. Si falla, eliminamos el blob para no dejar huérfanos */
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        vehicle_id: opts?.vehicleId ?? null,
        trip_id: opts?.tripId ?? null,
        activity_id: opts?.activityId ?? null,
        storage_path: path,
        public_url: publicUrl,
        file_name: uploadFile.name,
        mime_type: uploadFile.type || null,
        size_bytes: uploadFile.size,
        latitude: exif.latitude,
        longitude: exif.longitude,
        taken_at: exif.taken_at,
        width: exif.width,
        height: exif.height,
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage
        .from(BUCKET)
        .remove([path])
        .catch(() => undefined);
      throw error;
    }
    return data as GalleryImage;
  },

  async updateCaption(id: string, caption: string | null): Promise<GalleryImage> {
    const trimmed = caption?.trim() ?? '';
    const { data, error } = await supabase
      .from(TABLE)
      .update({ caption: trimmed.length ? trimmed : null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as GalleryImage;
  },

  async setLocation(
    id: string,
    coords: { latitude: number; longitude: number } | null,
  ): Promise<GalleryImage> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as GalleryImage;
  },

  async listByTrip(tripId: string): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('trip_id', tripId)
      .order('taken_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as GalleryImage[];
  },

  async listByActivity(activityId: string): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('activity_id', activityId)
      .order('taken_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as GalleryImage[];
  },

  async link(
    id: string,
    links: { tripId?: string | null; activityId?: string | null },
  ): Promise<GalleryImage> {
    const patch: Record<string, string | null> = {};
    if ('tripId' in links) patch.trip_id = links.tripId ?? null;
    if ('activityId' in links) patch.activity_id = links.activityId ?? null;
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as GalleryImage;
  },

  async remove(image: GalleryImage): Promise<void> {
    const { error: dbErr } = await supabase.from(TABLE).delete().eq('id', image.id);
    if (dbErr) throw dbErr;
    await supabase.storage
      .from(BUCKET)
      .remove([image.storage_path])
      .catch(() => undefined);
  },
};
