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

      <GoogleMapsLinkField data={data} onChange={onChange} />
    </div>
  );
}

function GoogleMapsLinkField({
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

  const hasCoords = data.latitude != null && data.longitude != null;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
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
            Location detected ({data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)})
          </p>
        )}
        {parseStatus === "error" && (
          <p className="mt-1.5 text-xs text-amber-600">
            Could not extract coordinates. Paste the full URL from your browser address bar.
          </p>
        )}
        {parseStatus === "idle" && (
          <p className="mt-1.5 text-xs text-zinc-500">
            Open Google Maps, find your property, and paste the URL from the address bar
          </p>
        )}
      </div>

      {hasCoords && (
        <MapPreview
          latitude={data.latitude}
          longitude={data.longitude}
          onLocationChange={handleMapLocationChange}
        />
      )}
    </div>
  );
}
