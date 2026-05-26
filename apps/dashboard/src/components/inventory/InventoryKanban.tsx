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
  { id: "out",     label: "Out of Stock", color: "text-red-700 dark:text-red-300",     headerBg: "bg-red-100/80 dark:bg-red-950/50",     borderColor: "border-red-200 dark:border-red-900",   emptyText: "Nothing out of stock" },
  { id: "low",     label: "Low Stock",    color: "text-amber-700 dark:text-amber-300", headerBg: "bg-amber-100/80 dark:bg-amber-950/50", borderColor: "border-amber-200 dark:border-amber-900", emptyText: "Nothing running low" },
  { id: "stocked", label: "Stocked",      color: "text-emerald-700 dark:text-emerald-300", headerBg: "bg-emerald-100/80 dark:bg-emerald-950/40", borderColor: "border-emerald-200 dark:border-emerald-900", emptyText: "No stocked items" },
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
  const [mobileCol, setMobileCol] = useState<"out" | "low" | "stocked">("out");

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
        <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1 scrollbar-thin">
          <button
            onClick={() => setFilterProperty("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              !filterProperty
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterProperty(p.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                filterProperty === p.id
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Mobile column tab switcher */}
      <div className="flex sm:hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 p-1 gap-1">
        {COLUMNS.map((col) => (
          <button
            key={col.id}
            onClick={() => setMobileCol(col.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              mobileCol === col.id
                ? "bg-white dark:bg-zinc-900 shadow-sm " + col.color
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span>{col.id === "out" ? "Out" : col.id === "low" ? "Low" : "Stocked"}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mobileCol === col.id ? col.headerBg : "bg-zinc-200 dark:bg-zinc-700"}`}>
              {grouped[col.id].length}
            </span>
          </button>
        ))}
      </div>

      {/* Kanban board — single col on mobile, 3-col on sm+ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const colItems = grouped[col.id];
          return (
            <div
              key={col.id}
              className={`rounded-xl border ${col.borderColor} overflow-hidden bg-white dark:bg-zinc-900 ${
                col.id !== mobileCol ? "hidden sm:block" : ""
              }`}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 ${col.headerBg} border-b ${col.borderColor}`}>
                <span className={`text-sm font-bold uppercase tracking-wide ${col.color}`}>{col.label}</span>
                <span className={`rounded-full bg-white/70 dark:bg-zinc-900/60 px-2 py-0.5 text-xs font-bold ${col.color}`}>
                  {colItems.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-1.5 p-2 min-h-[120px]">
                {colItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">{col.emptyText}</p>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {item.property && (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold mb-1 ${propColorMap.get(item.propertyId) ?? PROP_COLORS[0]}`}>
                              {item.property.name}
                            </span>
                          )}
                          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">{item.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 capitalize truncate">
                            {item.category.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="flex items-baseline justify-end gap-0.5 tabular-nums leading-none">
                            <span className={`text-2xl font-bold ${col.id === "out" ? "text-red-600 dark:text-red-400" : col.id === "low" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {item.quantity}
                            </span>
                            {item.minQuantity > 0 && <span className="text-sm text-zinc-400 dark:text-zinc-500">/{item.minQuantity}</span>}
                          </div>
                          <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mt-0.5">{item.unit}</p>
                        </div>
                      </div>

                      {col.id !== "stocked" && (
                        <div className="mt-1.5 flex justify-end">
                          <button
                            onClick={() => setRestockItem(item)}
                            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white transition"
                          >
                            Restock
                          </button>
                        </div>
                      )}
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
