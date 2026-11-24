"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import type { Reservation } from "@/lib/types";

type Filter =
  | "ALL"
  | "PENDING_REVIEW"
  | "AWAITING_CONFIRMATION"
  | "QUEUED"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "LEGACY";
const labels: Record<Filter, string> = {
  ALL: "All",
  PENDING_REVIEW: "Awaiting review",
  AWAITING_CONFIRMATION: "Accepted, follow-up",
  QUEUED: "Queued",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  LEGACY: "Legacy inquiries",
};
const legacy = new Set(["NEW", "CONTACTED", "CONVERTED"]);
const badgeColor: Record<string, string> = {
  CONFIRMED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  EXPIRED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  QUEUED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  AWAITING_CONFIRMATION:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

function displayStatus(item: Reservation): string {
  if (item.status === "NEW" || item.status === "CONTACTED")
    return "Legacy inquiry, needs review";
  if (item.status === "CONVERTED") {
    if (
      item.booking?.status === "CONFIRMED" ||
      item.booking?.status === "CHECKED_IN" ||
      item.booking?.status === "COMPLETED"
    )
      return "Confirmed (legacy)";
    if (item.booking?.status === "CANCELLED") return "Cancelled (legacy)";
    return "Legacy follow-up";
  }
  return labels[item.status as Filter] ?? item.status;
}

export default function ReservationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const result = await apiGet<{ success: boolean; data: Reservation[] }>(
      "/reservations",
    );
    setItems(result.data ?? []);
  };

  useEffect(() => {
    setSelectedId(new URLSearchParams(window.location.search).get("selected"));
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId && !loading)
      document.getElementById(selectedId)?.scrollIntoView({ block: "center" });
  }, [selectedId, loading]);

  const filtered = useMemo(() => {
    const priority: Record<string, number> = {
      PENDING_REVIEW: 0,
      NEW: 0,
      CONTACTED: 0,
      AWAITING_CONFIRMATION: 1,
      QUEUED: 2,
    };
    return items
      .filter(
        (item) =>
          filter === "ALL" ||
          (filter === "LEGACY"
            ? legacy.has(item.status)
            : item.status === filter),
      )
      .sort(
        (a, b) =>
          (priority[a.status] ?? 3) - (priority[b.status] ?? 3) ||
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
  }, [items, filter]);
  const needsReview = items.filter(
    (item) => item.status === "PENDING_REVIEW",
  ).length;

  const act = async (
    item: Reservation,
    action: "start-review" | "accept" | "reject" | "confirm" | "cancel",
  ) => {
    if (
      ["reject", "confirm", "cancel"].includes(action) &&
      !window.confirm(
        `Are you sure you want to ${action.replace("-", " ")} this reservation for ${item.guestName}?`,
      )
    )
      return;
    setWorkingId(item.id);
    setError(null);
    setSuccess(null);
    try {
      await apiPost(
        `/reservations/${encodeURIComponent(item.id)}/${action}`,
        {},
      );
      setSuccess(
        {
          "start-review":
            "Review started; the request is held or queued according to availability.",
          accept:
            "Accepted for follow-up. The reservation is not yet confirmed.",
          reject: "Request rejected. Any temporary hold has been released.",
          confirm: "Reservation confirmed.",
          cancel: "Reservation cancelled and its dates released.",
        }[action],
      );
      try {
        await load();
      } catch (err) {
        setError(
          `Decision saved, but the list could not refresh: ${(err as Error).message}`,
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Reservations
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Review requests from the public site. {needsReview} awaiting
                review.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                load().catch((err: Error) => setError(err.message))
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Refresh
            </button>
          </header>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter reservations"
          >
            {(Object.keys(labels) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-full border px-3 py-1.5 text-sm ${filter === key ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}
              >
                {labels[key]}
                {key === "PENDING_REVIEW" ? ` (${needsReview})` : ""}
              </button>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {success}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-zinc-500">Loading reservations…</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              No reservations in this view.
            </p>
          ) : (
            <section className="space-y-3">
              {filtered.map((item) => {
                const expired =
                  item.booking?.holdExpiresAt &&
                  new Date(item.booking.holdExpiresAt) <= new Date();
                const owner = user?.role === "OWNER";
                return (
                  <article
                    key={item.id}
                    id={item.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900 ${selectedId === item.id ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 dark:border-zinc-800"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.guestName}
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.property?.name ?? item.propertyId} ·{" "}
                          {item.numberOfGuests} guest
                          {item.numberOfGuests === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor[item.status] ?? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"}`}
                      >
                        {displayStatus(item)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {new Date(item.checkInDate).toLocaleDateString("en-GB")} →{" "}
                      {new Date(item.checkOutDate).toLocaleDateString("en-GB")}
                    </p>
                    {(item.status === "PENDING_REVIEW" ||
                      item.status === "AWAITING_CONFIRMATION") &&
                      item.booking?.holdExpiresAt && (
                        <p className="mt-1 text-xs text-amber-700">
                          Hold {expired ? "expired" : "expires"}:{" "}
                          {new Date(item.booking.holdExpiresAt).toLocaleString(
                            "en-GB",
                          )}
                          . This stay is not yet confirmed.
                        </p>
                      )}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {item.guestEmail && (
                        <a
                          className="text-indigo-700 underline"
                          href={`mailto:${item.guestEmail}`}
                        >
                          {item.guestEmail}
                        </a>
                      )}
                      <a
                        className="text-indigo-700 underline"
                        href={`tel:${item.guestPhone}`}
                      >
                        {item.guestPhone}
                      </a>
                    </div>
                    {item.message && (
                      <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.message}
                      </p>
                    )}
                    {owner && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(item.status === "NEW" ||
                          item.status === "CONTACTED") && (
                          <button
                            disabled={workingId === item.id}
                            onClick={() => act(item, "start-review")}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Start review
                          </button>
                        )}
                        {item.status === "PENDING_REVIEW" && (
                          <button
                            disabled={workingId === item.id || !!expired}
                            onClick={() => act(item, "accept")}
                            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Accept for follow-up
                          </button>
                        )}
                        {item.status === "AWAITING_CONFIRMATION" && (
                          <button
                            disabled={workingId === item.id || !!expired}
                            onClick={() => act(item, "confirm")}
                            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Confirm reservation
                          </button>
                        )}
                        {[
                          "PENDING_REVIEW",
                          "AWAITING_CONFIRMATION",
                          "QUEUED",
                        ].includes(item.status) && (
                          <button
                            disabled={workingId === item.id}
                            onClick={() => act(item, "reject")}
                            className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        {item.status === "CONFIRMED" && (
                          <button
                            disabled={workingId === item.id}
                            onClick={() => act(item, "cancel")}
                            className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
