"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { InventoryItem, Property } from "@/lib/types";
import { AddInventoryItemModal } from "@/components/inventory/AddInventoryItemModal";
import { BulkAddModal } from "@/components/inventory/BulkAddModal";
import { InventoryKanban } from "@/components/inventory/InventoryKanban";
import { PropertyChecklist } from "@/components/inventory/PropertyChecklist";
import { RestockListModal } from "@/components/inventory/RestockListModal";
import { UtilitiesTab } from "@/components/inventory/UtilitiesTab";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

type MainTab   = "stock" | "utilities";
type StockView = "kanban" | "checklist";

function InventoryContent() {
  const [mainTab,   setMainTab]   = useState<MainTab>("stock");
  const [stockView, setStockView] = useState<StockView>("kanban");

  const [items,      setItems]      = useState<InventoryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [addOpen,         setAddOpen]         = useState(false);
  const [bulkOpen,        setBulkOpen]        = useState(false);
  const [restockListOpen, setRestockListOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, propsData] = await Promise.all([
        apiGet<InventoryItem[]>("/inventory"),
        apiGet<Property[]>("/properties"),
      ]);
      setItems(itemsData);
      setProperties(propsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const lowStockItems = items.filter((i) => i.minQuantity > 0 && i.quantity < i.minQuantity);
  const outCount      = items.filter((i) => i.quantity === 0).length;
  const lowCount      = items.filter((i) => i.quantity > 0 && i.minQuantity > 0 && i.quantity < i.minQuantity).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inventory</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Track supplies per property · {outCount > 0 && <span className="text-red-500 font-medium">{outCount} out</span>}{outCount > 0 && lowCount > 0 && " · "}{lowCount > 0 && <span className="text-amber-500 font-medium">{lowCount} low</span>}
          </p>
        </div>

        {mainTab === "stock" && (
          <div className={`grid gap-2 sm:flex sm:flex-wrap sm:items-center ${lowStockItems.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
            {lowStockItems.length > 0 && (
              <button
                onClick={() => setRestockListOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Restock</span>
              </button>
            )}
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
              </svg>
              <span>Bulk Add</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-indigo-500 transition"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Top-level tabs: Stock | Utilities */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 p-1 w-fit">
        {(["stock", "utilities"] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mainTab === tab
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "stock" ? "Stock Items" : "Utilities"}
          </button>
        ))}
      </div>

      {/* Utilities tab */}
      {mainTab === "utilities" && <UtilitiesTab properties={properties} />}

      {/* Stock Items tab */}
      {mainTab === "stock" && (
        <>
          {/* View switcher: Kanban | Checklist */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                onClick={() => setStockView("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  stockView === "kanban"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Status Board
              </button>
              <button
                onClick={() => setStockView("checklist")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  stockView === "checklist"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m5 5l-3 3-1.5-1.5" />
                </svg>
                Property Checklist
              </button>
            </div>
            <p className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-500">
              {stockView === "checklist" ? "Post-checkout walkthrough" : "Stock status across all properties"}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No inventory items yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Use "Bulk Add" to set up a full property at once</p>
              <button
                onClick={() => setBulkOpen(true)}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Bulk Add Items
              </button>
            </div>
          ) : stockView === "kanban" ? (
            <InventoryKanban items={items} properties={properties} onAction={loadData} />
          ) : (
            <PropertyChecklist items={items} properties={properties} onAction={loadData} />
          )}
        </>
      )}

      {/* Modals */}
      <AddInventoryItemModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSuccess={loadData} />
      <BulkAddModal isOpen={bulkOpen} properties={properties} onClose={() => setBulkOpen(false)} onSuccess={loadData} />
      {restockListOpen && <RestockListModal items={lowStockItems} onClose={() => setRestockListOpen(false)} />}
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
