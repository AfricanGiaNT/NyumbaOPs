"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchPublicProperty } from "@/lib/api";
import { AmenitiesList } from "@/components/AmenitiesList";
import { PropertyGallery } from "@/components/PropertyGallery";
import { Footer } from "@/components/Footer";
import { HostSection } from "@/components/HostSection";
import { LocationSection } from "@/components/LocationSection";
import { StickyCheckAvailability } from "@/components/StickyCheckAvailability";
import { AvailabilityModal } from "@/components/AvailabilityModal";

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

export default function PropertyPage({ params }: PropertyPageProps) {
  const [property, setProperty] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadProperty() {
      const { id } = await params;
      const propertyResponse = await fetchPublicProperty(id);
      setProperty(propertyResponse.data);
    }
    loadProperty();
  }, [params]);

  if (!property) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-600">Loading...</div>
      </main>
    );
  }

  return (
    <>
      <main className="bg-white pb-32" style={{ scrollBehavior: "smooth" }}>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8" style={{ boxSizing: "border-box", maxWidth: "100%" }}>
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
                  image: property.images.map((image: any) => image.url),
                  description:
                    "Clean, fully furnished apartment suitable for families and business stays.",
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
          
          {/* Property Type Subtitle */}
          <p className="border-b border-zinc-200 pb-6 text-base text-zinc-700">
            Entire rental unit in {property.location ?? "Lilongwe, Malawi"}
          </p>
          
          {/* Property Stats Inline */}
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-6 text-base text-zinc-700">
            <span>{property.maxGuests} guests</span>
            <span>·</span>
            <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>
          
          {/* Host Section */}
          <HostSection />
          
          {/* Description */}
          <div className="space-y-4 border-b border-zinc-200 py-8">
            <h2 className="text-2xl font-bold text-zinc-900">About this place</h2>
            <p className="text-base leading-relaxed text-zinc-700">
              Enjoy a stylish experience at this centrally-located space fitted fully fitted with all amenities, air conditioning, and WIFI.
            </p>
          </div>
          
          {/* Amenities */}
          <div className="space-y-6 border-b border-zinc-200 py-8">
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

          {/* Inline Booking Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl max-w-full overflow-hidden">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-zinc-900">
                {formatPrice(property.nightlyRate, property.currency)}
              </span>
              <span className="text-sm text-zinc-600">per night</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 w-full rounded-lg px-6 py-3 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#0f766e" }}
            >
              Check availability
            </button>
          </div>
        </div>
      </section>

        <Footer />
      </main>

      <StickyCheckAvailability
        price={formatPrice(property.nightlyRate, property.currency)}
        onCheckAvailability={() => setIsModalOpen(true)}
      />

      <AvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={property.id}
        propertyName={property.name}
      />
    </>
  );
}
