"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Currency, InventoryCategory, Property } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const CATEGORIES: InventoryCategory[] = [
  "CLEANING_SUPPLIES", "TOOLS", "BEDDING", "KITCHEN",
  "TOILETRIES", "FURNITURE", "APPLIANCES", "SAFETY", "GENERAL", "OTHER",
];

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function AddInventoryItemModal({ isOpen, onClose, onSuccess }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    propertyId: "",
    category: "GENERAL" as InventoryCategory,
    unit: "unit",
    quantity: "0",
    minQuantity: "0",
    unitCost: "",
    currency: "MWK" as Currency,
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiGet<Property[]>("/properties")
        .then(setProperties)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/inventory", {
        name: form.name,
        propertyId: form.propertyId,
        category: form.category,
        unit: form.unit,
        quantity: parseInt(form.quantity) || 0,
        minQuantity: parseInt(form.minQuantity) || 0,
        unitCost: form.unitCost ? parseInt(form.unitCost) : undefined,
        currency: form.currency,
        notes: form.notes || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create inventory item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ name: "", propertyId: "", category: "GENERAL", unit: "unit", quantity: "0", minQuantity: "0", unitCost: "", currency: "MWK", notes: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add Inventory Item</h2>
            <p className="text-xs text-zinc-500">Track a supply or material for a property</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Toilet paper"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* Property */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Property *</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ""}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{formatLabel(c)}</option>)}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Unit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="rolls, kg, litres, pieces…"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Qty</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  min="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>

              {/* Min Quantity */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Min Qty (alert)</label>
                <input
                  type="number"
                  value={form.minQuantity}
                  onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                  min="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Unit Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Unit Cost <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                  min="0"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
                <div className="flex gap-2">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        form.currency === c
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                          : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                {submitting ? "Adding…" : "Add Item"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
