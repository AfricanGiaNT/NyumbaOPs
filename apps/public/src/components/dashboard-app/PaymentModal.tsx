"use client";

import { useState } from "react";
import { apiPost } from "@/lib/dashboard/api";
import type { Payment, PaymentMethod } from "@/lib/dashboard/types";

type PaymentModalProps = {
  bookingId: string;
  currency: string;
  remainingAmount: number;
  onClose: () => void;
  onPaymentAdded: (payment: Payment) => void;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money (generic)" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "TNM_MPAMBA", label: "TNM Mpamba" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
];

export function PaymentModal({
  bookingId,
  currency,
  remainingAmount,
  onClose,
  onPaymentAdded,
}: PaymentModalProps) {
  const [tab, setTab] = useState<"manual" | "paychangu">("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(remainingAmount);
  const [method, setMethod] = useState<PaymentMethod>("MOBILE_MONEY");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const submitManual = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiPost<{ success: boolean; data: Payment }>("/payments", {
        bookingId,
        amount,
        currency,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onPaymentAdded(response.data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const generatePaychanguLink = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiPost<{
        success: boolean;
        data: { paymentId: string; checkoutUrl: string };
      }>(`/bookings/${bookingId}/payment-link`, {});
      setPaymentLink(response.data.checkoutUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add payment</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            type="button"
          >
            Close
          </button>
        </header>

        <div className="mt-4 flex gap-2 text-sm">
          <button
            className={`rounded-full px-3 py-1 ${
              tab === "manual" ? "bg-indigo-600 text-white" : "border border-zinc-300"
            }`}
            onClick={() => setTab("manual")}
            type="button"
          >
            Manual payment
          </button>
          <button
            className={`rounded-full px-3 py-1 ${
              tab === "paychangu" ? "bg-indigo-600 text-white" : "border border-zinc-300"
            }`}
            onClick={() => setTab("paychangu")}
            type="button"
          >
            PayChangu link
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {tab === "manual" && (
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <label className="mb-1 block font-medium">Amount ({currency})</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value || 0))}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Method</label>
              <select
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              >
                {paymentMethods.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium">Reference</label>
              <input
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction ID or receipt"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Notes</label>
              <textarea
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={submitManual}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Record payment"}
            </button>
          </div>
        )}

        {tab === "paychangu" && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-zinc-600">
              Generate a PayChangu payment link for the remaining balance.
            </p>
            <button
              type="button"
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={generatePaychanguLink}
              disabled={submitting}
            >
              {submitting ? "Generating..." : "Generate link"}
            </button>
            {paymentLink && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Payment link</p>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-semibold text-indigo-600"
                >
                  {paymentLink}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
