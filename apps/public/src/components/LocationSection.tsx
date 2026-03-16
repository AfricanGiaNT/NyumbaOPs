import { GoogleMap } from "./GoogleMap";

type LocationSectionProps = {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
};

function getDirectionsUrl(
  latitude?: number | null,
  longitude?: number | null,
  googleMapsUrl?: string | null,
  location?: string
): string {
  if (googleMapsUrl) return googleMapsUrl;
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || "Lilongwe, Malawi")}`;
}

export function LocationSection({
  location,
  latitude,
  longitude,
  googleMapsUrl,
}: LocationSectionProps) {
  const directionsUrl = getDirectionsUrl(latitude, longitude, googleMapsUrl, location);

  return (
    <div className="space-y-4 border-b border-zinc-200 py-8">
      <h2 className="text-2xl font-bold text-zinc-900">Where you&apos;ll be</h2>
      <p className="text-base text-zinc-700">{location}</p>

      <GoogleMap
        latitude={latitude}
        longitude={longitude}
        location={location}
        className="aspect-[16/9] w-full"
        markerTitle={location}
      />

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Get Directions
      </a>
    </div>
  );
}
