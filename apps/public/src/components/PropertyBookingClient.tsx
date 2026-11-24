"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StickyCheckAvailability } from "./StickyCheckAvailability";
import { Card } from "./dashboard-app/ui/card";
import { PropertyActionButton } from "./PropertyActionButtons";
import {
  resolvePropertyButtons,
  type PropertyButtonSettings,
} from "@/lib/propertyButtons";

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
  buttons?: PropertyButtonSettings;
};

export function PropertyBookingClient({
  propertyId,
  propertyName,
  nightlyRate,
  currency,
  buttons = {},
}: PropertyBookingClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formattedPrice = formatPrice(nightlyRate, currency);
  const { availability, contact } = resolvePropertyButtons(buttons, propertyName);
  const openModal = () => setIsModalOpen(true);

  return (
    <>
      <Card className="hidden w-full overflow-hidden rounded-2xl border-zinc-200 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12)] lg:sticky lg:top-24 lg:block">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tracking-tight text-zinc-900">{formattedPrice}</span>
            {nightlyRate ? <span className="text-xs text-zinc-500">per night</span> : null}
          </div>

          <div className="flex flex-col gap-2.5">
            <PropertyActionButton
              button={availability}
              variant="primary"
              icon="calendar"
              onClick={openModal}
              className="w-full px-4"
            />
            <PropertyActionButton
              button={contact}
              variant="secondary"
              icon="chat"
              className="w-full px-4"
            />
          </div>

          {availability.hint ? (
            <p className="text-center text-xs text-zinc-500">{availability.hint}</p>
          ) : null}
        </div>
      </Card>

      <StickyCheckAvailability
        price={formattedPrice}
        showPerNight={!!nightlyRate}
        availability={availability}
        contact={contact}
        onCheckAvailability={openModal}
      />

      {availability.href === null ? (
        <AvailabilityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyId}
          propertyName={propertyName}
        />
      ) : null}
    </>
  );
}
