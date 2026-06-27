"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { InventoryItem, Property } from "@/lib/types";
import { ShoppingList } from "@/components/inventory/ShoppingList";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function ShopContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, propsRes] = await Promise.allSettled([
        apiGet<InventoryItem[]>("/inventory"),
        apiGet<Property[]>("/properties"),
      ]);
      if (itemsRes.status === "fulfilled") setItems(itemsRes.value);
      else console.error("Failed to load inventory", itemsRes.reason);
      if (propsRes.status === "fulfilled") setProperties(propsRes.value);
      else console.error("Failed to load properties", propsRes.reason);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">Shopping List</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Tick items as you grab them, then record what you bought
          </p>
        </div>
        <Link
          href="/inventory"
          className="shrink-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
        >
          Inventory
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <ShoppingList items={items} properties={properties} onComplete={loadData} />
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ShopContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
