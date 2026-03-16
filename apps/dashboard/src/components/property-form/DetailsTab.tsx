import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BED_TYPES } from "@/lib/constants/policies";

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
    <div className="space-y-6">
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
        <Label className="text-zinc-900 text-base mb-3 block">Bed Types</Label>
        <div className="grid grid-cols-2 gap-3">
          {BED_TYPES.map((bedType) => (
            <label
              key={bedType.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={data.bedTypes?.includes(bedType.id) || false}
                onChange={() => toggleBedType(bedType.id)}
              />
              <span className="text-sm text-zinc-900">{bedType.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
