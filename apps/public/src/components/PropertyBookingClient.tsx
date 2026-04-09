"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StickyCheckAvailability } from "./StickyCheckAvailability";

const AvailabilityModal = dynamic(
  () => import("./AvailabilityModal").then((m) => ({ default: m.AvailabilityModal })),
  { ssr: false },
);

const formatPrice = (amount?: number | null, currency?: string) => {
  if (!amount || !currency) return "Price on request";
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

type PropertyBookingClientProps = {
  propertyId: string;
  propertyName: string;
  nightlyRate?: number | null;
  currency: string;
};

export function PropertyBookingClient({
  propertyId,
  propertyName,
  nightlyRate,
  currency,
}: PropertyBookingClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formattedPrice = formatPrice(nightlyRate, currency);

  return (
    <>
      {/* Mobile inline booking card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl max-w-full overflow-hidden lg:hidden">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-zinc-900">{formattedPrice}</span>
          <span className="text-sm text-zinc-600">per night</span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 w-full rounded-lg px-6 py-3 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#FF8F35" }}
        >
          Check availability
        </button>
      </div>

      {/* Desktop sticky booking card */}
      <div className="hidden lg:block">
        <div className="sticky top-24 h-fit space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-zinc-900">{formattedPrice}</span>
                <span className="text-sm text-zinc-600">per night</span>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full rounded-lg px-6 py-3 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#FF8F35" }}
              >
                Check availability
              </button>
            </div>
          </div>
        </div>
      </div>

      <StickyCheckAvailability
        price={formattedPrice}
        onCheckAvailability={() => setIsModalOpen(true)}
      />

      <AvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={propertyId}
        propertyName={propertyName}
      />
    </>
  );
}
