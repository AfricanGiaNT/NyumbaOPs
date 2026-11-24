"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StickyCheckAvailability } from "./StickyCheckAvailability";
import { Button } from "./dashboard-app/ui/button";
import { Card } from "./dashboard-app/ui/card";

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
      <Card className="hidden w-full rounded-xl border-zinc-200 shadow-sm lg:sticky lg:top-24 lg:block">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tracking-tight text-zinc-900">{formattedPrice}</span>
            {nightlyRate ? <span className="text-xs text-zinc-500">per night</span> : null}
          </div>
          <Button variant="brand" onClick={() => setIsModalOpen(true)} className="w-full rounded-lg">
            Check availability
          </Button>
          <p className="text-center text-xs text-zinc-500">Request a stay after checking your dates</p>
        </div>
      </Card>

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
