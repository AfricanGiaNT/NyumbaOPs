"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAvailability, fetchBlockedDates } from "@/lib/api";
import type { AvailabilityResponse, BlockedDateRange } from "@/lib/types";
import { DateRangePicker } from "./DateRangePicker";

type MobileAvailabilitySheetProps = {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-MW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

export function MobileAvailabilitySheet({
  isOpen,
  onClose,
  propertyId,
  propertyName,
}: MobileAvailabilitySheetProps) {
  const router = useRouter();
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityResponse["data"] | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchBlockedDates(propertyId)
        .then((resp) => setBlockedDates(resp.data?.blockedRanges ?? []))
        .catch(() => setBlockedDates([]));
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, propertyId]);

  const handleCheck = async () => {
    if (!checkInDate || !checkOutDate) {
      setError("Please select both dates.");
      return;
    }
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const response = await checkAvailability({
        propertyId,
        checkInDate,
        checkOutDate,
      });
      setResult(response.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const handleBookNow = () => {
    const params = new URLSearchParams({
      propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    });
    router.push(`/checkout?${params.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const hasAvailResult = result && result.available;

  return (
    <div
      className="fixed inset-0"
      style={{ 
        animation: "fadeIn 0.2s ease-out",
        zIndex: 60,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden"
        style={{
          animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          maxHeight: "95vh",
          paddingBottom: "env(safe-area-inset-bottom)",
          width: "100%",
          maxWidth: "100vw",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Select dates</h2>
            <p className="mt-1 text-sm text-zinc-500">{propertyName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5" style={{ maxHeight: "calc(95vh - 180px)" }}>
          {/* Date Range Picker */}
          <DateRangePicker
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            minDate={todayStr}
            blockedDates={blockedDates}
            onCheckInChange={(date) => {
              setCheckInDate(date);
              setResult(null);
              setError(null);
            }}
            onCheckOutChange={(date) => {
              setCheckOutDate(date);
              setResult(null);
              setError(null);
            }}
          />

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Not available */}
          {result && !result.available && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-rose-50 px-4 py-4 text-center">
                <p className="text-base font-semibold text-rose-900">Not available</p>
                <p className="mt-1 text-sm text-rose-700">
                  Try different dates for {propertyName}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 active:bg-zinc-50"
              >
                Change dates
              </button>
            </div>
          )}

          {/* Available */}
          {hasAvailResult && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-emerald-800">Available for your dates!</p>
              </div>

              {/* Price card */}
              <div className="rounded-xl bg-zinc-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-zinc-600">
                    {formatCurrency(result.nightlyRate, result.currency)} × {result.nights} night{result.nights > 1 ? "s" : ""}
                  </span>
                  <span className="text-sm text-zinc-600">
                    {formatCurrency(result.totalAmount, result.currency)}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3">
                  <span className="text-base font-bold text-zinc-900">Total</span>
                  <span className="text-xl font-bold text-zinc-900">
                    {formatCurrency(result.totalAmount, result.currency)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full text-center text-sm text-zinc-500"
              >
                Change dates
              </button>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div 
          className="border-t border-zinc-100 px-5 py-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {!result ? (
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking || !checkInDate || !checkOutDate}
              className="w-full rounded-xl py-4 text-base font-semibold text-white active:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#0f766e" }}
            >
              {checking ? "Checking..." : "Check availability"}
            </button>
          ) : hasAvailResult ? (
            <button
              type="button"
              onClick={handleBookNow}
              className="w-full rounded-xl py-4 text-base font-semibold text-white active:opacity-90"
              style={{ backgroundColor: "#0f766e" }}
            >
              Book now · {formatCurrency(result.totalAmount, result.currency)}
            </button>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
