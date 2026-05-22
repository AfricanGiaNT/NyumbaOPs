import Image from "next/image";
import Link from "next/link";
import type { PublicPropertyListItem } from "@/lib/types";
import { transformImageUrl, BLUR_DATA_URL } from "@/lib/image-utils";

const formatPrice = (amount?: number | null, currency?: string) => {
  if (!amount || !currency) return "Price on request";
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PropertyCard({
  property,
  priority = false,
}: {
  property: PublicPropertyListItem;
  priority?: boolean;
}) {
  return (
    <Link href={`/properties/${property.id}`}>
      <article className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">

        {/* ── 1. Image + price overlay ─────────────────────────── */}
        <div className="relative aspect-[4/3] w-full overflow-hidden skeleton">
          {property.coverImageUrl ? (
            <Image
              fill
              src={transformImageUrl(property.coverImageUrl)}
              alt={property.coverImageAlt ?? `${property.name} preview`}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              priority={priority}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Price badge */}
          <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-lg font-bold text-[var(--accent)]">
              {formatPrice(property.nightlyRate, property.currency)}
            </p>
            <p className="text-xs text-zinc-600">per night</p>
          </div>
        </div>

        {/* ── 2. Content ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3 p-6">

          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-bold text-zinc-900 group-hover:text-[var(--accent)] transition-colors leading-snug">
              {property.name}
            </h3>
            {property.reviewCount > 0 && property.averageRating != null && (
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-semibold text-zinc-800">{property.averageRating.toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({property.reviewCount})</span>
              </div>
            )}
          </div>

          {/* ── HIGH VALUE: capacity ─────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-5 text-sm text-zinc-700">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🛏️</span>
              <span className="font-semibold">{property.bedrooms}</span>
              <span className="text-zinc-500">{property.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🚿</span>
              <span className="font-semibold">{property.bathrooms}</span>
              <span className="text-zinc-500">{property.bathrooms === 1 ? "bathroom" : "bathrooms"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">👥</span>
              <span className="font-semibold">{property.maxGuests}</span>
              <span className="text-zinc-500">{property.maxGuests === 1 ? "guest" : "guests"}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* ── SECONDARY: location + map ────────────────────── */}
          <div className="flex items-center justify-between text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">{property.location ?? "Lilongwe"}</p>
            </div>

            {(property.latitude != null && property.longitude != null || property.googleMapsUrl) && (
              <span
                role="link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = property.googleMapsUrl
                    ?? `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </span>
            )}
          </div>

          {/* ── CTA ─────────────────────────────────────────── */}
          <div className="mt-1 flex min-h-[44px] items-center justify-center rounded-xl bg-[#FF8F35] py-3 text-center text-sm font-semibold text-white transition-opacity group-hover:opacity-90">
            View details →
          </div>
        </div>
      </article>
    </Link>
  );
}
