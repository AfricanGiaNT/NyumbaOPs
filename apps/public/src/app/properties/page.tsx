import { fetchPublicProperties } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Available Apartments",
  description: "Browse available short-term apartments in Lilongwe.",
};

export default async function PropertiesPage() {
  const properties = await fetchPublicProperties({ limit: 12 });

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Available Apartments
          </p>
          <h1 className="text-3xl font-semibold">Browse properties</h1>
          <p className="text-[var(--muted)]">
            Verified listings with clear pricing and amenities.
          </p>
        </header>

        {properties.data.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
            We are updating our listings. Check back soon or contact us directly.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {properties.data.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
