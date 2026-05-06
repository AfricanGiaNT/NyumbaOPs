import { PropertyImage } from "./types";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") + "/api";

const TOKEN_KEY = "nyumbaops_token";

type ApiError = {
  message?: string;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function handleResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  let errorBody: ApiError | undefined;
  try {
    errorBody = await response.json();
  } catch {
    errorBody = undefined;
  }

  const message = errorBody?.message ?? `Request failed (${response.status})`;
  throw new Error(message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return handleResponse(response);
}

// Image upload functions

export async function uploadImageFile(
  file: File,
  propertyId: string,
  alt?: string,
): Promise<{ publicUrl: string }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("propertyId", propertyId);
  if (alt) formData.append("alt", alt);

  const response = await fetch(`${API_BASE_URL}/v1/public/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const result = await handleResponse(response) as { success: boolean; data: { publicUrl: string } };
  return { publicUrl: result.data.publicUrl };
}

export async function updatePropertyImages<T>(
  propertyId: string,
  images: PropertyImage[]
): Promise<T> {
  return apiPatch<T>(`/properties/${propertyId}`, { images });
}

export async function deletePropertyImage<T>(
  propertyId: string,
  imageUrl: string
): Promise<T> {
  // Get current property images
  const property = await apiGet<{ images: PropertyImage[] }>(`/properties/${propertyId}`);
  const updatedImages = property.images.filter((img) => img.url !== imageUrl);
  
  return apiPatch<T>(`/properties/${propertyId}`, { images: updatedImages });
}

