import React from "react";
import { PropertyFormData } from "@/types/dashboard/property-form";
import { Label } from "@/components/dashboard-app/ui/label";
import { ImageUpload } from "@/components/dashboard-app/ImageUpload";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function PhotosTab({ data, onChange, errors }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-zinc-900 text-base">
          Property Photos <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-zinc-500 mt-1 mb-4">
          Upload high-quality photos of your property. The first image will be the cover
          photo.
        </p>
        <ImageUpload
          images={data.images}
          onChange={(images) => onChange({ images })}
          maxImages={14}
          maxSizeMB={5}
        />
        {errors.images && (
          <p className="mt-2 text-sm text-red-600">{errors.images}</p>
        )}
      </div>

      <div className="p-4 bg-zinc-50 rounded-lg">
        <h4 className="font-medium text-zinc-900 mb-2">Photo Tips</h4>
        <ul className="text-sm text-zinc-600 space-y-1">
          <li>• Use natural lighting when possible</li>
          <li>• Show all rooms and key features</li>
          <li>• Include exterior shots</li>
          <li>• Keep photos clean and uncluttered</li>
          <li>• Highlight unique features</li>
        </ul>
      </div>
    </div>
  );
}
