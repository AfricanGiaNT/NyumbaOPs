import React from "react";
import { PropertyFormData } from "@/types/dashboard/property-form";
import { Label } from "@/components/dashboard-app/ui/label";
import { Checkbox } from "@/components/dashboard-app/ui/checkbox";
import { AMENITIES, AMENITY_CATEGORIES } from "@/lib/dashboard/constants/amenities";
import { Separator } from "@/components/dashboard-app/ui/separator";

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
    <div className="space-y-6">
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
            <h3 className="font-semibold text-zinc-900 mb-3">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryAmenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={data.amenities.includes(amenity.id)}
                    onChange={() => toggleAmenity(amenity.id)}
                  />
                  <span className="text-xl">{amenity.icon}</span>
                  <span className="text-sm text-zinc-900">{amenity.label}</span>
                </label>
              ))}
            </div>
            {category !== AMENITY_CATEGORIES[AMENITY_CATEGORIES.length - 1] && (
              <Separator className="mt-6" />
            )}
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
