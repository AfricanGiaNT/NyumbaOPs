import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { AMENITIES, AMENITY_CATEGORIES } from "@/lib/constants/amenities";
import { cn } from "@/lib/utils";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function AmenitiesTab({ data, onChange, errors }: TabProps) {
  const toggleAmenity = (amenityId: string) => {
    const amenities = data.amenities.includes(amenityId)
      ? data.amenities.filter((id) => id !== amenityId)
      : [...data.amenities, amenityId];
    onChange({ amenities });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Label className="text-zinc-900 text-base">
          Select Amenities
        </Label>
        <p className="text-sm text-zinc-500 mt-1">
          Choose all amenities available at your property
        </p>
      </div>

      {AMENITY_CATEGORIES.map((category) => {
        const categoryAmenities = AMENITIES.filter(
          (amenity) => amenity.category === category
        );

        return (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">{category}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categoryAmenities.map((amenity) => {
                const selected = data.amenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-500"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    <span className="text-base leading-none">{amenity.icon}</span>
                    <span className="truncate">{amenity.label}</span>
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
        );
      })}

      {data.amenities.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-900">
            <strong>{data.amenities.length}</strong> amenities selected
          </p>
        </div>
      )}
    </div>
  );
}
