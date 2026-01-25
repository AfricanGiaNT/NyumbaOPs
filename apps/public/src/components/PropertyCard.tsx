import Image from "next/image";
import Link from "next/link";
import type { PublicPropertyListItem } from "@/lib/types";

const formatPrice = (amount?: number | null, currency?: string) => {
  if (!amount || !currency) return "Price on request";
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PropertyCard({ property }: { property: PublicPropertyListItem }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--card)]">
        {property.coverImageUrl ? (
          <Image
            src={property.coverImageUrl}
            alt={property.coverImageAlt ?? `${property.name} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            unoptimized={property.coverImageUrl.includes('127.0.0.1') || property.coverImageUrl.includes('localhost')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
            No photo yet
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{property.name}</h3>
        <p className="text-sm text-[var(--muted)]">{property.location ?? "Lilongwe"}</p>
        <p className="text-sm">
          {property.bedrooms} bed • {property.bathrooms} bath • Sleeps {property.maxGuests}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-[var(--accent)]">
          {formatPrice(property.nightlyRate, property.currency)} / night
        </p>
        <Link
          href={`/properties/${property.id}`}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--card)]"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
