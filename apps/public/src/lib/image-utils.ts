const CANONICAL_SUPABASE_STORAGE = 'https://xtfpppcqscwsnpdfrzmw.supabase.co/storage/v1';

// 1×1 gray PNG — used as blur placeholder while remote images load
export const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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
