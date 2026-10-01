import type {
  PublicPropertyDetail,
  PublicPropertyListResponse,
  PublicReview,
  PublicReviewsResponse,
  AvailabilityResponse,
  BlockedDatesResponse,
} from "./types";
import { API_BASE_URL } from './api-base';

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

export async function fetchApprovedReviews(propertyId: string): Promise<PublicReviewsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/properties/${propertyId}/reviews`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return { success: true, data: [] };
  }

  return response.json();
}

export async function submitReview(
  propertyId: string,
  data: {
    reviewerName: string;
    overallRating: number;
    comment?: string;
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    communicationRating?: number;
    website?: string;
  },
): Promise<{ success: boolean; data: PublicReview }> {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/properties/${propertyId}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Failed to submit review");
  }

  return response.json();
}
