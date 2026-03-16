/**
 * Parses latitude and longitude from common Google Maps URL formats.
 *
 * Supported formats:
 * - https://www.google.com/maps/place/.../@-13.96,33.77,17z/...
 * - https://www.google.com/maps?q=-13.96,33.77
 * - https://maps.google.com/?q=-13.96,33.77
 * - https://www.google.com/maps/@-13.96,33.77,17z
 * - https://maps.google.com/maps?ll=-13.96,33.77
 * - https://www.google.com/maps/dir/.../-13.96,33.77/...
 *
 * Short links (goo.gl/maps, maps.app.goo.gl) are NOT supported —
 * the admin should paste the full URL from the browser address bar.
 */
export function parseGoogleMapsUrl(
  url: string
): { latitude: number; longitude: number } | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // Pattern 1: /@lat,lng,zoom  (place pages, direct @ links)
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = trimmed.match(atPattern);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoords(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 2: ?q=lat,lng or &q=lat,lng
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = trimmed.match(qPattern);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoords(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 3: ?ll=lat,lng or &ll=lat,lng
  const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const llMatch = trimmed.match(llPattern);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidCoords(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 4: /dir/.../lat,lng/  (directions URLs)
  const dirPattern = /\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const dirMatch = trimmed.match(dirPattern);
  if (dirMatch) {
    const lat = parseFloat(dirMatch[1]);
    const lng = parseFloat(dirMatch[2]);
    if (isValidCoords(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

function isValidCoords(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
