"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Booking, Currency, InventoryItem, Property, Transaction } from "../../lib/types";

type Props = {
  property: Property;
  transactions: Transaction[];
  inventory: InventoryItem[];
  bookings: Booking[];
  showFinancials: boolean;
};

type Totals = { revenue: number; expense: number };
type StockFilter = "all" | "low";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/90 text-white" },
  MAINTENANCE: { label: "Maintenance", className: "bg-amber-500/90 text-white" },
  INACTIVE: { label: "Inactive", className: "bg-zinc-500/90 text-white" },
};

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING_SUPPLIES: "Cleaning",
  TOOLS: "Tools",
  BEDDING: "Bedding",
  KITCHEN: "Kitchen",
  TOILETRIES: "Toiletries",
  FURNITURE: "Furniture",
  APPLIANCES: "Appliances",
  SAFETY: "Safety",
  GENERAL: "General",
  OTHER: "Other",
};

function stockLevel(item: InventoryItem): "out" | "low" | "ok" {
  if (item.quantity <= 0) return "out";
  if (item.minQuantity > 0 && item.quantity < item.minQuantity) return "low";
  return "ok";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PropertySummaryCard({ property, transactions, inventory, bookings, showFinancials }: Props) {
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const cover = useMemo(() => {
    const imgs = [...(property.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    return imgs.find((i) => i.isCover) ?? imgs[0];
  }, [property.images]);

  const finance = useMemo(() => {
    const byCurrency: Partial<Record<Currency, Totals>> = {};
    for (const tx of transactions) {
      const t = (byCurrency[tx.currency] ??= { revenue: 0, expense: 0 });
      if (tx.type === "REVENUE") t.revenue += tx.amount;
      else t.expense += tx.amount;
    }
    return Object.entries(byCurrency) as [Currency, Totals][];
  }, [transactions]);

  const stock = useMemo(() => {
    const counts = { ok: 0, low: 0, out: 0 };
    for (const item of inventory) counts[stockLevel(item)]++;
    const rank = { out: 0, low: 1, ok: 2 };
    const sorted = [...inventory].sort(
      (a, b) => rank[stockLevel(a)] - rank[stockLevel(b)] || a.name.localeCompare(b.name),
    );
    return { counts, sorted };
  }, [inventory]);

  const occupancy = useMemo(() => {
    const now = new Date();
    const current = bookings.find(
      (b) => b.status === "CHECKED_IN" || (new Date(b.checkInDate) <= now && new Date(b.checkOutDate) > now && b.status === "CONFIRMED"),
    );
    const next = bookings
      .filter((b) => new Date(b.checkInDate) > now && (b.status === "CONFIRMED" || b.status === "PENDING"))
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())[0];
    return { current, next };
  }, [bookings]);

  const total = inventory.length;
  const needsAttention = stock.counts.low + stock.counts.out;
  const healthPct = total ? Math.round((stock.counts.ok / total) * 100) : 100;
  const visibleItems = stockFilter === "low" ? stock.sorted.filter((i) => stockLevel(i) !== "ok") : stock.sorted;
  const status = STATUS_STYLES[property.status] ?? STATUS_STYLES.INACTIVE;

  return (
    <article className="group flex h-[34rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.alt ?? property.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur ${status.className}`}>
          {status.label}
        </span>
        <div className="absolute inset-x-3 bottom-2.5">
          <Link href={`/properties/${property.id}`} className="block truncate text-base font-semibold text-white hover:underline">
            {property.name}
          </Link>
          <p className="truncate text-xs text-white/80">
            {[property.location, `${property.bedrooms} bd`, `${property.maxGuests} guests`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
        {/* Occupancy */}
        <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/60">
          <span className={`h-2 w-2 shrink-0 rounded-full ${occupancy.current ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
          <div className="min-w-0 flex-1">
            {occupancy.current ? (
              <p className="truncate text-zinc-700 dark:text-zinc-200">
                <span className="font-semibold">Occupied</span>
                {occupancy.current.guest?.name ? ` · ${occupancy.current.guest.name}` : ""} · out {formatDate(occupancy.current.checkOutDate)}
              </p>
            ) : (
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Vacant</p>
            )}
            {occupancy.next && (
              <p className="truncate text-zinc-500 dark:text-zinc-400">
                Next in {formatDate(occupancy.next.checkInDate)}
                {occupancy.next.guest?.name ? ` · ${occupancy.next.guest.name}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Breakdown this month */}
        {showFinancials && (
          <section>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">This month</h4>
            {finance.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2">
                {finance.map(([cur, t]) => {
                  const net = t.revenue - t.expense;
                  return (
                    <div key={cur} className="grid grid-cols-3 gap-2">
                      <Metric label={`Revenue${finance.length > 1 ? ` (${cur})` : ""}`} value={t.revenue} tone="pos" />
                      <Metric label="Expenses" value={t.expense} tone="neg" />
                      <Metric label="Net" value={net} tone={net > 0 ? "pos" : net < 0 ? "neg" : "neutral"} signed />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Stock */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Stock</h4>
            {total > 0 && (
              <div className="flex rounded-lg bg-zinc-100 p-0.5 text-[11px] font-medium dark:bg-zinc-800">
                {(["all", "low"] as StockFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={stockFilter === f}
                    onClick={() => setStockFilter(f)}
                    className={`rounded-md px-2 py-0.5 transition-colors ${
                      stockFilter === f
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {f === "all" ? `All ${total}` : `Needs ${needsAttention}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {total === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No inventory tracked.{" "}
              <Link href="/inventory" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Add items</Link>
            </p>
          ) : (
            <>
              {/* Health bar */}
              <div className="mb-1 flex h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="bg-emerald-500" style={{ width: `${(stock.counts.ok / total) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(stock.counts.low / total) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${(stock.counts.out / total) * 100}%` }} />
              </div>
              <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {healthPct}% stocked · {stock.counts.low} low · {stock.counts.out} out
              </p>

              {visibleItems.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Everything is above par level
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                  {visibleItems.map((item) => {
                    const level = stockLevel(item);
                    const pct = item.minQuantity > 0 ? Math.min(100, (item.quantity / item.minQuantity) * 100) : 100;
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{item.name}</p>
                          <p className="text-[10px] text-zinc-400">{CATEGORY_LABELS[item.category] ?? item.category}</p>
                        </div>
                        <div className="w-16 shrink-0">
                          <div className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className={level === "out" ? "h-full bg-rose-500" : level === "low" ? "h-full bg-amber-400" : "h-full bg-emerald-500"}
                              style={{ width: `${level === "out" ? 100 : pct}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
                            level === "out"
                              ? "text-rose-600 dark:text-rose-400"
                              : level === "low"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          {item.quantity}
                          {item.minQuantity > 0 && <span className="font-normal text-zinc-400">/{item.minQuantity}</span>} {item.unit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800">
        <Link href="/inventory" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Manage stock
        </Link>
        <Link href={`/properties/${property.id}`} className="font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          View property →
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value, tone, signed = false }: { label: string; value: number; tone: "pos" | "neg" | "neutral"; signed?: boolean }) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-rose-600 dark:text-rose-400"
        : "text-zinc-600 dark:text-zinc-300";
  return (
    <div className="rounded-xl bg-zinc-50 px-2.5 py-2 dark:bg-zinc-800/60">
      <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`truncate text-sm font-semibold tabular-nums ${color}`}>
        {signed && value > 0 ? "+" : ""}
        {value.toLocaleString()}
      </p>
    </div>
  );
}
