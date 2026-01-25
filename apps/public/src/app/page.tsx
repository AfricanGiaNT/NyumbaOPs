import Link from "next/link";
import { fetchPublicProperties } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { TrustSection } from "@/components/TrustSection";
import { Footer } from "@/components/Footer";

export default async function HomePage() {
  const featured = await fetchPublicProperties({ featured: true });

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Nyumba Stays
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Comfortable stays in Lilongwe
          </h1>
          <p className="max-w-2xl text-[var(--muted)]">
            Browse verified apartments with transparent pricing and local support.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-[var(--muted)]">Find a place</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              placeholder="Select area (coming soon)"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]"
              disabled
            />
            <input
              placeholder="Select dates (coming soon)"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]"
              disabled
            />
            <Link
              href="/properties"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
            >
              View properties
            </Link>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Featured properties</h2>
            <Link href="/properties" className="text-sm font-semibold text-[var(--accent)]">
              View all
            </Link>
          </div>
          {featured.data.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
              No apartments available right now. Check back soon or contact us directly.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {featured.data.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <TrustSection />
        </section>

        <section className="mt-10 rounded-2xl border border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)] shadow-sm">
          <p className="font-semibold text-[var(--foreground)]">Need help?</p>
          <p>WhatsApp us for quick answers and bookings.</p>
          <a
            className="mt-3 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            href="https://wa.me/265000000000?text=Hi%2C%20I%27m%20interested%20in%20booking%20an%20apartment."
          >
            WhatsApp us
          </a>
        </section>
      </section>

      <Footer />
    </main>
  );
}
