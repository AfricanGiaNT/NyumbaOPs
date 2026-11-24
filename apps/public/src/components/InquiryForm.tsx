"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from '@/lib/api-base';
import { propertyToday } from '@/lib/property-date';
import { Button } from './dashboard-app/ui/button';
import { Input } from './dashboard-app/ui/input';
import { Label } from './dashboard-app/ui/label';
import { Textarea } from './dashboard-app/ui/textarea';

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
  const [requestStatus, setRequestStatus] = useState<"PENDING_REVIEW" | "QUEUED" | null>(null);
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
      const response = await fetch(`${API_BASE_URL}/v1/public/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, propertyId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? payload?.error?.message ?? "Failed to submit reservation request");
      }

      const payload = await response.json();
      setRequestStatus(payload.data.status);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (requestStatus) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">{requestStatus === "QUEUED" ? "Added to the queue." : "Reservation request received."}</p>
        <p className="mt-1 text-emerald-800">
          {requestStatus === "QUEUED"
            ? `The dates for ${propertyName} are currently held or booked. We will email you if they open up.`
            : `The dates for ${propertyName} are held for up to 24 hours while the owner reviews your request. Your stay is not confirmed yet.`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inquiry-name">Full name</Label>
          <Input
            id="inquiry-name"
            required
            value={formData.guestName}
            onChange={(event) => setFormData({ ...formData, guestName: event.target.value })}
            placeholder="John Banda"
          />
        </div>
        <div>
          <Label htmlFor="inquiry-phone">Phone number</Label>
          <Input
            id="inquiry-phone"
            required
            type="tel"
            value={formData.guestPhone}
            onChange={(event) => setFormData({ ...formData, guestPhone: event.target.value })}
            placeholder="0991234567"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="inquiry-email">Email</Label>
        <Input
          id="inquiry-email"
          type="email"
          required
          value={formData.guestEmail}
          onChange={(event) => setFormData({ ...formData, guestEmail: event.target.value })}
          placeholder="john@example.com"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inquiry-check-in">Check-in</Label>
          <Input
            id="inquiry-check-in"
            required
            type="date"
            min={propertyToday()}
            value={formData.checkInDate}
            onChange={(event) => setFormData({ ...formData, checkInDate: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="inquiry-check-out">Check-out</Label>
          <Input
            id="inquiry-check-out"
            required
            type="date"
            min={formData.checkInDate || propertyToday()}
            value={formData.checkOutDate}
            onChange={(event) => setFormData({ ...formData, checkOutDate: event.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="inquiry-guests">Guests</Label>
        <Input
          id="inquiry-guests"
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
        <Label htmlFor="inquiry-message">Message (optional)</Label>
        <Textarea
          id="inquiry-message"
          rows={3}
          value={formData.message}
          onChange={(event) => setFormData({ ...formData, message: event.target.value })}
          placeholder="Any special requests?"
        />
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <Button
        type="submit"
        variant="brand"
        disabled={submitting}
        className="w-full rounded-lg"
      >
        {submitting ? "Submitting..." : "Request reservation"}
      </Button>
      <p className="text-xs text-[var(--muted)]">
        We will email you when your request is reviewed or your queue status changes. A request is confirmed only after the owner completes the final confirmation.
      </p>
    </form>
  );
}
