"use client";

import { useEffect, useRef, useState } from "react";

const LILONGWE_DEFAULT = { lat: -13.9626, lng: 33.7741 };

type MapPreviewProps = {
  latitude?: number;
  longitude?: number;
  onLocationChange?: (lat: number, lng: number) => void;
};

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    // `places` powers the address search box, `marker` the draggable pin.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export function MapPreview({ latitude, longitude, onLocationChange }: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback without re-running the init effect.
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

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
        const center =
          latitude != null && longitude != null
            ? { lat: latitude, lng: longitude }
            : LILONGWE_DEFAULT;

        const mapId = "dashboard-map-" + Math.random().toString(36).slice(2);

        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: latitude != null && longitude != null ? 15 : 11,
          mapId,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy", // one-finger pan on mobile
        });

        mapInstanceRef.current = map;

        const { AdvancedMarkerElement } = await g.maps.importLibrary("marker");

        const marker = new AdvancedMarkerElement({
          map,
          position: center,
          title: "Property Location",
          gmpDraggable: true,
        });

        markerRef.current = marker;

        // Click the map to (re)position the marker.
        map.addListener("click", (e: any) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.position = pos;
          onLocationChangeRef.current?.(pos.lat, pos.lng);
        });

        // Drag the marker to fine-tune.
        marker.addListener("dragend", () => {
          const pos = marker.position;
          if (pos) {
            onLocationChangeRef.current?.(pos.lat, pos.lng);
          }
        });

        // Address search box (Places Autocomplete).
        if (searchInputRef.current && g.maps.places?.Autocomplete) {
          const autocomplete = new g.maps.places.Autocomplete(searchInputRef.current, {
            fields: ["geometry"],
          });
          autocomplete.bindTo("bounds", map);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place?.geometry?.location;
            if (!loc) return;
            const lat = loc.lat();
            const lng = loc.lng();
            marker.position = { lat, lng };
            map.panTo({ lat, lng });
            map.setZoom(16);
            onLocationChangeRef.current?.(lat, lng);
          });
        }

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
    // Only init once — coordinate updates are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when coords change externally (e.g. from URL parser).
  useEffect(() => {
    if (!isLoaded || !markerRef.current || !mapInstanceRef.current) return;
    if (latitude == null || longitude == null) return;

    const pos = { lat: latitude, lng: longitude };
    markerRef.current.position = pos;
    mapInstanceRef.current.panTo(pos);
  }, [latitude, longitude, isLoaded]);

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 px-4 text-center text-sm text-zinc-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Address search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search an address or place name…"
          disabled={!isLoaded}
          onKeyDown={(e) => {
            // Stop Enter from submitting / advancing the form while picking a suggestion.
            if (e.key === "Enter") e.preventDefault();
          }}
          className="h-11 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Interactive map */}
      <div className="relative h-44 overflow-hidden rounded-lg border border-zinc-200 sm:h-56">
        {!isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
        {isLoaded && (
          <p className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
            Tap map or drag pin to adjust
          </p>
        )}
      </div>
    </div>
  );
}
