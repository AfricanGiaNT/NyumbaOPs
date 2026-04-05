import React from "react";
import { PropertyFormData } from "@/types/property-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/constants/policies";

export interface TabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

export function PricingTab({ data, onChange, errors }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nightlyRate" className="text-zinc-900">
            Nightly Rate <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nightlyRate"
            type="number"
            min="0"
            step="0.01"
            value={data.nightlyRate === 0 ? "" : data.nightlyRate}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ nightlyRate: val === "" ? 0 : parseFloat(val) || 0 });
            }}
            placeholder="e.g., 200000"
            className="mt-1.5"
          />
          {errors.nightlyRate && (
            <p className="mt-1 text-sm text-red-600">{errors.nightlyRate}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency" className="text-zinc-900">
            Currency <span className="text-red-500">*</span>
          </Label>
          <Select
            id="currency"
            value={data.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            className="mt-1.5"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="weekendRate" className="text-zinc-900">
          Weekend Rate (Optional)
        </Label>
        <Input
          id="weekendRate"
          type="number"
          min="0"
          step="0.01"
          value={data.weekendRate || ""}
          onChange={(e) =>
            onChange({ weekendRate: parseFloat(e.target.value) || undefined })
          }
          placeholder="Leave empty to use nightly rate"
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weeklyDiscount" className="text-zinc-900">
            Weekly Discount (%)
          </Label>
          <Input
            id="weeklyDiscount"
            type="number"
            min="0"
            max="100"
            value={data.weeklyDiscount || ""}
            onChange={(e) =>
              onChange({ weeklyDiscount: parseFloat(e.target.value) || undefined })
            }
            placeholder="e.g., 10"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="monthlyDiscount" className="text-zinc-900">
            Monthly Discount (%)
          </Label>
          <Input
            id="monthlyDiscount"
            type="number"
            min="0"
            max="100"
            value={data.monthlyDiscount || ""}
            onChange={(e) =>
              onChange({ monthlyDiscount: parseFloat(e.target.value) || undefined })
            }
            placeholder="e.g., 20"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cleaningFee" className="text-zinc-900">
            Cleaning Fee
          </Label>
          <Input
            id="cleaningFee"
            type="number"
            min="0"
            step="0.01"
            value={data.cleaningFee || ""}
            onChange={(e) =>
              onChange({ cleaningFee: parseFloat(e.target.value) || undefined })
            }
            placeholder="One-time fee"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="securityDeposit" className="text-zinc-900">
            Security Deposit
          </Label>
          <Input
            id="securityDeposit"
            type="number"
            min="0"
            step="0.01"
            value={data.securityDeposit || ""}
            onChange={(e) =>
              onChange({ securityDeposit: parseFloat(e.target.value) || undefined })
            }
            placeholder="Refundable deposit"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="extraGuestFee" className="text-zinc-900">
          Extra Guest Fee (per night)
        </Label>
        <Input
          id="extraGuestFee"
          type="number"
          min="0"
          step="0.01"
          value={data.extraGuestFee || ""}
          onChange={(e) =>
            onChange({ extraGuestFee: parseFloat(e.target.value) || undefined })
          }
          placeholder="Fee for additional guests"
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minimumStay" className="text-zinc-900">
            Minimum Stay (nights)
          </Label>
          <Input
            id="minimumStay"
            type="number"
            min="1"
            value={data.minimumStay || 1}
            onChange={(e) =>
              onChange({ minimumStay: parseInt(e.target.value) || 1 })
            }
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="maximumStay" className="text-zinc-900">
            Maximum Stay (nights)
          </Label>
          <Input
            id="maximumStay"
            type="number"
            min="1"
            value={data.maximumStay || ""}
            onChange={(e) =>
              onChange({ maximumStay: parseInt(e.target.value) || undefined })
            }
            placeholder="No limit"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
