import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BED_TYPES } from "@/lib/constants/policies";
import { cn } from "@/lib/utils";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function DetailsTab({ data, onChange, errors }: TabProps) {
  const toggleBedType = (bedTypeId: string) => {
    const bedTypes = data.bedTypes || [];
    const updated = bedTypes.includes(bedTypeId)
      ? bedTypes.filter((id) => id !== bedTypeId)
      : [...bedTypes, bedTypeId];
    onChange({ bedTypes: updated });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bedrooms" className="text-zinc-900">
            Bedrooms <span className="text-red-500">*</span>
          </Label>
          <Input
            id="bedrooms"
            type="number"
            min="0"
            value={data.bedrooms}
            onChange={(e) => onChange({ bedrooms: parseInt(e.target.value) || 0 })}
            className="mt-1.5"
          />
          {errors.bedrooms && (
            <p className="mt-1 text-sm text-red-600">{errors.bedrooms}</p>
          )}
        </div>

        <div>
          <Label htmlFor="beds" className="text-zinc-900">
            Beds <span className="text-red-500">*</span>
          </Label>
          <Input
            id="beds"
            type="number"
            min="0"
            value={data.beds}
            onChange={(e) => onChange({ beds: parseInt(e.target.value) || 0 })}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bathrooms" className="text-zinc-900">
            Bathrooms <span className="text-red-500">*</span>
          </Label>
          <Input
            id="bathrooms"
            type="number"
            min="0"
            step="0.5"
            value={data.bathrooms}
            onChange={(e) => onChange({ bathrooms: parseFloat(e.target.value) || 0 })}
            className="mt-1.5"
          />
          {errors.bathrooms && (
            <p className="mt-1 text-sm text-red-600">{errors.bathrooms}</p>
          )}
        </div>

        <div>
          <Label htmlFor="maxGuests" className="text-zinc-900">
            Max Guests <span className="text-red-500">*</span>
          </Label>
          <Input
            id="maxGuests"
            type="number"
            min="1"
            value={data.maxGuests}
            onChange={(e) => onChange({ maxGuests: parseInt(e.target.value) || 1 })}
            className="mt-1.5"
          />
          {errors.maxGuests && (
            <p className="mt-1 text-sm text-red-600">{errors.maxGuests}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="propertySize" className="text-zinc-900">
          Property Size (sq ft)
        </Label>
        <Input
          id="propertySize"
          type="number"
          min="0"
          value={data.propertySize || ""}
          onChange={(e) =>
            onChange({ propertySize: parseInt(e.target.value) || undefined })
          }
          placeholder="e.g., 1200"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label className="mb-2 block text-zinc-900">Bed Types</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BED_TYPES.map((bedType) => {
            const selected = data.bedTypes?.includes(bedType.id) || false;
            return (
              <button
                key={bedType.id}
                type="button"
                onClick={() => toggleBedType(bedType.id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                  selected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-500"
                    : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                )}
              >
                <span className="truncate">{bedType.label}</span>
                {selected && (
                  <svg
                    className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
