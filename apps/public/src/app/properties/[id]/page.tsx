import Link from "next/link";
import type { Metadata } from "next";
import { fetchPublicProperty } from "@/lib/api";
import { AmenitiesList } from "@/components/AmenitiesList";
import { PropertyGallery } from "@/components/PropertyGallery";
import { Footer } from "@/components/Footer";
import { InquiryForm } from "@/components/InquiryForm";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

const formatPrice = (amount?: number | null, currency?: string) => {
  if (!amount || !currency) return "Price on request";
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const propertyResponse = await fetchPublicProperty(id);
  const property = propertyResponse.data;

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12">
        <Link href="/properties" className="text-sm font-semibold text-[var(--accent)]">
          ← Back to properties
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "LodgingBusiness",
                  name: property.name,
                  address: property.location ?? "Lilongwe, Malawi",
                  priceRange: formatPrice(property.nightlyRate, property.currency),
                  image: property.images.map((image) => image.url),
                  description:
                    "Clean, fully furnished apartment suitable for families and business stays.",
                }),
              }}
            />
            <PropertyGallery images={property.images} title={property.name} />
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold">{property.name}</h1>
              <p className="text-[var(--muted)]">{property.location ?? "Lilongwe"}</p>
              <p className="text-sm">
                {property.bedrooms} bedrooms • {property.bathrooms} bathrooms • Sleeps{" "}
                {property.maxGuests}
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Amenities</h2>
              <AmenitiesList amenities={property.amenities} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="text-sm text-[var(--muted)]">
                Clean, fully furnished apartment suitable for families and business stays.
                Quiet neighborhood with easy access to main roads.
              </p>
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-[var(--muted)]">Nightly rate</p>
            <p className="text-2xl font-semibold text-[var(--accent)]">
              {formatPrice(property.nightlyRate, property.currency)}
            </p>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Send an inquiry</p>
              <InquiryForm propertyId={property.id} propertyName={property.name} />
            </div>
            <div className="space-y-2">
              <a
                className="block rounded-full border border-[var(--border)] px-4 py-3 text-center text-sm font-semibold"
                href={`https://wa.me/265000000000?text=${encodeURIComponent(
                  `Hi, I'm interested in ${property.name}. Is it available?`,
                )}`}
              >
                Prefer WhatsApp instead?
              </a>
            </div>
            <p className="text-xs text-[var(--muted)]">Usually responds within 24 hours.</p>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const propertyResponse = await fetchPublicProperty(id);
    const property = propertyResponse.data;
    return {
      title: property.name,
      description: `${property.name} in ${property.location ?? "Lilongwe"}. Sleeps ${
        property.maxGuests
      }, from ${formatPrice(property.nightlyRate, property.currency)}.`,
      openGraph: {
        title: property.name,
        description: `${property.name} in ${property.location ?? "Lilongwe"}.`,
        images: property.images.slice(0, 1).map((image) => ({
          url: image.url,
        })),
      },
    };
  } catch {
    return {
      title: "Property",
      description: "View property details.",
    };
  }
}
