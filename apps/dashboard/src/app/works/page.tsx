"use client";

import { useEffect, useState, useCallback } from "react";
import { apiDelete, apiGet } from "@/lib/api";
import { Property, Work, WorkCategory, WorkPriority, WorkStatus } from "@/lib/types";
import { WorkStatusBadge } from "@/components/works/WorkStatusBadge";
import { WorkPriorityBadge } from "@/components/works/WorkPriorityBadge";
import { AddWorkModal } from "@/components/works/AddWorkModal";
import { EditWorkModal } from "@/components/works/EditWorkModal";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatCost(amount?: number | null, currency?: string) {
  if (!amount) return "—";
  return `${currency ?? "MWK"} ${amount.toLocaleString()}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(work: Work) {
  if (!work.scheduledDate) return false;
  if (work.status === "COMPLETED" || work.status === "CANCELLED") return false;
  return new Date(work.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0));
}

function WorksContent() {
  const [works, setWorks] = useState<Work[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [filterProperty, setFilterProperty] = useState("");
  const [filterStatus, setFilterStatus] = useState<WorkStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<WorkPriority | "">("");
  const [filterCategory, setFilterCategory] = useState<WorkCategory | "">("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProperty) params.set("propertyId", filterProperty);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterCategory) params.set("category", filterCategory);

      const [worksData, propsData] = await Promise.all([
        apiGet<Work[]>(`/works?${params}`),
        apiGet<Property[]>("/properties"),
      ]);
      setWorks(worksData);
      setProperties(propsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (work: Work) => {
    if (!confirm(`Delete work order "${work.title}"? This cannot be undone.`)) return;
    setDeleting(work.id);
    try {
      await apiDelete(`/works/${work.id}`);
      setWorks((prev) => prev.filter((w) => w.id !== work.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete work order");
    } finally {
      setDeleting(null);
    }
  };

  const now = new Date(new Date().setHours(0, 0, 0, 0));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const totalCount = works.length;
  const activeCount = works.filter((w) => w.status === "PENDING" || w.status === "IN_PROGRESS").length;
  const overdueCount = works.filter(isOverdue).length;
  const completedThisMonth = works.filter((w) => {
    if (w.status !== "COMPLETED" || !w.completedDate) return false;
    const d = new Date(w.completedDate);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  // Group by property location for display
  const grouped: Record<string, Work[]> = {};
  works.forEach((w) => {
    const key = w.property?.location
      ? `${w.property.location} — ${w.property.name}`
      : w.property?.name ?? "Unknown Property";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Works & Maintenance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track repair and maintenance orders across all properties</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Works", value: totalCount, color: "text-zinc-900 dark:text-zinc-100" },
          { label: "Active", value: activeCount, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Overdue", value: overdueCount, color: "text-red-600 dark:text-red-400" },
          { label: "Completed This Month", value: completedThisMonth, color: "text-green-600 dark:text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as WorkStatus | "")}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as WorkStatus[]).map((s) => (
            <option key={s} value={s}>{formatLabel(s)}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as WorkPriority | "")}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {(["URGENT", "HIGH", "MEDIUM", "LOW"] as WorkPriority[]).map((p) => (
            <option key={p} value={p}>{formatLabel(p)}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as WorkCategory | "")}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {(["PLUMBING", "ELECTRICAL", "PAINTING", "CLEANING", "CARPENTRY", "APPLIANCE", "HVAC", "LANDSCAPING", "GENERAL", "OTHER"] as WorkCategory[]).map((c) => (
            <option key={c} value={c}>{formatLabel(c)}</option>
          ))}
        </select>

        {(filterProperty || filterStatus || filterPriority || filterCategory) && (
          <button
            onClick={() => { setFilterProperty(""); setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); }}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Works list — grouped by property */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : works.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No work orders found</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Create your first work order to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, groupWorks]) => (
            <div key={groupKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {groupKey}
              </h3>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Scheduled</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Est. Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Actual Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupWorks.map((work) => {
                      const overdue = isOverdue(work);
                      return (
                        <tr
                          key={work.id}
                          className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                            overdue ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{work.title}</div>
                            {overdue && (
                              <span className="text-xs text-red-500 font-medium">⚠ Overdue</span>
                            )}
                            {work.description && (
                              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{work.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatLabel(work.category)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <WorkPriorityBadge priority={work.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <WorkStatusBadge status={work.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                            {formatDate(work.scheduledDate)}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                            {formatCost(work.estimatedCost, work.currency)}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {work.actualCost ? (
                              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                {formatCost(work.actualCost, work.currency)}
                                {work.transactionId && (
                                  <span className="ml-1 text-green-500" title="Expense auto-recorded">✓</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditWork(work)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                title="Edit"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {(work.status === "PENDING" || work.status === "CANCELLED") && (
                                <button
                                  onClick={() => handleDelete(work)}
                                  disabled={deleting === work.id}
                                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                                  title="Delete"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
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

      <AddWorkModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSuccess={loadData} />
      <EditWorkModal work={editWork} onClose={() => setEditWork(null)} onSuccess={loadData} />
    </div>
  );
}

export default function WorksPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <WorksContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
