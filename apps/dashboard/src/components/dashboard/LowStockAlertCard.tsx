"use client";

import { useState } from "react";
import { apiPost } from "../../lib/api";
import { Currency, InventoryItem, StockMovementType } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type MovementDraft = {
  type: StockMovementType;
  quantity: string;
  unitCost: string;
  currency: Currency;
  error?: string;
};

type Props = {
  items: InventoryItem[];
  loading?: boolean;
  onRestocked?: () => void;
};

export function LowStockAlertCard({ items, loading = false, onRestocked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, MovementDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleDraft = (item: InventoryItem) => {
    setMessage(null);
    setDrafts((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { type: "IN", quantity: String(Math.max(1, item.minQuantity - item.quantity)), unitCost: "", currency: item.currency };
      return next;
    });
  };

  const updateDraft = (id: string, patch: Partial<MovementDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch, error: undefined } }));
  };

  const recordChanges = async () => {
    const selected = items.filter((item) => drafts[item.id]);
    const invalid: Record<string, string> = {};
    for (const item of selected) {
      const draft = drafts[item.id];
      const quantity = Number(draft.quantity);
      const cost = Number(draft.unitCost);
      if (!Number.isInteger(quantity) || quantity < 1) invalid[item.id] = "Enter a whole quantity of at least 1.";
      else if (draft.type === "OUT" && quantity > item.quantity) invalid[item.id] = `Only ${item.quantity} ${item.unit} available.`;
      else if (draft.type === "IN" && draft.unitCost !== "" && (!Number.isInteger(cost) || cost < 0)) invalid[item.id] = "Enter a valid whole unit cost.";
    }
    if (Object.keys(invalid).length) {
      setDrafts((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, { ...draft, error: invalid[id] }])));
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const results = await Promise.allSettled(selected.map((item) => {
      const draft = drafts[item.id];
      return apiPost(`/inventory/${item.id}/movements`, {
        type: draft.type,
        quantity: Number(draft.quantity),
        currency: draft.currency,
        unitCost: draft.type === "IN" && draft.unitCost !== "" ? Number(draft.unitCost) : undefined,
      });
    }));
    const successIds = new Set<string>();
    const failed: Record<string, string> = {};
    results.forEach((result, index) => {
      const id = selected[index].id;
      if (result.status === "fulfilled") successIds.add(id);
      else failed[id] = result.reason instanceof Error ? result.reason.message : "Could not save this movement.";
    });
    setDrafts((current) => {
      const next = { ...current };
      for (const id of successIds) delete next[id];
      for (const [id, error] of Object.entries(failed)) if (next[id]) next[id] = { ...next[id], error };
      return next;
    });
    setMessage(`${successIds.size} recorded${Object.keys(failed).length ? `, ${Object.keys(failed).length} need attention` : ""}.`);
    setSubmitting(false);
    if (successIds.size) onRestocked?.();
  };

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
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">All stocked — no items below par level</p>
        </div>
      </DashboardCard>
    );
  }

  const sortedItems = [...items].sort((a, b) =>
    Number(a.quantity > 0) - Number(b.quantity > 0) ||
    (b.minQuantity - b.quantity) - (a.minQuantity - a.quantity) ||
    a.name.localeCompare(b.name),
  );
  const visibleItems = expanded ? sortedItems : sortedItems.filter((item, index) => index < 3 || drafts[item.id]);
  const selectedCount = items.filter((item) => drafts[item.id]).length;

  // Group the visible items by property name.
  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of visibleItems) {
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
        <div className="space-y-2">
          {Object.entries(grouped).map(([propertyName, propertyItems]) => (
            <div key={propertyName} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 bg-amber-50/70 px-3 py-1.5 dark:bg-amber-950/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="truncate text-xs font-semibold text-amber-900 dark:text-amber-200">{propertyName}</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {propertyItems.map((item) => (
                  <div key={item.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{item.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.quantity === 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {item.quantity}/{item.minQuantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleDraft(item)}
                        aria-expanded={Boolean(drafts[item.id])}
                        className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                      >
                        {drafts[item.id] ? "Cancel" : "Adjust"}
                      </button>
                    </div>
                    </div>
                    {drafts[item.id] && <div className="mt-2 grid gap-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60 sm:grid-cols-[auto_5rem_minmax(0,1fr)] sm:items-end">
                      <div role="group" aria-label={`Movement type for ${item.name}`} className="flex gap-1">
                        {(["IN", "OUT"] as StockMovementType[]).map((type) => <button key={type} type="button" disabled={submitting || (type === "OUT" && item.quantity === 0)} aria-pressed={drafts[item.id].type === type} onClick={() => updateDraft(item.id, { type, quantity: type === "OUT" ? "1" : String(Math.max(1, item.minQuantity - item.quantity)) })} className={`rounded-md border px-2 py-1.5 text-xs font-medium disabled:opacity-40 ${drafts[item.id].type === type ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700"}`}>{type}</button>)}
                      </div>
                      <div><label htmlFor={`stock-qty-${item.id}`} className="mb-0.5 block text-[11px] text-zinc-500">Qty</label><input id={`stock-qty-${item.id}`} type="number" min="1" max={drafts[item.id].type === "OUT" ? item.quantity : undefined} value={drafts[item.id].quantity} disabled={submitting} onChange={(event) => updateDraft(item.id, { quantity: event.target.value })} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" /></div>
                      {drafts[item.id].type === "IN" && <div className="flex min-w-0 items-end gap-1"><div className="min-w-0 flex-1"><label htmlFor={`stock-cost-${item.id}`} className="mb-0.5 block text-[11px] text-zinc-500">Cost/unit <span className="font-normal">(optional)</span></label><input id={`stock-cost-${item.id}`} type="number" min="0" value={drafts[item.id].unitCost} disabled={submitting} onChange={(event) => updateDraft(item.id, { unitCost: event.target.value })} placeholder="No expense" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" /></div><select aria-label={`Cost currency for ${item.name}`} value={drafts[item.id].currency} disabled={submitting} onChange={(event) => updateDraft(item.id, { currency: event.target.value as Currency })} className="rounded-md border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="MWK">MWK</option><option value="USD">USD</option></select></div>}
                      {drafts[item.id].error && <p role="alert" className="text-xs text-rose-600 sm:col-span-3">{drafts[item.id].error}</p>}
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length > 3 && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="w-full rounded-lg py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20">{expanded ? "Show less" : `Show all ${items.length} items`}</button>}
          {selectedCount > 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 dark:border-indigo-900 dark:bg-indigo-950/20"><p className="text-xs text-zinc-600 dark:text-zinc-300">{selectedCount} change{selectedCount === 1 ? "" : "s"} ready. A unit cost records an expense.</p><button type="button" disabled={submitting} onClick={recordChanges} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Recording…" : `Record ${selectedCount} change${selectedCount === 1 ? "" : "s"}`}</button></div>}
          {message && <p role="status" className="text-xs text-zinc-600 dark:text-zinc-300">{message}</p>}
        </div>
      </DashboardCard>
    </>
  );
}
