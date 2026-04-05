import Link from "next/link";
import { fetchPublicProperties } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { Footer } from "@/components/Footer";

export const revalidate = 300;

const trustItems = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Verified Properties",
    description: "Every apartment personally inspected before listing.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    title: "Secure & Clean",
    description: "Professional cleaning between every guest.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    title: "Local Support",
    description: "Based in Lilongwe — help is a WhatsApp away.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "Fair Prices",
    description: "No hidden fees. What you see is what you pay.",
    color: "text-amber-600 bg-amber-50",
  },
];

export default async function HomePage() {
  const featured = await fetchPublicProperties({ featured: true }).catch(() => ({
    success: false,
    data: [],
    meta: { total: 0, limit: 6, offset: 0 },
  }));

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--accent)] via-teal-700 to-emerald-800 px-4 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
            Lilongwe, Malawi
          </span>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Your home away<br className="hidden sm:block" /> from home
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg">
            Verified short-term apartments in Lilongwe with transparent pricing, modern amenities, and local support.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/properties"
              className="w-full rounded-full bg-white px-8 py-4 text-center text-base font-bold text-[var(--accent)] shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 sm:w-auto"
            >
              Browse all properties
            </Link>
            <a
              href="https://wa.me/265000000000?text=Hi%2C%20I%27m%20interested%20in%20booking%20an%20apartment."
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/50 px-8 py-4 text-base font-semibold text-white transition-all hover:border-white hover:bg-white/10 active:scale-95 sm:w-auto"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp us
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12">
        {/* Featured properties */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Featured properties</h2>
            <Link
              href="/properties"
              className="flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {featured.data.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-sm text-[var(--muted)]">No apartments available right now. Check back soon.</p>
              <a
                href="https://wa.me/265000000000?text=Hi%2C%20I%27m%20interested%20in%20booking%20an%20apartment."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white"
              >
                Contact us directly
              </a>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {featured.data.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--accent)] px-8 py-3 text-sm font-bold text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white active:scale-95"
            >
              View all available apartments
            </Link>
          </div>
        </section>

        {/* Trust section */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">Why book with us?</h2>
          <p className="mt-2 text-center text-sm text-zinc-500">Everything you need for a comfortable stay</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WhatsApp CTA strip */}
        <section className="mt-16 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-8 text-center border border-emerald-100">
          <h3 className="text-xl font-bold text-zinc-900">Have questions?</h3>
          <p className="mt-2 text-sm text-zinc-600">
            WhatsApp us for quick answers, availability, and local recommendations.
          </p>
          <a
            href="https://wa.me/265000000000?text=Hi%2C%20I%27m%20interested%20in%20booking%20an%20apartment."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-lg active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat on WhatsApp
          </a>
        </section>
      </div>

      <Footer />
    </main>
  );
}
