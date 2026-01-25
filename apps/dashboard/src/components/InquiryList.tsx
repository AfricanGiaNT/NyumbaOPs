"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import type { Inquiry, Property } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";

type InquiryListProps = {
  initialStatus?: Inquiry["status"];
};

export function InquiryList({ initialStatus }: InquiryListProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [statusFilter, setStatusFilter] = useState<Inquiry["status"] | "ALL">(
    initialStatus ?? "ALL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inquiryResponse, propertyResponse] = await Promise.all([
          apiGet<{ success: boolean; data: Inquiry[] }>("/inquiries"),
          apiGet<Property[]>("/properties"),
        ]);
        setInquiries(inquiryResponse.data ?? []);
        setProperties(propertyResponse ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const propertyMap = useMemo(() => {
    return new Map(properties.map((property) => [property.id, property]));
  }, [properties]);

  const filteredInquiries = useMemo(() => {
    if (statusFilter === "ALL") return inquiries;
    return inquiries.filter((inquiry) => inquiry.status === statusFilter);
  }, [inquiries, statusFilter]);

  const updateStatus = async (id: string, status: Inquiry["status"]) => {
    setActionError(null);
    try {
      const response = await apiPatch<{ success: boolean; data: Inquiry }>(
        `/inquiries/${id}/status`,
        { status },
      );
      setInquiries((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const convertInquiry = async (id: string) => {
    setActionError(null);
    setSuccessMessage(null);
    setConvertingId(id);
    try {
      await apiPost(`/inquiries/${id}/convert`, {});
      const refreshed = await apiGet<{ success: boolean; data: Inquiry }>("/inquiries/" + id);
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? refreshed.data : item)),
      );
      setSuccessMessage("Booking created successfully! Guest profile was auto-created.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setConvertingId(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (error) {
    return <EmptyState title="Unable to load inquiries" message={error} />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Inquiries</h2>
          <p className="text-sm text-zinc-500">Track new and contacted requests.</p>
        </div>
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as Inquiry["status"] | "ALL")}
        >
          <option value="ALL">All</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CONVERTED">Converted</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </header>

      {actionError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {filteredInquiries.length === 0 ? (
        <EmptyState title="No inquiries" message="New inquiries will appear here." />
      ) : (
        <div className="space-y-3">
          {filteredInquiries.map((inquiry) => {
            const property = propertyMap.get(inquiry.propertyId);
            return (
              <div
                key={inquiry.id}
                className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{inquiry.guestName}</p>
                    <p className="text-zinc-500">
                      {property?.name ?? inquiry.propertyId} • {inquiry.guestPhone}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                    {inquiry.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>
                    {new Date(inquiry.checkInDate).toLocaleDateString()} →{" "}
                    {new Date(inquiry.checkOutDate).toLocaleDateString()}
                  </span>
                  <span>{inquiry.numberOfGuests} guests</span>
                </div>
                {inquiry.message && <p className="mt-3 text-sm">{inquiry.message}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold"
                    onClick={() => updateStatus(inquiry.id, "CONTACTED")}
                    disabled={inquiry.status !== "NEW"}
                  >
                    Mark contacted
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 flex items-center gap-1"
                    onClick={() => convertInquiry(inquiry.id)}
                    disabled={
                      (inquiry.status !== "NEW" && inquiry.status !== "CONTACTED") ||
                      convertingId === inquiry.id
                    }
                  >
                    {convertingId === inquiry.id ? (
                      <>
                        <svg
                          className="h-3 w-3 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Converting...
                      </>
                    ) : (
                      "Convert to booking"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
