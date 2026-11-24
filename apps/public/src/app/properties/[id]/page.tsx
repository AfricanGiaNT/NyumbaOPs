import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchPublicProperty, fetchApprovedReviews } from "@/lib/api";
import { AmenitiesList } from "@/components/AmenitiesList";
import { PropertyGallery } from "@/components/PropertyGallery";
import { Footer } from "@/components/Footer";
import { HostSection } from "@/components/HostSection";
import { LocationSection } from "@/components/LocationSection";
import { PropertyBookingClient } from "@/components/PropertyBookingClient";
import { ReviewsSection } from "@/components/ReviewsSection";
import { InquiryForm } from '@/components/InquiryForm';
import { Badge } from "@/components/dashboard-app/ui/badge";
import { Card } from "@/components/dashboard-app/ui/card";

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
    const description =
      p.description ?? `${p.bedrooms}-bedroom property in ${p.location ?? "Lilongwe, Malawi"}`;
    const coverImage =
      p.images.find((image) => image.isCover)?.url ?? p.images[0]?.url;
    const url = `/properties/${id}`;

    return {
      title: p.name,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        title: p.name,
        description,
        url,
        siteName: "Madikwe Apartments",
        images: coverImage ? [{ url: coverImage, alt: p.name }] : undefined,
      },
      twitter: {
        card: coverImage ? "summary_large_image" : "summary",
        title: p.name,
        description,
        images: coverImage ? [coverImage] : undefined,
      },
    };
  } catch {
    return { title: "Property" };
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;

  let property: Awaited<ReturnType<typeof fetchPublicProperty>>["data"];
  let reviews: Awaited<ReturnType<typeof fetchApprovedReviews>>["data"] = [];
  try {
    const [res, reviewsRes] = await Promise.all([
      fetchPublicProperty(id),
      fetchApprovedReviews(id).catch(() => ({ success: true, data: [] as typeof reviews })),
    ]);
    property = res.data;
    reviews = reviewsRes.data;
  } catch {
    notFound();
  }

  const overallAvg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
    : 0;

  return (
    <>
      <main className="bg-white pb-20">
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <svg className="h-4 w-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to properties
          </Link>

          <div className="mt-5 space-y-6">
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

            <header className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                {property.name}
              </h1>
              <p className="text-sm text-zinc-600">
                Entire rental unit in {property.location ?? "Lilongwe, Malawi"}
              </p>
              {reviews.length > 0 ? (
                <a
                  href="#reviews"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
                >
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`h-4 w-4 ${s <= Math.round(overallAvg) ? "text-amber-400" : "text-zinc-300"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold">{overallAvg.toFixed(1)}</span>
                  <span className="text-zinc-500">
                    · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                </a>
              ) : (
                <a
                  href="#reviews"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  No reviews yet — be the first
                </a>
              )}
            </header>

            <PropertyGallery images={property.images} title={property.name} />

            <div className="grid items-start gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
              <div className="min-w-0 space-y-0">

            <section className="border-b border-zinc-200 pb-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-700">
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property.maxGuests} guests
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {property.beds ?? property.bedrooms} {(property.beds ?? property.bedrooms) === 1 ? "bed" : "beds"}
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {property.bathrooms} {property.bathrooms === 1 ? "bathroom" : "bathrooms"}
                </Badge>
              </div>
            </section>

            {/* Description */}
            <section className="space-y-3 border-b border-zinc-200 py-6">
              <h2 className="text-lg font-semibold text-zinc-900">About this place</h2>
              <p className="text-sm leading-6 text-zinc-700">
                {property.description ?? "Enjoy a stylish experience at this centrally-located space fitted fully fitted with all amenities, air conditioning, and WIFI."}
              </p>
              {property.spaceDescription && (
                <p className="text-sm leading-6 text-zinc-700">{property.spaceDescription}</p>
              )}
            </section>

            {/* Amenities */}
            <section className="space-y-4 border-b border-zinc-200 py-6">
              <h2 className="text-lg font-semibold text-zinc-900">What this place offers</h2>
              <AmenitiesList amenities={property.amenities} />
            </section>

            {/* Location */}
            <LocationSection
              location={property.location ?? "Lilongwe, Central Region, Malawi"}
              latitude={property.latitude}
              longitude={property.longitude}
              googleMapsUrl={property.googleMapsUrl}
            />

            {/* House Rules */}
            {(property.checkInTime || property.checkOutTime || property.cancellationPolicy || property.additionalRules) && (
              <section className="space-y-4 border-b border-zinc-200 py-6">
                <h2 className="text-lg font-semibold text-zinc-900">House rules</h2>
                <dl className="grid gap-x-6 gap-y-3 text-sm text-zinc-700 sm:grid-cols-2">
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
              </section>
            )}

            {/* Reviews */}
            <ReviewsSection reviews={reviews} propertyId={property.id} />

            {/* Host Section */}
            <HostSection />

            <section id="inquiry" className="scroll-mt-24 pt-6">
              <Card className="rounded-xl border-zinc-200 bg-zinc-50/60">
                <div className="p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-zinc-900">Request these dates</h2>
                  <p className="mb-5 mt-1 text-sm leading-5 text-zinc-600">Send your details to request a temporary hold, or join the queue if the dates are taken. The owner will review your request before any stay is confirmed.</p>
                  <InquiryForm propertyId={property.id} propertyName={property.name} maxGuests={property.maxGuests} />
                </div>
              </Card>
            </section>
              </div>

              <aside className="contents lg:order-last lg:block lg:min-w-0 lg:self-stretch" aria-label="Booking options">
                <PropertyBookingClient
                  propertyId={property.id}
                  propertyName={property.name}
                  nightlyRate={property.nightlyRate}
                  currency={property.currency}
                />
              </aside>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
