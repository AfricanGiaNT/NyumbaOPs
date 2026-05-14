"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet } from "@/lib/api";
import { InventoryCategory, InventoryItem, Property, StockMovementType } from "@/lib/types";
import { AddInventoryItemModal } from "@/components/inventory/AddInventoryItemModal";
import { RecordMovementModal } from "@/components/inventory/RecordMovementModal";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatCost(amount?: number | null, currency?: string) {
  if (!amount) return "—";
  return `${currency ?? "MWK"} ${amount.toLocaleString()}`;
}

type MovementAction = { item: InventoryItem; type: StockMovementType };

function InventoryContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [movement, setMovement] = useState<MovementAction | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lowStockDismissed, setLowStockDismissed] = useState(false);

  // Filters
  const [filterProperty, setFilterProperty] = useState("");
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | "">("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProperty) params.set("propertyId", filterProperty);
      if (filterCategory) params.set("category", filterCategory);
      if (filterLowStock) params.set("lowStock", "true");

      const [itemsData, propsData] = await Promise.all([
        apiGet<InventoryItem[]>(`/inventory?${params}`),
        apiGet<Property[]>("/properties"),
      ]);
      setItems(itemsData);
      setProperties(propsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterCategory, filterLowStock]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    try {
      await apiDelete(`/inventory/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete item");
    } finally {
      setDeleting(null);
    }
  };

  const allLowStockItems = items.filter((i) => i.minQuantity > 0 && i.quantity < i.minQuantity);
  const totalValue = items.reduce((sum, i) => {
    if (i.unitCost) return sum + i.quantity * i.unitCost;
    return sum;
  }, 0);

  // Group by property
  const grouped: Record<string, InventoryItem[]> = {};
  items.forEach((item) => {
    const key = item.property?.location
      ? `${item.property.location} — ${item.property.name}`
      : item.property?.name ?? "Unknown Property";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const CATEGORIES: InventoryCategory[] = [
    "CLEANING_SUPPLIES", "TOOLS", "BEDDING", "KITCHEN",
    "TOILETRIES", "FURNITURE", "APPLIANCES", "SAFETY", "GENERAL", "OTHER",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inventory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage supplies and materials per property</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Items</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{items.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Low Stock</p>
          <p className={`mt-1 text-2xl font-bold ${allLowStockItems.length > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
            {allLowStockItems.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Value (est.)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {totalValue > 0 ? totalValue.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Low stock banner */}
      {allLowStockItems.length > 0 && !lowStockDismissed && !filterLowStock && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {allLowStockItems.length} {allLowStockItems.length === 1 ? "item is" : "items are"} below minimum stock level
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setFilterLowStock(true)}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              View Low Stock
            </button>
            <button
              onClick={() => setLowStockDismissed(true)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ""}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as InventoryCategory | "")}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{formatLabel(c)}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Low stock only</span>
        </label>

        {(filterProperty || filterCategory || filterLowStock) && (
          <button
            onClick={() => { setFilterProperty(""); setFilterCategory(""); setFilterLowStock(false); }}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Inventory list — grouped by property */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No inventory items found</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Add your first item to start tracking supplies</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, groupItems]) => (
            <div key={groupKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {groupKey}
              </h3>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Unit Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => {
                      const isLow = item.minQuantity > 0 && item.quantity < item.minQuantity;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                            isLow ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</div>
                            {item.notes && (
                              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{item.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatLabel(item.category)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${isLow ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                              {item.quantity}
                            </span>
                            <span className="text-xs text-zinc-400 ml-1">{item.unit}</span>
                            {item.minQuantity > 0 && (
                              <div className="text-xs text-zinc-400">min {item.minQuantity}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                            {formatCost(item.unitCost, item.currency)}
                          </td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setMovement({ item, type: "IN" })}
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                                title="Restock"
                              >
                                +IN
                              </button>
                              <button
                                onClick={() => setMovement({ item, type: "OUT" })}
                                disabled={item.quantity === 0}
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-30"
                                title="Record usage"
                              >
                                −OUT
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                disabled={deleting === item.id}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                                title="Delete"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddInventoryItemModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={loadData}
      />

      {movement && (
        <RecordMovementModal
          item={movement.item}
          defaultType={movement.type}
          onClose={() => setMovement(null)}
          onSuccess={() => { setMovement(null); loadData(); }}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <InventoryContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
