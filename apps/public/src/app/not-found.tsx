import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-12">
        <h1 className="text-3xl font-semibold">Property not available</h1>
        <p className="mt-2 text-[var(--muted)]">
          This apartment may have been removed or is no longer listed.
        </p>
        <Link
          href="/properties"
          className="mt-6 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
        >
          View other properties
        </Link>
      </section>

      <Footer />
    </main>
  );
}
