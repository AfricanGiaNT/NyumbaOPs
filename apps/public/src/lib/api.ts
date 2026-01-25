import type {
  PublicPropertyDetail,
  PublicPropertyListResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001/nyumbaops/us-central1/api";

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
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error("Failed to load properties.");
  }

  return response.json();
}

export async function fetchPublicProperty(id: string): Promise<PublicPropertyDetail> {
  const response = await fetch(`${API_BASE_URL}/v1/public/properties/${id}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Property not available.");
  }

  return response.json();
}
