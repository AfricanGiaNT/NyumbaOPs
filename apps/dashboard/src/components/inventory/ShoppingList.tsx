"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { InventoryItem, Property } from "@/lib/types";
import { RestockListModal } from "./RestockListModal";

type TrackedLine = {
  key: string;
  kind: "tracked";
  item: InventoryItem;
  buyQty: number;
  unitCost: string;
  checked: boolean;
};

type ExtraLine = {
  key: string;
  kind: "extra";
  name: string;
  buyQty: number;
  checked: boolean;
};

type Line = TrackedLine | ExtraLine;

type Props = {
  items: InventoryItem[];
  properties: Property[];
  onComplete: () => void;
};

const isLow = (i: InventoryItem) => i.minQuantity > 0 && i.quantity < i.minQuantity;
const suggestedQty = (i: InventoryItem) => Math.max(1, i.minQuantity - i.quantity);

export function ShoppingList({ items, properties, onComplete }: Props) {
  const router = useRouter();

  // Auto-populate with everything below par.
  const [lines, setLines] = useState<Line[]>(() =>
    items
      .filter(isLow)
      .sort((a, b) => {
        const order = (i: InventoryItem) => (i.quantity === 0 ? 0 : 1);
        return order(a) - order(b) || a.name.localeCompare(b.name);
      })
      .map((item) => ({
        key: item.id,
        kind: "tracked" as const,
        item,
        buyQty: suggestedQty(item),
        unitCost: item.unitCost?.toString() ?? "",
        checked: false,
      })),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addFilter, setAddFilter] = useState("");
  const [extraName, setExtraName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onListItemIds = useMemo(
    () => new Set(lines.filter((l): l is TrackedLine => l.kind === "tracked").map((l) => l.item.id)),
    [lines],
  );

  const propertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? "Unknown Property";

  // Group tracked lines by property; extras sit in their own group at the bottom.
  const grouped = useMemo(() => {
    const map = new Map<string, TrackedLine[]>();
    for (const l of lines) {
      if (l.kind !== "tracked") continue;
      const name = propertyName(l.item.propertyId);
      const g = map.get(name) ?? [];
      g.push(l);
      map.set(name, g);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, properties]);

  const extras = lines.filter((l): l is ExtraLine => l.kind === "extra");

  const checkedCount = lines.filter((l) => l.checked).length;

  // Estimated cost of checked tracked items, grouped by currency.
  const totals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const l of lines) {
      if (l.kind !== "tracked" || !l.checked) continue;
      const cost = parseInt(l.unitCost || "0", 10);
      if (!cost) continue;
      byCurrency[l.item.currency] = (byCurrency[l.item.currency] ?? 0) + cost * l.buyQty;
    }
    return byCurrency;
  }, [lines]);

  function patchLine(key: string, patch: Partial<TrackedLine> & Partial<ExtraLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? ({ ...l, ...patch } as Line) : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function addTrackedItem(item: InventoryItem) {
    setLines((prev) => [
      ...prev,
      {
        key: item.id,
        kind: "tracked",
        item,
        buyQty: suggestedQty(item),
        unitCost: item.unitCost?.toString() ?? "",
        checked: false,
      },
    ]);
    setAddOpen(false);
    setAddFilter("");
  }

  function addExtra() {
    const name = extraName.trim();
    if (!name) return;
    setLines((prev) => [
      ...prev,
      { key: `extra-${Date.now()}`, kind: "extra", name, buyQty: 1, checked: false },
    ]);
    setExtraName("");
  }

  async function handleRecord() {
    const toRecord = lines.filter(
      (l): l is TrackedLine => l.kind === "tracked" && l.checked,
    );
    if (toRecord.length === 0) {
      setError("Tick the items you bought first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/inventory/movements/batch", {
        items: toRecord.map((l) => ({
          itemId: l.item.id,
          quantity: l.buyQty,
          unitCost: l.unitCost ? parseInt(l.unitCost, 10) : undefined,
          currency: l.item.currency,
        })),
      });
      onComplete();
      router.push("/inventory");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record purchases");
    } finally {
      setSubmitting(false);
    }
  }

  const availableToAdd = items
    .filter((i) => !onListItemIds.has(i.id))
    .filter((i) => i.name.toLowerCase().includes(addFilter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const shareItems = lines
    .filter((l): l is TrackedLine => l.kind === "tracked")
    .map((l) => l.item);

  const hasAnyCost = Object.keys(totals).length > 0;

  return (
    <>
      <div className="space-y-4 pb-32">
        {/* Add controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add item
          </button>
          <button
            onClick={() => setShareOpen(true)}
            disabled={shareItems.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share list
          </button>
        </div>

        {/* Add-item panel */}
        {addOpen && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-3">
            <input
              autoFocus
              value={addFilter}
              onChange={(e) => setAddFilter(e.target.value)}
              placeholder="Search items to add…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
            />
            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {availableToAdd.length === 0 ? (
                <p className="py-3 text-center text-sm text-zinc-400">No matching items</p>
              ) : (
                availableToAdd.slice(0, 30).map((i) => (
                  <button
                    key={i.id}
                    onClick={() => addTrackedItem(i)}
                    className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 rounded"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {i.name}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">{propertyName(i.propertyId)}</span>
                  </button>
                ))
              )}
            </div>
            {/* Add a free-text extra */}
            <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <input
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }}
                placeholder="…or type an extra (not tracked)"
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
              <button
                onClick={addExtra}
                className="shrink-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {lines.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nothing to buy 🎉</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Everything is above its minimum. Use “Add item” to build a list anyway.</p>
          </div>
        )}

        {/* Tracked groups by property */}
        {[...grouped.entries()].map(([property, propLines]) => (
          <div key={property} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5">
              <svg className="h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{property}</span>
              <span className="ml-auto text-xs text-zinc-400">{propLines.length} item{propLines.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {propLines.map((l) => (
                <ShoppingRow
                  key={l.key}
                  line={l}
                  onToggle={() => patchLine(l.key, { checked: !l.checked })}
                  onQty={(buyQty) => patchLine(l.key, { buyQty })}
                  onCost={(unitCost) => patchLine(l.key, { unitCost })}
                  onRemove={() => removeLine(l.key)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Extras */}
        {extras.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Extras</span>
              <span className="ml-auto text-xs text-zinc-400">not tracked — reminders only</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {extras.map((l) => (
                <div key={l.key} className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${l.checked ? "opacity-50" : ""}`}>
                  <CheckButton checked={l.checked} onClick={() => patchLine(l.key, { checked: !l.checked })} />
                  <span className={`min-w-0 flex-1 truncate text-base font-medium text-zinc-900 dark:text-zinc-100 ${l.checked ? "line-through" : ""}`}>
                    {l.name}
                  </span>
                  <QtyStepper value={l.buyQty} onChange={(v) => patchLine(l.key, { buyQty: v })} />
                  <RemoveButton onClick={() => removeLine(l.key)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 py-3 lg:left-60">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {checkedCount} of {lines.length} got
            </p>
            {hasAnyCost && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                ≈ {Object.entries(totals).map(([cur, amt]) => `${cur} ${amt.toLocaleString()}`).join(" · ")}
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <button
            onClick={handleRecord}
            disabled={submitting || checkedCount === 0}
            className="shrink-0 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition disabled:opacity-40"
          >
            {submitting ? "Recording…" : "Record purchases"}
          </button>
        </div>
      </div>

      {shareOpen && <RestockListModal items={shareItems} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ShoppingRow({
  line,
  onToggle,
  onQty,
  onCost,
  onRemove,
}: {
  line: TrackedLine;
  onToggle: () => void;
  onQty: (v: number) => void;
  onCost: (v: string) => void;
  onRemove: () => void;
}) {
  const { item, checked } = line;
  const out = item.quantity === 0;

  return (
    <div className={`px-3 sm:px-4 py-3 ${checked ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <CheckButton checked={checked} onClick={onToggle} />
        <div className="min-w-0 flex-1">
          <p className={`text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight ${checked ? "line-through" : ""}`}>
            {item.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            <span className={out ? "text-red-500 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
              have {item.quantity}
            </span>
            {item.minQuantity > 0 && <span className="text-zinc-400"> / min {item.minQuantity} {item.unit}</span>}
          </p>
        </div>
        <QtyStepper value={line.buyQty} onChange={onQty} />
        <RemoveButton onClick={onRemove} />
      </div>
      {/* Unit cost */}
      <div className="mt-2 flex items-center gap-2 pl-12">
        <span className="text-xs text-zinc-400">Cost / {item.unit} ({item.currency})</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={line.unitCost}
          onChange={(e) => onCost(e.target.value)}
          placeholder="0"
          className="w-24 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
        />
      </div>
    </div>
  );
}

function CheckButton({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${
        checked
          ? "border-green-600 bg-green-600 text-white"
          : "border-zinc-300 dark:border-zinc-600 text-transparent hover:border-green-500"
      }`}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </button>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="decrease"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value || "1", 10)))}
        className="h-9 w-12 border-x border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center text-sm font-medium tabular-nums focus:outline-none dark:text-zinc-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="flex h-9 w-9 items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800"
      aria-label="remove"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
