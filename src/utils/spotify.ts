/* Convierte un enlace de Spotify (track/playlist/album/episode) a su URL de
 * embed oficial. Soporta enlaces internacionales (intl-es, etc.) y con query.
 *
 *   https://open.spotify.com/intl-es/track/abc123?si=...  →
 *   https://open.spotify.com/embed/track/abc123
 *
 * Devuelve null si no es un enlace de Spotify reconocible. */
export const toSpotifyEmbedUrl = (input: string): string | null => {
  if (!input) return null;
  const m = input
    .trim()
    .match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  const [, type, id] = m;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
};

export const isSpotifyUrl = (input: string): boolean => toSpotifyEmbedUrl(input) !== null;
