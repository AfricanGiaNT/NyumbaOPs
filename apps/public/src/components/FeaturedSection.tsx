"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/PropertyCard";
import type { PublicPropertyListItem } from "@/lib/types";

const LOCATIONS = ["Lilongwe", "Monkey Bay", "Mzuzu"];

const pillActive = "rounded-full px-4 py-1.5 text-sm font-semibold bg-[var(--accent)] text-white transition-colors";
const pillInactive = "rounded-full px-4 py-1.5 text-sm font-semibold border border-zinc-300 text-zinc-600 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors";

interface Props {
  properties: PublicPropertyListItem[];
}

export function FeaturedSection({ properties }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const displayed = selectedLocation
    ? properties.filter((p) =>
        p.location?.toLowerCase().includes(selectedLocation.toLowerCase()),
      )
    : properties;

  return (
    <section>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl lg:text-3xl">
          Featured properties
        </h2>
        <Link
          href="/properties"
          className="ml-3 flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          View all
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Location filter pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLocation(null)}
          className={selectedLocation === null ? pillActive : pillInactive}
        >
          All
        </button>
        {LOCATIONS.map((loc) => (
          <button
            key={loc}
            onClick={() => setSelectedLocation(selectedLocation === loc ? null : loc)}
            className={selectedLocation === loc ? pillActive : pillInactive}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Property grid or empty state */}
      {displayed.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            {selectedLocation
              ? `No featured properties in ${selectedLocation} yet.`
              : "No apartments available right now. Check back soon."}
          </p>
          {!selectedLocation && (
            <a
              href="https://wa.me/265000000000?text=Hi%2C%20I%27m%20interested%20in%20booking%20an%20apartment."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-full bg-[#FF8F35] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Contact us directly
            </a>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {displayed.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-8 text-center">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--accent)] px-8 py-3 text-sm font-bold text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white active:scale-95"
        >
          View all available apartments
        </Link>
      </div>
    </section>
  );
}
