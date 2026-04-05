"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MockPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  const bookingId = searchParams.get("bookingId");
  const checkoutId = searchParams.get("checkoutId");

  useEffect(() => {
    if (!bookingId || !checkoutId) return;

    // Trigger mock webhook to auto-confirm payment
    const triggerMockWebhook = async () => {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001") + "/api";
        await fetch(`${apiUrl}/v1/public/webhooks/paychangu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "payment.success",
            data: {
              checkout_id: checkoutId,
              tx_ref: `mock_tx_${Date.now()}`,
              mobile_number: "0991234567",
            },
          }),
        });
      } catch (err) {
        console.error("Mock webhook failed:", err);
      }
    };

    // Trigger webhook after 1 second
    setTimeout(() => {
      triggerMockWebhook();
    }, 1000);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/booking-confirmation?bookingId=${bookingId}&payment=success`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [bookingId, checkoutId, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900">Mock Payment</h1>
        <p className="mt-2 text-sm text-zinc-500">
          🧪 Emulator mode - simulating successful payment
        </p>

        <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-left">
          <p className="text-xs font-medium text-zinc-500">Checkout ID</p>
          <p className="mt-1 font-mono text-sm text-zinc-900">{checkoutId}</p>
        </div>

        <div className="mt-6">
          <div className="mx-auto h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-emerald-600 transition-all duration-1000"
              style={{ width: `${((3 - countdown) / 3) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
          </p>
        </div>

        <p className="mt-6 text-xs text-zinc-400">
          In production, this would be the PayChangu payment page
        </p>
      </div>
    </main>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200" style={{ borderTopColor: "#0f766e" }} />
        </main>
      }
    >
      <MockPaymentContent />
    </Suspense>
  );
}
