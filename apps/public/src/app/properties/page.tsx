import { fetchPublicProperties } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Available Apartments",
  description: "Browse available short-term apartments in Lilongwe.",
};

export default async function PropertiesPage() {
  const properties = await fetchPublicProperties({ limit: 12 }).catch(() => ({
    success: false,
    data: [],
    meta: { total: 0, limit: 12, offset: 0 },
  }));

  return (
    <main className="bg-gradient-to-b from-white via-zinc-50 to-white">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">

        {/* ── 1. Compact header ─────────────────────────────────── */}
        <header className="mb-10 space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-1.5">
            <svg className="h-4 w-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
            </svg>
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
              Available Apartments
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Find Your Perfect Stay
          </h1>
          <p className="mx-auto max-w-xl text-base text-zinc-500">
            Verified short-term apartments in Lilongwe with transparent pricing.
          </p>
        </header>

        {/* ── 2. Property grid ──────────────────────────────────── */}
        {properties.data.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <svg className="mx-auto h-16 w-16 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">No properties available</h3>
            <p className="mt-2 text-sm text-zinc-600">
              We are updating our listings. Check back soon or contact us directly for availability.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {properties.data.map((property, idx) => (
              <PropertyCard key={property.id} property={property} priority={idx === 0} />
            ))}
          </div>
        )}

        {/* ── 3. Trust signals (below grid — secondary content) ── */}
        {properties.data.length > 0 && (
          <div className="mt-14 border-t border-zinc-100 pt-10">
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Why book with us
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-zinc-700">Verified listings</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-zinc-700">Clear pricing</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                <span className="text-sm font-medium text-zinc-700">24h response</span>
              </div>
            </div>
          </div>
        )}

      </section>

      <Footer />
    </main>
  );
}
