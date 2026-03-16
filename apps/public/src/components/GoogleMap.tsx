"use client";

import { useEffect, useRef, useState } from "react";

const LILONGWE_DEFAULT = { lat: -13.9626, lng: 33.7741 };

type GoogleMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  zoom?: number;
  className?: string;
  markerTitle?: string;
};

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

async function geocodeLocation(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  const g = (window as any).google;
  const geocoder = new g.maps.Geocoder();
  try {
    const result = await geocoder.geocode({ address: location });
    if (result.results.length > 0) {
      const pos = result.results[0].geometry.location;
      return { lat: pos.lat(), lng: pos.lng() };
    }
  } catch {
    console.warn("Geocoding failed for:", location);
  }
  return null;
}

export function GoogleMap({
  latitude,
  longitude,
  location,
  zoom = 15,
  className = "",
  markerTitle = "Property Location",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        await loadGoogleMapsScript(apiKey!);
        if (cancelled || !mapRef.current) return;

        const g = (window as any).google;
        let center: { lat: number; lng: number };

        if (latitude != null && longitude != null) {
          center = { lat: latitude, lng: longitude };
        } else if (location) {
          const geocoded = await geocodeLocation(location);
          center = geocoded ?? LILONGWE_DEFAULT;
        } else {
          center = LILONGWE_DEFAULT;
        }

        if (cancelled || !mapRef.current) return;

        const mapId = "property-map-" + Math.random().toString(36).slice(2);

        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom,
          mapId,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;

        const { AdvancedMarkerElement } = await g.maps.importLibrary("marker");

        const marker = new AdvancedMarkerElement({
          map,
          position: center,
          title: markerTitle,
        });

        markerRef.current = marker;
        setIsLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Google Maps init error:", err);
          setError("Failed to load map");
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, location, zoom, markerTitle]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-zinc-400 rounded-xl ${className}`}
      >
        <div className="text-center p-4">
          <svg
            className="mx-auto h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600" />
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
