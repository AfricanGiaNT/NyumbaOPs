"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Currency, InventoryItem, StockMovementType, Work } from "@/lib/types";

type Props = {
  item: InventoryItem | null;
  defaultType?: StockMovementType;
  onClose: () => void;
  onSuccess?: () => void;
};

export function RecordMovementModal({ item, defaultType = "IN", onClose, onSuccess }: Props) {
  const [openWorks, setOpenWorks] = useState<Work[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: defaultType,
    quantity: "1",
    unitCost: "",
    currency: "MWK" as Currency,
    workId: "",
    notes: "",
  });

  useEffect(() => {
    if (item) {
      setForm((f) => ({
        ...f,
        type: defaultType,
        currency: item.currency,
        unitCost: item.unitCost?.toString() ?? "",
      }));
      // Fetch open works for this property
      apiGet<Work[]>(`/works?propertyId=${item.propertyId}&status=PENDING`)
        .then(setOpenWorks)
        .catch(console.error);
    }
  }, [item, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setSubmitting(true);
    try {
      await apiPost(`/inventory/${item.id}/movements`, {
        type: form.type,
        quantity: parseInt(form.quantity),
        unitCost: form.unitCost && form.type === "IN" ? parseInt(form.unitCost) : undefined,
        currency: form.currency,
        workId: form.workId || undefined,
        notes: form.notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to record movement";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost =
    form.type === "IN" && form.unitCost && form.quantity
      ? parseInt(form.unitCost) * parseInt(form.quantity)
      : 0;

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {defaultType === "IN" ? "Restock" : "Record Usage"}
            </h2>
            <p className="text-xs text-zinc-500 truncate max-w-xs">{item.name} — {item.property?.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Movement Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Movement Type</label>
            <div className="flex gap-2">
              {(["IN", "OUT"] as StockMovementType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    form.type === t
                      ? t === "IN"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t === "IN" ? "📦 IN (Restock)" : "📤 OUT (Used)"}
                </button>
              ))}
            </div>
          </div>

          {/* Current stock info */}
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Current stock: </span>
            <span className={`font-medium ${item.quantity < item.minQuantity ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
              {item.quantity} {item.unit}
            </span>
            {item.minQuantity > 0 && (
              <span className="text-zinc-400 dark:text-zinc-500"> (min {item.minQuantity})</span>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Quantity ({item.unit}) *
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              min="1"
              max={form.type === "OUT" ? item.quantity : undefined}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
            />
            {form.type === "OUT" && (
              <p className="mt-1 text-xs text-zinc-400">Max: {item.quantity} {item.unit}</p>
            )}
          </div>

          {/* Unit Cost (IN only) */}
          {form.type === "IN" && (
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
                <div className="flex gap-2">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
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
          )}

          {/* Auto-expense notice for IN with cost */}
          {form.type === "IN" && totalCost > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
              <svg className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-700 dark:text-green-400">
                An <strong>Inventory/Materials expense</strong> of {form.currency} {totalCost.toLocaleString()} will be automatically recorded in Finance.
              </p>
            </div>
          )}

          {/* Link to Work (OUT only) */}
          {form.type === "OUT" && openWorks.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Link to Work <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.workId}
                onChange={(e) => setForm({ ...form, workId: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              >
                <option value="">No linked work</option>
                {openWorks.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
          )}

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
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                form.type === "IN" ? "bg-green-600 hover:bg-green-500" : "bg-orange-600 hover:bg-orange-500"
              }`}
            >
              {submitting ? "Recording…" : form.type === "IN" ? "Record Restock" : "Record Usage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
