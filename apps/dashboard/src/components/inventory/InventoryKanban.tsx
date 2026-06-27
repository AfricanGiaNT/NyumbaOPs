"use client";

import { useMemo, useState } from "react";
import { InventoryItem, Property } from "@/lib/types";
import { RecordMovementModal } from "./RecordMovementModal";

type Props = {
  items: InventoryItem[];
  properties: Property[];
  onAction: () => void;
};

type ColId = "out" | "low" | "stocked";
type Column = { id: ColId; label: string; color: string; headerBg: string; borderColor: string; dot: string; qty: string; emptyText: string };

const COLUMNS: Column[] = [
  { id: "out",     label: "Out of Stock", color: "text-red-700 dark:text-red-300",         headerBg: "bg-red-100/80 dark:bg-red-950/50",      borderColor: "border-red-200 dark:border-red-900",     dot: "bg-red-500",     qty: "text-red-600 dark:text-red-400",     emptyText: "Nothing out of stock" },
  { id: "low",     label: "Low Stock",    color: "text-amber-700 dark:text-amber-300",     headerBg: "bg-amber-100/80 dark:bg-amber-950/50",  borderColor: "border-amber-200 dark:border-amber-900", dot: "bg-amber-500",   qty: "text-amber-600 dark:text-amber-400", emptyText: "Nothing running low" },
  { id: "stocked", label: "Stocked",      color: "text-emerald-700 dark:text-emerald-300", headerBg: "bg-emerald-100/80 dark:bg-emerald-950/40", borderColor: "border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-500", qty: "text-emerald-600 dark:text-emerald-400", emptyText: "No stocked items" },
];

function getColumn(item: InventoryItem): ColId {
  if (item.quantity === 0) return "out";
  if (item.minQuantity > 0 && item.quantity < item.minQuantity) return "low";
  return "stocked";
}

// A muted dot color per property, for the small property tag in "All" view.
const PROP_DOTS = ["bg-indigo-400", "bg-violet-400", "bg-sky-400", "bg-teal-400", "bg-orange-400", "bg-pink-400"];

function isMeaningfulCategory(category: string) {
  return category !== "GENERAL" && category !== "OTHER";
}

export function InventoryKanban({ items, properties, onAction }: Props) {
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [filterProperty, setFilterProperty] = useState("");
  const [mobileCol, setMobileCol] = useState<ColId>("out");
  const [query, setQuery] = useState("");

  const propDotMap = useMemo(
    () => new Map(properties.map((p, i) => [p.id, PROP_DOTS[i % PROP_DOTS.length]])),
    [properties],
  );

  const showProperty = !filterProperty; // only relevant in the "All" view

  const filtered = items
    .filter((i) => (filterProperty ? i.propertyId === filterProperty : true))
    .filter((i) => (query ? i.name.toLowerCase().includes(query.toLowerCase()) : true));

  const grouped = {
    out:     filtered.filter((i) => getColumn(i) === "out"),
    low:     filtered.filter((i) => getColumn(i) === "low"),
    stocked: filtered.filter((i) => getColumn(i) === "stocked"),
  };

  return (
    <>
      {/* Controls: property filter + search */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {properties.length > 1 ? (
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
        ) : <div />}

        {/* Search */}
        <div className="relative shrink-0 sm:w-56">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-8 pr-8 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-start">
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

              {/* Rows */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {colItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
                    {query ? "No matches" : col.emptyText}
                  </p>
                ) : (
                  colItems.map((item) => {
                    const showCat = isMeaningfulCategory(item.category);
                    const showMeta = (showProperty && item.property) || showCat;
                    const showUnit = !!item.unit && item.unit.toLowerCase() !== "unit";
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                      >
                        {/* Name + meta */}
                        <div className="min-w-0 flex-1 antialiased">
                          <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug truncate">{item.name}</p>
                          {showMeta && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {showProperty && item.property && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${propDotMap.get(item.propertyId) ?? PROP_DOTS[0]}`} />
                                  <span className="truncate">{item.property.name}</span>
                                </span>
                              )}
                              {showProperty && item.property && showCat && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                              {showCat && <span className="capitalize truncate">{item.category.replace(/_/g, " ").toLowerCase()}</span>}
                            </p>
                          )}
                        </div>

                        {/* Qty */}
                        <div className="shrink-0 text-right tabular-nums leading-none antialiased">
                          <div className="flex items-baseline justify-end gap-0.5">
                            <span className={`text-xl font-semibold ${col.qty}`}>{item.quantity}</span>
                            {item.minQuantity > 0 && <span className="text-sm text-zinc-400 dark:text-zinc-500">/{item.minQuantity}</span>}
                            {showUnit && <span className="ml-1 text-xs lowercase text-zinc-400 dark:text-zinc-500">{item.unit}</span>}
                          </div>
                        </div>

                        {/* Inline restock (out/low only) */}
                        {col.id !== "stocked" && (
                          <button
                            onClick={() => setRestockItem(item)}
                            title="Restock"
                            aria-label={`Restock ${item.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white transition active:scale-95"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })
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
