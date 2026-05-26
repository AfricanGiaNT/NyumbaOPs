"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { InventoryCategory, InventoryItem, Property } from "@/lib/types";

type Props = {
  isOpen: boolean;
  properties: Property[];
  onClose: () => void;
  onSuccess: () => void;
};

type Row = {
  id: string; // local key only
  name: string;
  category: InventoryCategory;
  quantity: string;
  minQuantity: string;
  unit: string;
  notes: string;
};

const CATEGORIES: InventoryCategory[] = [
  "CLEANING_SUPPLIES", "TOOLS", "BEDDING", "KITCHEN",
  "TOILETRIES", "FURNITURE", "APPLIANCES", "SAFETY", "GENERAL", "OTHER",
];

function formatCat(c: string) {
  return c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ");
}

function emptyRow(): Row {
  return { id: crypto.randomUUID(), name: "", category: "GENERAL", quantity: "0", minQuantity: "0", unit: "unit", notes: "" };
}

export function BulkAddModal({ isOpen, properties, onClose, onSuccess }: Props) {
  const [targetId, setTargetId]       = useState("");
  const [templateId, setTemplateId]   = useState("");
  const [rows, setRows]               = useState<Row[]>([emptyRow()]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTargetId("");
      setTemplateId("");
      setRows([emptyRow()]);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadTemplate = async () => {
    if (!templateId) return;
    setLoadingTemplate(true);
    try {
      const items = await apiGet<InventoryItem[]>(`/inventory?propertyId=${templateId}`);
      if (items.length === 0) { alert("That property has no inventory items to copy."); return; }
      setRows(
        items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          category: item.category,
          quantity: "0",          // fresh start for the new property
          minQuantity: String(item.minQuantity),
          unit: item.unit,
          notes: item.notes ?? "",
        })),
      );
    } catch {
      alert("Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const updateRow = (id: string, field: keyof Row, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const deleteRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await apiPost<{ created: number; skipped: number }>("/inventory/bulk", {
        propertyId: targetId,
        items: validRows.map((r) => ({
          name: r.name.trim(),
          category: r.category,
          quantity: parseInt(r.quantity) || 0,
          minQuantity: parseInt(r.minQuantity) || 0,
          unit: r.unit || "unit",
          notes: r.notes || undefined,
        })),
      });
      setResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const templateOptions = properties.filter((p) => p.id !== targetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-4xl flex-col rounded-xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bulk Add Inventory</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Add multiple items at once, or copy a template from another property</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          /* Success screen */
          <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {result.created} item{result.created !== 1 ? "s" : ""} added
              </p>
              {result.skipped > 0 && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {result.skipped} skipped (already exist in this property)
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Close
              </button>
              <button onClick={() => { onSuccess(); onClose(); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                View Inventory
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            {/* Target property + template picker */}
            <div className="grid grid-cols-1 gap-4 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Add to property *
                </label>
                <select
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                >
                  <option value="">Select property…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Copy template from <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    disabled={!targetId || templateOptions.length === 0}
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100 disabled:opacity-50"
                  >
                    <option value="">— start blank —</option>
                    {templateOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={loadTemplate}
                    disabled={!templateId || loadingTemplate}
                    className="rounded-lg bg-zinc-700 dark:bg-zinc-600 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-600 dark:hover:bg-zinc-500 disabled:opacity-40 transition shrink-0"
                  >
                    {loadingTemplate ? "…" : "Load"}
                  </button>
                </div>
                {templateId && rows.length > 1 && (
                  <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                    {rows.length} items loaded — edit below before saving
                  </p>
                )}
              </div>
            </div>

            {/* Spreadsheet */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 w-[28%]">Item Name *</th>
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 pl-2 w-[20%]">Category</th>
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 pl-2 w-[10%]">Qty</th>
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 pl-2 w-[10%]">Min Qty</th>
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 pl-2 w-[12%]">Unit</th>
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500 pl-2 hidden sm:table-cell">Notes</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, "name", e.target.value)}
                          placeholder="e.g. Toilet paper"
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        />
                      </td>
                      <td className="py-1.5 pl-2 pr-2">
                        <select
                          value={row.category}
                          onChange={(e) => updateRow(row.id, "category", e.target.value)}
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{formatCat(c)}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pl-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        />
                      </td>
                      <td className="py-1.5 pl-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={row.minQuantity}
                          onChange={(e) => updateRow(row.id, "minQuantity", e.target.value)}
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        />
                      </td>
                      <td className="py-1.5 pl-2 pr-2">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                          placeholder="unit"
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        />
                      </td>
                      <td className="py-1.5 pl-2 pr-2 hidden sm:table-cell">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                          placeholder="optional"
                          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                        />
                      </td>
                      <td className="py-1.5 pl-1">
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          disabled={rows.length === 1}
                          className="rounded p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 disabled:opacity-30 transition"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={addRow}
                className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add row
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {rows.filter((r) => r.name.trim()).length} of {rows.length} rows have a name · duplicates will be skipped
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !targetId || rows.filter((r) => r.name.trim()).length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : `Save ${rows.filter((r) => r.name.trim()).length} items`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
