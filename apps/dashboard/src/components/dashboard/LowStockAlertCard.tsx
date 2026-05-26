"use client";

import { useState } from "react";
import { InventoryItem } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";
import { RecordMovementModal } from "../inventory/RecordMovementModal";

type Props = {
  items: InventoryItem[];
  loading?: boolean;
  onRestocked?: () => void;
};

export function LowStockAlertCard({ items, loading = false, onRestocked }: Props) {
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);

  if (loading) {
    return (
      <DashboardCard title="Low Stock Alerts">
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </DashboardCard>
    );
  }

  if (items.length === 0) {
    return (
      <DashboardCard title="Low Stock Alerts">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">All stocked — no items below par level</p>
        </div>
      </DashboardCard>
    );
  }

  // Group by property name
  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    const name = item.property?.name ?? "Unknown Property";
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(item);
  }

  return (
    <>
      <DashboardCard
        title="Low Stock Alerts"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} below par level`}
        action={{ label: "View Inventory", onClick: () => { window.location.href = "/inventory"; } }}
      >
        <div className="space-y-4">
          {Object.entries(grouped).map(([propertyName, propertyItems]) => (
            <div key={propertyName} className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
              {/* Property header */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5">
                <svg className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{propertyName}</span>
                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">
                  {propertyItems.length} item{propertyItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Item rows */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {propertyItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 sm:py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.name}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
                        {item.category.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                        {item.quantity}/{item.minQuantity} {item.unit}
                      </span>
                      <button
                        onClick={() => setRestockItem(item)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <RecordMovementModal
        item={restockItem}
        defaultType="IN"
        onClose={() => setRestockItem(null)}
        onSuccess={() => {
          setRestockItem(null);
          onRestocked?.();
        }}
      />
    </>
  );
}
