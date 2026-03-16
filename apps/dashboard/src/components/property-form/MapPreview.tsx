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

export function MapPreview({ latitude, longitude, onLocationChange }: MapPreviewProps) {
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
        const center =
          latitude != null && longitude != null
            ? { lat: latitude, lng: longitude }
            : LILONGWE_DEFAULT;

        const mapId = "dashboard-map-" + Math.random().toString(36).slice(2);

        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapId,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
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

        // Allow clicking the map to reposition the marker
        map.addListener("click", (e: any) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.position = pos;
          onLocationChange?.(pos.lat, pos.lng);
        });

        // Allow dragging the marker
        marker.addListener("dragend", () => {
          const pos = marker.position;
          if (pos) {
            onLocationChange?.(pos.lat, pos.lng);
          }
        });

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
    // Only init once — updates handled by the second useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when coords change externally (e.g. from URL parser)
  useEffect(() => {
    if (!isLoaded || !markerRef.current || !mapInstanceRef.current) return;
    if (latitude == null || longitude == null) return;

    const pos = { lat: latitude, lng: longitude };
    markerRef.current.position = pos;
    mapInstanceRef.current.panTo(pos);
  }, [latitude, longitude, isLoaded]);

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-48 overflow-hidden rounded-lg border border-zinc-200">
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
      {isLoaded && (
        <p className="absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
          Click map or drag pin to adjust
        </p>
      )}
    </div>
  );
}
