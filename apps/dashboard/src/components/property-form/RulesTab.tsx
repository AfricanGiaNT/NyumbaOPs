import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { CANCELLATION_POLICIES } from "@/lib/constants/policies";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function RulesTab({ data, onChange, errors }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="checkInTime" className="text-zinc-900">
            Check-in Time
          </Label>
          <Input
            id="checkInTime"
            type="time"
            value={data.checkInTime || "15:00"}
            onChange={(e) => onChange({ checkInTime: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="checkOutTime" className="text-zinc-900">
            Check-out Time
          </Label>
          <Input
            id="checkOutTime"
            type="time"
            value={data.checkOutTime || "11:00"}
            onChange={(e) => onChange({ checkOutTime: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200">
          <div>
            <Label className="text-zinc-900 font-medium">Smoking Allowed</Label>
            <p className="text-sm text-zinc-500">Allow guests to smoke on the property</p>
          </div>
          <Switch
            checked={data.smokingAllowed}
            onCheckedChange={(checked) => onChange({ smokingAllowed: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200">
          <div>
            <Label className="text-zinc-900 font-medium">Pets Allowed</Label>
            <p className="text-sm text-zinc-500">Allow guests to bring pets</p>
          </div>
          <Switch
            checked={data.petsAllowed}
            onCheckedChange={(checked) => onChange({ petsAllowed: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200">
          <div>
            <Label className="text-zinc-900 font-medium">Events Allowed</Label>
            <p className="text-sm text-zinc-500">Allow guests to host events or parties</p>
          </div>
          <Switch
            checked={data.eventsAllowed}
            onCheckedChange={(checked) => onChange({ eventsAllowed: checked })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="quietHours" className="text-zinc-900">
          Quiet Hours
        </Label>
        <Input
          id="quietHours"
          value={data.quietHours || ""}
          onChange={(e) => onChange({ quietHours: e.target.value })}
          placeholder="e.g., 10:00 PM - 8:00 AM"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="additionalRules" className="text-zinc-900">
          Additional House Rules
        </Label>
        <Textarea
          id="additionalRules"
          value={data.additionalRules || ""}
          onChange={(e) => onChange({ additionalRules: e.target.value })}
          placeholder="Any other rules guests should know about"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="cancellationPolicy" className="text-zinc-900">
          Cancellation Policy <span className="text-red-500">*</span>
        </Label>
        <Select
          id="cancellationPolicy"
          value={data.cancellationPolicy}
          onChange={(e) => onChange({ cancellationPolicy: e.target.value })}
          className="mt-1.5"
        >
          {CANCELLATION_POLICIES.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.label} - {policy.description}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
