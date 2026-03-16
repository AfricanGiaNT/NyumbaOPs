import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function DescriptionTab({ data, onChange, errors }: TabProps) {
  const [highlightInput, setHighlightInput] = React.useState("");

  const addHighlight = () => {
    if (highlightInput.trim()) {
      const highlights = [...(data.highlights || []), highlightInput.trim()];
      onChange({ highlights });
      setHighlightInput("");
    }
  };

  const removeHighlight = (index: number) => {
    const highlights = data.highlights?.filter((_, i) => i !== index) || [];
    onChange({ highlights });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="description" className="text-zinc-900">
          Property Description
        </Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your property in detail. What makes it special?"
          className="mt-1.5 min-h-[120px]"
          maxLength={1000}
        />
        <p className="mt-1 text-xs text-zinc-500">
          {(data.description || "").length}/1000 characters
        </p>
      </div>

      <div>
        <Label htmlFor="spaceDescription" className="text-zinc-900">
          Space Description
        </Label>
        <Textarea
          id="spaceDescription"
          value={data.spaceDescription || ""}
          onChange={(e) => onChange({ spaceDescription: e.target.value })}
          placeholder="Describe the space guests will have access to"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="guestAccess" className="text-zinc-900">
          Guest Access
        </Label>
        <Textarea
          id="guestAccess"
          value={data.guestAccess || ""}
          onChange={(e) => onChange({ guestAccess: e.target.value })}
          placeholder="What areas can guests access?"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="otherDetails" className="text-zinc-900">
          Other Details
        </Label>
        <Textarea
          id="otherDetails"
          value={data.otherDetails || ""}
          onChange={(e) => onChange({ otherDetails: e.target.value })}
          placeholder="Any other important information"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="highlights" className="text-zinc-900">
          Highlights & Features
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="highlights"
            value={highlightInput}
            onChange={(e) => setHighlightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addHighlight();
              }
            }}
            placeholder="e.g., Ocean View, Pool Access"
          />
          <button
            type="button"
            onClick={addHighlight}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Add
          </button>
        </div>
        {data.highlights && data.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.highlights.map((highlight, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {highlight}
                <button
                  type="button"
                  onClick={() => removeHighlight(index)}
                  className="ml-1 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
