"use client";

import { useEffect, useState, useCallback } from "react";
import { apiDelete, apiGet, sendWorkToAnyDo } from "@/lib/api";
import { Property, Work, WorkPriority, WorkStatus } from "@/lib/types";
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
  if (!amount) return null;
  return `${currency ?? "MWK"} ${amount.toLocaleString()}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function isOverdue(work: Work) {
  if (!work.scheduledDate) return false;
  if (work.status === "COMPLETED" || work.status === "CANCELLED") return false;
  return new Date(work.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0));
}

const PRIORITY_ORDER: Record<WorkPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const STATUS_ORDER: Record<WorkStatus, number> = {
  IN_PROGRESS: 0,
  PENDING: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

function sortWorks(works: Work[]) {
  return [...works].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    if (a.scheduledDate && b.scheduledDate)
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    return 0;
  });
}

/** A single work order card */
function WorkCard({
  work,
  onEdit,
  onDelete,
  onSendToAnyDo,
  deleting,
  sending,
}: {
  work: Work;
  onEdit: (w: Work) => void;
  onDelete: (w: Work) => void;
  onSendToAnyDo: (w: Work) => void;
  deleting: boolean;
  sending: boolean;
}) {
  const overdue = isOverdue(work);
  const cost = formatCost(work.actualCost ?? work.estimatedCost, work.currency);
  const date = formatDate(work.scheduledDate);
  const isDone = work.status === "COMPLETED" || work.status === "CANCELLED";

  return (
    <div
      className={`group relative rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm transition-shadow hover:shadow-md ${
        overdue
          ? "border-red-300 dark:border-red-800 border-l-4 border-l-red-500"
          : isDone
          ? "border-zinc-200 dark:border-zinc-800 opacity-70"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Top row: priority + status */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <WorkPriorityBadge priority={work.priority} />
        <WorkStatusBadge status={work.status} />
        {overdue && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            ⚠ Overdue
          </span>
        )}
        {work.sentToAnyDo && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
            title={work.sentToAnyDoAt ? `Sent ${new Date(work.sentToAnyDoAt).toLocaleDateString()}` : "Sent to Any.do"}
          >
            ✓ Any.do
          </span>
        )}
      </div>

      {/* Title */}
      <p className={`font-semibold text-sm leading-snug mb-1 ${isDone ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}>
        {work.title}
      </p>

      {/* Property name (within the location column) */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{work.property?.name}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="capitalize">{formatLabel(work.category)}</span>
        {date && (
          <>
            <span>·</span>
            <span>{date}</span>
          </>
        )}
        {cost && (
          <>
            <span>·</span>
            <span className={work.transactionId ? "text-green-600 dark:text-green-400 font-medium" : ""}>
              {cost}
              {work.transactionId && " ✓"}
            </span>
          </>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSendToAnyDo(work)}
          disabled={sending}
          className="rounded-lg p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700 transition shadow-sm disabled:opacity-50"
          title="Send to Any.do"
        >
          {sending ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onEdit(work)}
          className="rounded-lg p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-sm"
          title="Edit"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {(work.status === "PENDING" || work.status === "CANCELLED") && (
          <button
            onClick={() => onDelete(work)}
            disabled={deleting}
            className="rounded-lg p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition shadow-sm disabled:opacity-50"
            title="Delete"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/** A single location column */
function LocationColumn({
  location,
  locationProperties,
  works,
  showCompleted,
  onNewWork,
  onEdit,
  onDelete,
  onSendToAnyDo,
  deleting,
  sending,
}: {
  location: string;
  locationProperties: Property[];
  works: Work[];
  showCompleted: boolean;
  onNewWork: (location: string, propertyId: string) => void;
  onEdit: (w: Work) => void;
  onDelete: (w: Work) => void;
  onSendToAnyDo: (w: Work) => void;
  deleting: string | null;
  sending: string | null;
}) {
  const visible = showCompleted
    ? works
    : works.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED");

  const sorted = sortWorks(visible);
  const activeCount = works.filter((w) => w.status === "PENDING" || w.status === "IN_PROGRESS").length;
  const overdueCount = works.filter(isOverdue).length;
  const firstPropertyId = locationProperties[0]?.id ?? "";

  return (
    <div className="flex flex-col min-w-[300px] w-[300px] shrink-0">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            {location}
          </h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5">
              {activeCount}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5">
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 p-3 flex flex-col gap-2.5 min-h-[200px]">
        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">All clear!</p>
          </div>
        ) : (
          sorted.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              onEdit={onEdit}
              onDelete={onDelete}
              onSendToAnyDo={onSendToAnyDo}
              deleting={deleting === work.id}
              sending={sending === work.id}
            />
          ))
        )}

        {/* New work order button */}
        <button
          onClick={() => onNewWork(location, firstPropertyId)}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New work order
        </button>
      </div>
    </div>
  );
}

function WorksContent() {
  const [works, setWorks] = useState<Work[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Modal state: which location triggered it
  const [addModal, setAddModal] = useState<{
    open: boolean;
    location: string;
    propertyId: string;
  }>({ open: false, location: "", propertyId: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [worksData, propsData] = await Promise.all([
        apiGet<Work[]>("/works"),
        apiGet<Property[]>("/properties"),
      ]);
      setWorks(worksData);
      setProperties(propsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (work: Work) => {
    if (!confirm(`Delete "${work.title}"? This cannot be undone.`)) return;
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

  const handleSendToAnyDo = async (work: Work) => {
    setSending(work.id);
    try {
      const updated = await sendWorkToAnyDo(work.id);
      setWorks((prev) => prev.map((w) => (w.id === work.id ? updated : w)));
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to send to Any.do:\n\n${msg}`);
    } finally {
      setSending(null);
    }
  };

  // Build columns: one per unique location, derived from properties
  const locationMap = new Map<string, Property[]>();
  properties.forEach((p) => {
    const loc = p.location?.trim() || "Other";
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    locationMap.get(loc)!.push(p);
  });

  // Attach works to their location column
  const worksForLocation = (loc: string) => {
    const props = locationMap.get(loc) ?? [];
    const propIds = new Set(props.map((p) => p.id));
    return works.filter((w) => w.propertyId && propIds.has(w.propertyId));
  };

  const locations = Array.from(locationMap.keys());

  // Global stats
  const totalCount = works.length;
  const activeCount = works.filter((w) => w.status === "PENDING" || w.status === "IN_PROGRESS").length;
  const overdueCount = works.filter(isOverdue).length;
  const completedThisMonth = works.filter((w) => {
    if (w.status !== "COMPLETED" || !w.completedDate) return false;
    const d = new Date(w.completedDate);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Works & Maintenance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track repair and maintenance orders by location</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Toggle completed */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setShowCompleted((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer ${showCompleted ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showCompleted ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Show completed</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
        {[
          { label: "Total Works", value: totalCount, color: "text-zinc-900 dark:text-zinc-100" },
          { label: "Active", value: activeCount, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Overdue", value: overdueCount, color: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100" },
          { label: "Done This Month", value: completedThisMonth, color: "text-green-600 dark:text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className={`mt-0.5 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban board — horizontal scroll */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[300px] w-[300px] shrink-0">
              <div className="h-6 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse mb-3" />
              <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 p-3 space-y-2.5 min-h-[300px]">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No properties found</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Add properties with locations to see the Kanban board</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1">
          {locations.map((loc) => (
            <LocationColumn
              key={loc}
              location={loc}
              locationProperties={locationMap.get(loc) ?? []}
              works={worksForLocation(loc)}
              showCompleted={showCompleted}
              onNewWork={(location, propertyId) =>
                setAddModal({ open: true, location, propertyId })
              }
              onEdit={setEditWork}
              onDelete={handleDelete}
              onSendToAnyDo={handleSendToAnyDo}
              deleting={deleting}
              sending={sending}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddWorkModal
        isOpen={addModal.open}
        onClose={() => setAddModal({ open: false, location: "", propertyId: "" })}
        onSuccess={loadData}
        defaultPropertyId={addModal.propertyId}
        locationFilter={addModal.location !== "Other" ? addModal.location : undefined}
      />
      <EditWorkModal
        work={editWork}
        onClose={() => setEditWork(null)}
        onSuccess={loadData}
      />
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
