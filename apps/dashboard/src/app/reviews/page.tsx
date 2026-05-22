"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, triggerPublicRevalidation } from "@/lib/api";
import { Review, ReviewStatus } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

type FilterTab = "ALL" | ReviewStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-4 w-4 ${s <= rating ? "text-amber-400" : "text-zinc-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const styles: Record<ReviewStatus, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  const labels: Record<ReviewStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SUB_RATINGS = [
  { key: "cleanlinessRating" as const, label: "Cleanliness" },
  { key: "locationRating" as const, label: "Location" },
  { key: "valueRating" as const, label: "Value" },
  { key: "communicationRating" as const, label: "Communication" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<{ success: boolean; data: Review[] }>("/reviews");
      setReviews(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filtered =
    activeTab === "ALL" ? reviews : reviews.filter((r) => r.status === activeTab);

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  async function handleApprove(review: Review) {
    setActionLoading(review.id);
    try {
      await apiPatch(`/reviews/${review.id}/status`, { status: "APPROVED" });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status: "APPROVED" } : r)),
      );
      triggerPublicRevalidation(review.propertyId).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve review");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(review: Review) {
    setActionLoading(review.id);
    try {
      await apiPatch(`/reviews/${review.id}/status`, { status: "REJECTED" });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status: "REJECTED" } : r)),
      );
      // Revalidate in case the review was previously approved and showing publicly
      triggerPublicRevalidation(review.propertyId).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject review");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(review: Review) {
    if (!confirm(`Delete this review by ${review.reviewerName}?`)) return;
    setActionLoading(review.id);
    try {
      await apiDelete(`/reviews/${review.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      triggerPublicRevalidation(review.propertyId).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Reviews</h1>
              {pendingCount > 0 && (
                <p className="mt-0.5 text-sm text-amber-600">
                  {pendingCount} {pendingCount === 1 ? "review" : "reviews"} awaiting approval
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
            {TABS.map((tab) => {
              const count =
                tab.value === "ALL"
                  ? reviews.length
                  : reviews.filter((r) => r.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.value
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-sm">
              No {activeTab === "ALL" ? "" : activeTab.toLowerCase() + " "}reviews yet.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((review) => (
                <div
                  key={review.id}
                  className={`rounded-xl border bg-white dark:bg-zinc-900 p-5 ${
                    review.status === "PENDING"
                      ? "border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-400"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: reviewer + property */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {review.reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {review.reviewerName}
                        </span>
                        <ReviewStatusBadge status={review.status} />
                      </div>
                      {review.property && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-10">
                          {review.property.name}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 ml-10">{formatDate(review.createdAt)}</p>
                    </div>

                    {/* Right: overall rating */}
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={review.overallRating} />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {review.overallRating}/5
                      </span>
                    </div>
                  </div>

                  {/* Sub-ratings — only render rows that have data */}
                  {SUB_RATINGS.some(({ key }) => review[key] !== null) && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4 ml-10">
                      {SUB_RATINGS.map(({ key, label }) => {
                        const val = review[key];
                        if (val === null) return null;
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-400 w-24 flex-shrink-0">{label}</span>
                            <StarDisplay rating={val} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 ml-10 leading-relaxed">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 ml-10 flex flex-wrap gap-2">
                    {review.status !== "APPROVED" && (
                      <button
                        onClick={() => handleApprove(review)}
                        disabled={actionLoading === review.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === review.id ? "…" : "Approve"}
                      </button>
                    )}
                    {review.status !== "REJECTED" && (
                      <button
                        onClick={() => handleReject(review)}
                        disabled={actionLoading === review.id}
                        className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === review.id ? "…" : "Reject"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review)}
                      disabled={actionLoading === review.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
