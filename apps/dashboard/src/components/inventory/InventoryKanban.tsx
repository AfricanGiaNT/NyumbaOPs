"use client";

import { useState } from "react";
import { InventoryItem, Property } from "@/lib/types";
import { RecordMovementModal } from "./RecordMovementModal";

type Props = {
  items: InventoryItem[];
  properties: Property[];
  onAction: () => void;
};

type Column = { id: "out" | "low" | "stocked"; label: string; color: string; headerBg: string; borderColor: string; emptyText: string };

const COLUMNS: Column[] = [
  { id: "out",     label: "Out of Stock", color: "text-red-700 dark:text-red-400",     headerBg: "bg-red-50 dark:bg-red-950/40",     borderColor: "border-red-200 dark:border-red-800",   emptyText: "Nothing out of stock" },
  { id: "low",     label: "Low Stock",    color: "text-amber-700 dark:text-amber-400", headerBg: "bg-amber-50 dark:bg-amber-950/40", borderColor: "border-amber-200 dark:border-amber-800", emptyText: "Nothing running low" },
  { id: "stocked", label: "Stocked",      color: "text-emerald-700 dark:text-emerald-400", headerBg: "bg-emerald-50 dark:bg-emerald-950/30", borderColor: "border-emerald-200 dark:border-emerald-800", emptyText: "No stocked items" },
];

function getColumn(item: InventoryItem): "out" | "low" | "stocked" {
  if (item.quantity === 0) return "out";
  if (item.minQuantity > 0 && item.quantity < item.minQuantity) return "low";
  return "stocked";
}

// Assign a stable color to each property for badges
const PROP_COLORS = [
  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
];

export function InventoryKanban({ items, properties, onAction }: Props) {
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [filterProperty, setFilterProperty] = useState("");

  const propColorMap = new Map(properties.map((p, i) => [p.id, PROP_COLORS[i % PROP_COLORS.length]]));

  const filtered = filterProperty ? items.filter((i) => i.propertyId === filterProperty) : items;

  const grouped = {
    out:     filtered.filter((i) => getColumn(i) === "out"),
    low:     filtered.filter((i) => getColumn(i) === "low"),
    stocked: filtered.filter((i) => getColumn(i) === "stocked"),
  };

  return (
    <>
      {/* Property filter */}
      {properties.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterProperty("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !filterProperty
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterProperty(p.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filterProperty === p.id
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const colItems = grouped[col.id];
          return (
            <div key={col.id} className={`rounded-xl border ${col.borderColor} overflow-hidden`}>
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 ${col.headerBg}`}>
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.headerBg} ${col.color} border ${col.borderColor}`}>
                  {colItems.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 min-h-[120px]">
                {colItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">{col.emptyText}</p>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm"
                    >
                      {/* Property badge */}
                      {item.property && (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1.5 ${propColorMap.get(item.propertyId) ?? PROP_COLORS[0]}`}>
                          {item.property.name}
                        </span>
                      )}

                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{item.name}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 capitalize mt-0.5">
                        {item.category.replace(/_/g, " ").toLowerCase()}
                      </p>

                      {/* Qty bar */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className={`font-semibold ${col.id === "out" ? "text-red-600 dark:text-red-400" : col.id === "low" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {item.quantity}
                          </span>
                          {item.minQuantity > 0 && (
                            <span className="text-zinc-400">/ {item.minQuantity}</span>
                          )}
                          <span className="text-zinc-400">{item.unit}</span>
                        </div>

                        {col.id !== "stocked" && (
                          <button
                            onClick={() => setRestockItem(item)}
                            className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500 transition"
                          >
                            Restock
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RecordMovementModal
        item={restockItem}
        defaultType="IN"
        onClose={() => setRestockItem(null)}
        onSuccess={() => { setRestockItem(null); onAction(); }}
      />
    </>
  );
}
