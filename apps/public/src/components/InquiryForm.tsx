"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from '@/lib/api-base';

type InquiryFormProps = {
  propertyId: string;
  propertyName: string;
  maxGuests: number;
};

type InquiryFormState = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  message: string;
};

export function InquiryForm({ propertyId, propertyName, maxGuests }: InquiryFormProps) {
  const [formData, setFormData] = useState<InquiryFormState>({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkInDate = params.get('checkIn') ?? '';
    const checkOutDate = params.get('checkOut') ?? '';
    if (checkInDate || checkOutDate) {
      setFormData((current) => ({ ...current, checkInDate, checkOutDate }));
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/public/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, propertyId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? payload?.error?.message ?? "Failed to submit inquiry");
      }

      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Inquiry submitted.</p>
        <p className="mt-1 text-emerald-800">
          Thanks for your interest in {propertyName}. We will contact you within 24 hours with
          availability and payment details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <div>
        <label htmlFor="inquiry-name" className="mb-1 block font-medium">Full name</label>
        <input
          id="inquiry-name"
          className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
          required
          value={formData.guestName}
          onChange={(event) => setFormData({ ...formData, guestName: event.target.value })}
          placeholder="John Banda"
        />
      </div>
      <div>
        <label htmlFor="inquiry-phone" className="mb-1 block font-medium">Phone number</label>
        <input
          id="inquiry-phone"
          className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
          required
          type="tel"
          value={formData.guestPhone}
          onChange={(event) => setFormData({ ...formData, guestPhone: event.target.value })}
          placeholder="0991234567"
        />
      </div>
      <div>
        <label htmlFor="inquiry-email" className="mb-1 block font-medium">Email</label>
        <input
          id="inquiry-email"
          className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
          type="email"
          required
          value={formData.guestEmail}
          onChange={(event) => setFormData({ ...formData, guestEmail: event.target.value })}
          placeholder="john@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="inquiry-check-in" className="mb-1 block font-medium">Check-in</label>
          <input
            id="inquiry-check-in"
            className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
            required
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={formData.checkInDate}
            onChange={(event) => setFormData({ ...formData, checkInDate: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="inquiry-check-out" className="mb-1 block font-medium">Check-out</label>
          <input
            id="inquiry-check-out"
            className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
            required
            type="date"
            min={formData.checkInDate || new Date().toISOString().split("T")[0]}
            value={formData.checkOutDate}
            onChange={(event) => setFormData({ ...formData, checkOutDate: event.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="inquiry-guests" className="mb-1 block font-medium">Guests</label>
        <input
          id="inquiry-guests"
          className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
          required
          min={1}
          max={maxGuests}
          type="number"
          value={formData.numberOfGuests}
          onChange={(event) =>
            setFormData({
              ...formData,
              numberOfGuests: Number(event.target.value || 1),
            })
          }
        />
      </div>
      <div>
        <label htmlFor="inquiry-message" className="mb-1 block font-medium">Message (optional)</label>
        <textarea
          id="inquiry-message"
          className="w-full min-h-[44px] rounded-lg border border-[var(--border)] px-3 py-2.5"
          rows={3}
          value={formData.message}
          onChange={(event) => setFormData({ ...formData, message: event.target.value })}
          placeholder="Any special requests?"
        />
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[44px] rounded-full bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit inquiry"}
      </button>
      <p className="text-xs text-[var(--muted)]">
        We respond within 24 hours with availability and payment instructions.
      </p>
    </form>
  );
}
