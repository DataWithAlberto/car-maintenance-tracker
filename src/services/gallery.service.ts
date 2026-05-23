import { supabase } from './supabase';

const BUCKET = 'fotos-coche';
const TABLE = 'galeria_imagenes';

export interface GalleryImage {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  storage_path: string;
  public_url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
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
    opts?: { vehicleId?: string | null },
  ): Promise<GalleryImage> {
    const safeName = slugify(file.name || 'foto');
    const path = `${userId}/${randomId()}-${safeName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        vehicle_id: opts?.vehicleId ?? null,
        storage_path: path,
        public_url: publicUrl,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select('*')
      .single();

    if (error) {
      // rollback del fichero si el insert falla, para no dejar huérfanos
      await supabase.storage
        .from(BUCKET)
        .remove([path])
        .catch(() => undefined);
      throw error;
    }
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
