import React, { useState, useCallback } from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";
import { parseGoogleMapsUrl } from "@/lib/utils/parseGoogleMapsUrl";
import { MapPreview } from "./MapPreview";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function BasicInfoTab({ data, onChange, errors }: TabProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="name">
          Property Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Cozy Downtown Apartment"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="propertyType">
          Property Type <span className="text-red-500">*</span>
        </Label>
        <Select
          id="propertyType"
          value={data.propertyType}
          onChange={(e) => onChange({ propertyType: e.target.value })}
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.icon} {type.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="location">
          Location <span className="text-red-500">*</span>
        </Label>
        <Input
          id="location"
          value={data.location}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="e.g., Nairobi, Kenya"
        />
        {errors.location && (
          <p className="mt-1.5 text-sm text-red-600">{errors.location}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">
          Address (Optional)
        </Label>
        <Input
          id="address"
          value={data.address || ""}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="e.g., 123 Main Street, Westlands"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Specific address for more accurate location
        </p>
      </div>

      <LocationField data={data} onChange={onChange} />
    </div>
  );
}

function LocationField({
  data,
  onChange,
}: {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
}) {
  const [parseStatus, setParseStatus] = useState<"idle" | "success" | "error">("idle");

  const handleGoogleMapsUrlChange = useCallback(
    (value: string) => {
      onChange({ googleMapsUrl: value });

      if (!value.trim()) {
        setParseStatus("idle");
        return;
      }

      const parsed = parseGoogleMapsUrl(value);
      if (parsed) {
        onChange({
          googleMapsUrl: value,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
        });
        setParseStatus("success");
      } else {
        setParseStatus("error");
      }
    },
    [onChange]
  );

  const handleMapLocationChange = useCallback(
    (lat: number, lng: number) => {
      onChange({ latitude: lat, longitude: lng });
    },
    [onChange]
  );

  const clearCoords = useCallback(() => {
    onChange({ latitude: undefined, longitude: undefined });
    setParseStatus("idle");
  }, [onChange]);

  const hasCoords = data.latitude != null && data.longitude != null;

  return (
    <div className="space-y-3">
      <div>
        <Label>Pin the location on the map</Label>
        <p className="mt-1 mb-2 text-xs text-zinc-500">
          Search an address, then tap the map or drag the pin to place it exactly.
        </p>
        <MapPreview
          latitude={data.latitude}
          longitude={data.longitude}
          onLocationChange={handleMapLocationChange}
        />
      </div>

      {/* Coordinate status */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
        {hasCoords ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Location set ({data.latitude?.toFixed(5)}, {data.longitude?.toFixed(5)})
          </span>
        ) : (
          <span className="text-xs text-zinc-500">No location pinned yet</span>
        )}
        {hasCoords && (
          <button
            type="button"
            onClick={clearCoords}
            className="flex-shrink-0 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-red-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Advanced: paste a Google Maps link */}
      <details className="group rounded-lg border border-zinc-200">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700">
          <span>Or paste a Google Maps link</span>
          <svg
            className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="border-t border-zinc-200 px-3 py-3">
          <Input
            id="googleMapsUrl"
            value={data.googleMapsUrl || ""}
            onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
            placeholder="Paste a Google Maps link for this property"
          />
          {parseStatus === "success" && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Location detected from link
            </p>
          )}
          {parseStatus === "error" && (
            <p className="mt-1.5 text-xs text-amber-600">
              Could not extract coordinates. Paste the full URL from your browser address bar.
            </p>
          )}
          {parseStatus === "idle" && (
            <p className="mt-1.5 text-xs text-zinc-500">
              Open Google Maps, find your property, and paste the URL from the address bar.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
