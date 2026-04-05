import type {
  PublicPropertyDetail,
  PublicPropertyListResponse,
  AvailabilityResponse,
  BlockedDatesResponse,
  CreateBookingResponse,
  PublicBookingDetail,
  CancelBookingResponse,
} from "./types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") + "/api";

export async function fetchPublicProperties(params?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<PublicPropertyListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  if (params?.featured !== undefined) searchParams.set("featured", String(params.featured));

  const response = await fetch(
    `${API_BASE_URL}/v1/public/properties?${searchParams.toString()}`,
    { next: { revalidate: 300 } },
  );

  if (!response.ok) {
    throw new Error("Failed to load properties.");
  }

  return response.json();
}

export async function fetchPublicProperty(id: string): Promise<PublicPropertyDetail> {
  const response = await fetch(`${API_BASE_URL}/v1/public/properties/${id}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Property not available.");
  }

  return response.json();
}

export async function checkAvailability(params: {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
}): Promise<AvailabilityResponse> {
  const searchParams = new URLSearchParams({
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
  });

  const response = await fetch(
    `${API_BASE_URL}/v1/public/properties/${params.propertyId}/availability?${searchParams.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to check availability");
  }

  return response.json();
}

export async function fetchBlockedDates(propertyId: string): Promise<BlockedDatesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/properties/${propertyId}/blocked-dates`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return { success: false, data: { propertyId, blockedRanges: [] } };
  }

  return response.json();
}

export async function initiateBooking(data: {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  notes?: string;
}): Promise<{
  success: boolean;
  data: {
    intentId: string;
    checkoutUrl: string;
    totalAmount: number;
    currency: string;
    expiresAt: string;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/v1/public/bookings/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to initiate booking");
  }

  return response.json();
}

export async function createPublicBooking(data: {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  notes?: string;
}): Promise<CreateBookingResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/public/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to create booking");
  }

  return response.json();
}

export async function fetchPublicBooking(bookingId: string): Promise<PublicBookingDetail> {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/bookings/${bookingId}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Booking not found");
  }

  return response.json();
}

export async function cancelPublicBooking(
  bookingId: string,
  guestEmail: string,
  reason?: string,
): Promise<CancelBookingResponse> {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/bookings/${bookingId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestEmail, reason }),
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to cancel booking");
  }

  return response.json();
}
