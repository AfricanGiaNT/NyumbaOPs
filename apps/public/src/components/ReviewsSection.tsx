import Link from "next/link";
import type { PublicReview } from "@/lib/types";

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${starSize} ${star <= rating ? "text-amber-400" : "text-zinc-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const SUB_RATINGS = [
  { key: "cleanlinessRating" as const, label: "Cleanliness" },
  { key: "locationRating" as const, label: "Location" },
  { key: "valueRating" as const, label: "Value for money" },
  { key: "communicationRating" as const, label: "Communication" },
];

export function ReviewsSection({
  reviews,
  propertyId,
}: {
  reviews: PublicReview[];
  propertyId: string;
}) {
  const overallAvg = avg(reviews.map((r) => r.overallRating));

  return (
    <div className="space-y-6 border-b border-zinc-200 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-zinc-900">Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarDisplay rating={Math.round(overallAvg)} size="md" />
              <span className="text-sm font-semibold text-zinc-900">
                {overallAvg.toFixed(1)}
              </span>
              <span className="text-sm text-zinc-500">
                ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>
        <Link
          href={`/review/${propertyId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Leave a review
        </Link>
      </div>

      {reviews.length === 0 ? (
        <p className="text-zinc-500 text-sm">No reviews yet. Be the first to share your experience!</p>
      ) : (
        <>
          {/* Sub-rating averages */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {SUB_RATINGS.map(({ key, label }) => {
              const subAvg = avg(reviews.map((r) => r[key]));
              return (
                <div key={key}>
                  <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={Math.round(subAvg)} />
                    <span className="text-sm font-semibold text-zinc-900">{subAvg.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Individual reviews */}
          <div className="space-y-6 mt-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 flex-shrink-0">
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{review.reviewerName}</p>
                      <p className="text-xs text-zinc-400">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <StarDisplay rating={review.overallRating} />
                </div>
                {review.comment && (
                  <p className="text-sm text-zinc-700 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
