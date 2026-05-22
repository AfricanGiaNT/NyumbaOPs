"use client";

import { useState } from "react";
import Link from "next/link";
import { submitReview } from "@/lib/api";

function StarRating({
  label,
  value,
  onChange,
  size = "md",
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === "lg" ? "h-9 w-9" : "h-7 w-7";

  const stars = (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${star} star`}
        >
          <svg
            className={`${starSize} transition-colors ${
              star <= (hovered || value) ? "text-amber-400" : "text-zinc-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );

  if (!label) return stars;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-700">{label}</span>
      {stars}
    </div>
  );
}

const SUB_RATINGS = [
  { key: "cleanlinessRating" as const, label: "Cleanliness" },
  { key: "locationRating" as const, label: "Location" },
  { key: "valueRating" as const, label: "Value for money" },
  { key: "communicationRating" as const, label: "Communication" },
];

type FormState = {
  reviewerName: string;
  overallRating: number;
  comment: string;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
};

const emptyForm: FormState = {
  reviewerName: "",
  overallRating: 0,
  comment: "",
  cleanlinessRating: 0,
  locationRating: 0,
  valueRating: 0,
  communicationRating: 0,
};

export function ReviewFormClient({ propertyId }: { propertyId: string; }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.reviewerName.trim().length > 0 && form.overallRating > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitReview(propertyId, {
        reviewerName: form.reviewerName.trim(),
        overallRating: form.overallRating,
        comment: form.comment.trim() || undefined,
        cleanlinessRating: form.cleanlinessRating > 0 ? form.cleanlinessRating : undefined,
        locationRating: form.locationRating > 0 ? form.locationRating : undefined,
        valueRating: form.valueRating > 0 ? form.valueRating : undefined,
        communicationRating: form.communicationRating > 0 ? form.communicationRating : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Thank you for your review!</h2>
        <p className="text-zinc-500 text-sm">
          Your review has been submitted and is pending approval. We appreciate your feedback.
        </p>
        <Link
          href={`/properties/${propertyId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors mt-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to property
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">Share your experience</h2>
        <p className="mt-1 text-sm text-zinc-500">Your review will be visible after approval.</p>
      </div>

      {/* Reviewer name */}
      <div>
        <label
          htmlFor="reviewerName"
          className="block text-sm font-medium text-zinc-700 mb-1.5"
        >
          Your name <span className="text-red-500">*</span>
        </label>
        <input
          id="reviewerName"
          type="text"
          value={form.reviewerName}
          onChange={(e) => setForm((f) => ({ ...f, reviewerName: e.target.value }))}
          placeholder="e.g. Chikondi Phiri"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          required
        />
      </div>

      {/* Overall rating */}
      <div>
        <p className="text-sm font-medium text-zinc-700 mb-3">
          Overall rating <span className="text-red-500">*</span>
        </p>
        <StarRating
          value={form.overallRating}
          onChange={(v) => setForm((f) => ({ ...f, overallRating: v }))}
          size="lg"
        />
      </div>

      {/* Sub-ratings */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">
          Rate the details{" "}
          <span className="text-zinc-400 font-normal">(optional)</span>
        </p>
        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100 px-4 py-1">
          {SUB_RATINGS.map(({ key, label }) => (
            <div key={key} className="py-3">
              <StarRating
                label={label}
                value={form[key]}
                onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Your review{" "}
          <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="comment"
          rows={4}
          maxLength={1500}
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          placeholder="Tell us about your stay..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
        />
        <p className="mt-1 text-xs text-zinc-400 text-right">{form.comment.length}/1500</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
