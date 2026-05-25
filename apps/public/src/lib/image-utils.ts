const CANONICAL_SUPABASE_STORAGE = 'https://xtfpppcqscwsnpdfrzmw.supabase.co/storage/v1';

// 1×1 neutral light-gray SVG (#e5e7eb / zinc-200) — used as blur placeholder
// while remote images load. The previous PNG decoded to a slight teal tint,
// which read as an "ugly green" background behind every image.
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=";

/**
 * Transform image URLs to their canonical form:
 * - Stale localhost / ngrok URLs → Supabase CDN
 */
export function transformImageUrl(url: string): string {
  if (!url) return url;

  // Stale localhost or ngrok URL → canonical Supabase CDN
  if (!url.startsWith('https://xtfpppcqscwsnpdfrzmw.supabase.co')) {
    const match = url.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (match) {
      return `${CANONICAL_SUPABASE_STORAGE}/object/public/${match[1]}`;
    }
  }

  return url;
}
