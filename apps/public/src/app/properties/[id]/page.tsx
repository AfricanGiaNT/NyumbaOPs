import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchPublicProperty } from "@/lib/api";
import { AmenitiesList } from "@/components/AmenitiesList";
import { PropertyGallery } from "@/components/PropertyGallery";
import { Footer } from "@/components/Footer";
import { HostSection } from "@/components/HostSection";
import { LocationSection } from "@/components/LocationSection";
import { PropertyBookingClient } from "@/components/PropertyBookingClient";

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

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetchPublicProperty(id);
    const p = res.data;
    return {
      title: p.name,
      description: p.description ?? `${p.bedrooms}-bedroom property in ${p.location ?? "Lilongwe, Malawi"}`,
    };
  } catch {
    return { title: "Property" };
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;

  let property: Awaited<ReturnType<typeof fetchPublicProperty>>["data"];
  try {
    const res = await fetchPublicProperty(id);
    property = res.data;
  } catch {
    notFound();
  }

  return (
    <>
      <main className="bg-white pb-32" style={{ scrollBehavior: "smooth" }}>
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:grid-cols-[1fr_380px] lg:gap-8">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 transition-all hover:gap-3 active:scale-95"
          >
            <svg className="h-4 w-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to properties
          </Link>

          <div className="mt-8 space-y-8">
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
                  description: property.description ?? "Clean, fully furnished apartment suitable for families and business stays.",
                }),
              }}
            />

            <PropertyGallery images={property.images} title={property.name} />

            {/* Property Header */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
                {property.name}
              </h1>
            </div>

            {/* Property Type + Stats */}
            <div className="space-y-2 border-b border-zinc-200 pb-4">
              <p className="text-base text-zinc-700">
                Entire rental unit in {property.location ?? "Lilongwe, Malawi"}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-700">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property.maxGuests} guests
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">🛏️</span>
                  {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">🛏️</span>
                  {property.beds ?? property.bedrooms} {(property.beds ?? property.bedrooms) === 1 ? "bed" : "beds"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">🚿</span>
                  {property.bathrooms} {property.bathrooms === 1 ? "bathroom" : "bathrooms"}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4 border-b border-zinc-200 py-8">
              <h2 className="text-2xl font-bold text-zinc-900">About this place</h2>
              <p className="text-base leading-relaxed text-zinc-700">
                {property.description ?? "Enjoy a stylish experience at this centrally-located space fitted fully fitted with all amenities, air conditioning, and WIFI."}
              </p>
              {property.spaceDescription && (
                <p className="text-base leading-relaxed text-zinc-700">{property.spaceDescription}</p>
              )}
            </div>

            {/* Amenities */}
            <div className="space-y-4 border-b border-zinc-200 py-4">
              <h2 className="text-2xl font-bold text-zinc-900">What this place offers</h2>
              <AmenitiesList amenities={property.amenities} />
            </div>

            {/* Location */}
            <LocationSection
              location={property.location ?? "Lilongwe, Central Region, Malawi"}
              latitude={property.latitude}
              longitude={property.longitude}
              googleMapsUrl={property.googleMapsUrl}
            />

            {/* House Rules */}
            {(property.checkInTime || property.checkOutTime || property.cancellationPolicy || property.additionalRules) && (
              <div className="space-y-4 border-b border-zinc-200 py-8">
                <h2 className="text-2xl font-bold text-zinc-900">House rules</h2>
                <dl className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                  {property.checkInTime && (
                    <div>
                      <dt className="font-semibold text-zinc-900">Check-in</dt>
                      <dd>{property.checkInTime}</dd>
                    </div>
                  )}
                  {property.checkOutTime && (
                    <div>
                      <dt className="font-semibold text-zinc-900">Check-out</dt>
                      <dd>{property.checkOutTime}</dd>
                    </div>
                  )}
                  {property.smokingAllowed !== undefined && (
                    <div>
                      <dt className="font-semibold text-zinc-900">Smoking</dt>
                      <dd>{property.smokingAllowed ? "Allowed" : "Not allowed"}</dd>
                    </div>
                  )}
                  {property.petsAllowed !== undefined && (
                    <div>
                      <dt className="font-semibold text-zinc-900">Pets</dt>
                      <dd>{property.petsAllowed ? "Allowed" : "Not allowed"}</dd>
                    </div>
                  )}
                  {property.cancellationPolicy && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-zinc-900">Cancellation policy</dt>
                      <dd>{property.cancellationPolicy}</dd>
                    </div>
                  )}
                  {property.additionalRules && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-zinc-900">Additional rules</dt>
                      <dd>{property.additionalRules}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Host Section */}
            <HostSection />

            {/* Booking card (mobile + desktop) and availability modal */}
            <PropertyBookingClient
              propertyId={property.id}
              propertyName={property.name}
              nightlyRate={property.nightlyRate}
              currency={property.currency}
            />
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
