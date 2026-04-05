"use client";

import { useState } from "react";

export type Period =
  | { type: "month"; value: string }
  | { type: "year"; value: string }
  | { type: "all" }
  | { type: "custom"; from: string; to: string };

type PeriodSelectorProps = {
  value: Period;
  onChange: (period: Period) => void;
};

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const currentYear = String(now.getFullYear());

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(value.type === "custom");
  const [customFrom, setCustomFrom] = useState(
    value.type === "custom" ? value.from : ""
  );
  const [customTo, setCustomTo] = useState(
    value.type === "custom" ? value.to : ""
  );

  const handlePreset = (type: "month" | "year" | "all") => {
    setShowCustom(false);
    if (type === "month") onChange({ type: "month", value: currentMonth });
    else if (type === "year") onChange({ type: "year", value: currentYear });
    else onChange({ type: "all" });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ type: "custom", from: customFrom, to: customTo });
    }
  };

  const isActive = (type: string) => value.type === type;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-zinc-500">Period:</span>
      <div className="flex rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {(["month", "year", "all"] as const).map((type) => (
          <button
            key={type}
            onClick={() => handlePreset(type)}
            className={`px-3 py-1.5 text-sm font-medium transition border-r border-zinc-200 last:border-r-0 ${
              isActive(type) && !showCustom
                ? "bg-indigo-600 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {type === "month" ? "This Month" : type === "year" ? "This Year" : "All Time"}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-sm font-medium transition ${
            isActive("custom") || showCustom
              ? "bg-indigo-600 text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-sm text-zinc-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
