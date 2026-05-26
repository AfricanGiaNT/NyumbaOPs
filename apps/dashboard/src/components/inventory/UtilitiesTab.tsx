"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet } from "@/lib/api";
import { Property, UtilityAnomaly, UtilityBill, UtilityType } from "@/lib/types";
import { LogUtilityBillModal } from "./LogUtilityBillModal";

type Props = {
  properties: Property[];
};

const UTILITY_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  GAS: "Gas",
  INTERNET: "Internet",
  OTHER: "Other",
};

const UTILITY_ICONS: Record<UtilityType, string> = {
  ELECTRICITY: "⚡",
  WATER: "💧",
  GAS: "🔥",
  INTERNET: "📶",
  OTHER: "🔧",
};

const ALL_UTILITY_TYPES: UtilityType[] = ["ELECTRICITY", "WATER", "GAS", "INTERNET", "OTHER"];

export function UtilitiesTab({ properties }: Props) {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [anomalies, setAnomalies] = useState<UtilityAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<UtilityType>("ELECTRICITY");
  const [filterProperty, setFilterProperty] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Show last 6 months by default
  const [monthsBack] = useState(6);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProperty) params.set("propertyId", filterProperty);

      const [billsData, anomalyData] = await Promise.all([
        apiGet<UtilityBill[]>(`/utility-bills?${params}`),
        apiGet<UtilityAnomaly[]>(
          `/utility-bills/anomalies${filterProperty ? `?propertyId=${filterProperty}` : ""}`,
        ),
      ]);
      setBills(billsData);
      setAnomalies(anomalyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterProperty]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this utility bill?")) return;
    setDeleting(id);
    try {
      await apiDelete(`/utility-bills/${id}`);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const visibleBills = bills.filter((b) => new Date(b.billingDate) >= cutoff);

  // Group by utility type
  const byType: Record<UtilityType, UtilityBill[]> = {
    ELECTRICITY: [],
    WATER: [],
    GAS: [],
    INTERNET: [],
    OTHER: [],
  };
  for (const bill of visibleBills) {
    byType[bill.type].push(bill);
  }

  const anomalyMap = new Map<string, UtilityAnomaly>();
  for (const a of anomalies) {
    anomalyMap.set(`${a.propertyId}::${a.type}`, a);
  }

  const hasAnyAnomalyForType = (type: UtilityType) =>
    anomalies.some((a) => a.type === type);

  const openLog = (type: UtilityType) => {
    setDefaultType(type);
    setLogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="flex-1 sm:flex-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button
          onClick={() => { setDefaultType("ELECTRICITY"); setLogOpen(true); }}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition sm:ml-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Bill
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : visibleBills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No utility bills logged yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Log your first electricity, water, or gas bill</p>
          <button
            onClick={() => setLogOpen(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Log First Bill
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {ALL_UTILITY_TYPES.filter((type) => byType[type].length > 0).map((type) => {
            const typeBills = byType[type];
            const isAnomalous = hasAnyAnomalyForType(type);

            return (
              <div key={type} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{UTILITY_ICONS[type]}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{UTILITY_LABELS[type]}</span>
                    {isAnomalous && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        ↑ High last month
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openLog(type)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition"
                  >
                    + Log Bill
                  </button>
                </div>

                {/* Mobile: card rows */}
                <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {typeBills.map((bill) => {
                    const anomaly = anomalyMap.get(`${bill.propertyId}::${bill.type}`);
                    return (
                      <div key={bill.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            {bill.currency} {bill.amount.toLocaleString()}
                            {anomaly && (
                              <span className="ml-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                                +{anomaly.percentAboveAvg}%
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {bill.property?.name ?? "—"} ·{" "}
                            {new Date(bill.billingDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          {bill.notes && <p className="text-xs text-zinc-400 truncate mt-0.5">{bill.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          disabled={deleting === bill.id}
                          className="shrink-0 rounded p-1.5 text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition disabled:opacity-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Property</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Notes</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {typeBills.map((bill) => {
                      const anomaly = anomalyMap.get(`${bill.propertyId}::${bill.type}`);
                      return (
                        <tr key={bill.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            {new Date(bill.billingDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{bill.property?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {bill.currency} {bill.amount.toLocaleString()}
                            {anomaly && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(+{anomaly.percentAboveAvg}%)</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-zinc-400 max-w-[200px] truncate">{bill.notes ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => handleDelete(bill.id)}
                              disabled={deleting === bill.id}
                              className="rounded p-1 text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition disabled:opacity-50"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <LogUtilityBillModal
        isOpen={logOpen}
        properties={properties}
        onClose={() => setLogOpen(false)}
        onSuccess={() => { setLogOpen(false); loadData(); }}
      />
    </div>
  );
}
