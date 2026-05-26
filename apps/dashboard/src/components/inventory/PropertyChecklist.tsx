"use client";

import { useState } from "react";
import { InventoryItem, Property } from "@/lib/types";
import { RecordMovementModal } from "./RecordMovementModal";

type Props = {
  items: InventoryItem[];
  properties: Property[];
  onAction: () => void;
};

export function PropertyChecklist({ items, properties, onAction }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id ?? "");
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);

  const propertyItems = items
    .filter((i) => i.propertyId === selectedPropertyId)
    .sort((a, b) => {
      // Sort: out first, then low, then stocked
      const order = (i: InventoryItem) => {
        if (i.quantity === 0) return 0;
        if (i.minQuantity > 0 && i.quantity < i.minQuantity) return 1;
        return 2;
      };
      return order(a) - order(b) || a.name.localeCompare(b.name);
    });

  const outCount = propertyItems.filter((i) => i.quantity === 0).length;
  const lowCount = propertyItems.filter((i) => i.quantity > 0 && i.minQuantity > 0 && i.quantity < i.minQuantity).length;
  const okCount  = propertyItems.filter((i) => i.quantity >= i.minQuantity && i.minQuantity > 0).length;

  function statusFor(item: InventoryItem): "out" | "low" | "ok" | "unset" {
    if (item.quantity === 0) return "out";
    if (item.minQuantity > 0 && item.quantity < item.minQuantity) return "low";
    if (item.minQuantity === 0) return "unset";
    return "ok";
  }

  return (
    <>
      {/* Property picker */}
      <div className="flex flex-wrap gap-2">
        {properties.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPropertyId(p.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              selectedPropertyId === p.id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {propertyItems.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          {outCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>{outCount} out
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>{lowCount} low
            </span>
          )}
          {okCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{okCount} stocked
            </span>
          )}
          <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">{propertyItems.length} items total</span>
        </div>
      )}

      {/* Item list */}
      {propertyItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No inventory items for this property</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Add items to start tracking what should be in the house</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {propertyItems.map((item) => {
              const status = statusFor(item);
              const needsRestock = item.minQuantity > 0 && item.quantity < item.minQuantity;
              const suggestedQty = Math.max(0, item.minQuantity - item.quantity);

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 px-4 py-3.5 ${
                    status === "out" ? "bg-red-50/40 dark:bg-red-950/20" :
                    status === "low" ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                  }`}
                >
                  {/* Status dot */}
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    status === "out"   ? "bg-red-500" :
                    status === "low"   ? "bg-amber-500" :
                    status === "ok"    ? "bg-emerald-500" :
                    "bg-zinc-300 dark:bg-zinc-600"
                  }`} />

                  {/* Name + category */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
                      {item.category.replace(/_/g, " ").toLowerCase()}
                      {item.notes && ` · ${item.notes}`}
                    </p>
                  </div>

                  {/* Qty */}
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold ${
                      status === "out" ? "text-red-600 dark:text-red-400" :
                      status === "low" ? "text-amber-600 dark:text-amber-400" :
                      "text-zinc-700 dark:text-zinc-300"
                    }`}>
                      {item.quantity}
                      {item.minQuantity > 0 && <span className="font-normal text-zinc-400"> / {item.minQuantity}</span>}
                    </p>
                    <p className="text-xs text-zinc-400">{item.unit}</p>
                  </div>

                  {/* Action */}
                  {needsRestock ? (
                    <button
                      onClick={() => setRestockItem(item)}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      {suggestedQty > 0 ? `+${suggestedQty}` : "Restock"}
                    </button>
                  ) : (
                    <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RecordMovementModal
        item={restockItem}
        defaultType="IN"
        onClose={() => setRestockItem(null)}
        onSuccess={() => { setRestockItem(null); onAction(); }}
      />
    </>
  );
}
