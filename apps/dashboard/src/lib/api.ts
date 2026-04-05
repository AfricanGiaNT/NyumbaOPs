import { getStoredToken } from "./AuthContext";
import { PropertyImage } from "./types";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") + "/api";

type ApiError = {
  message?: string;
};

function getAuthToken(): string | null {
  return getStoredToken();
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

export async function uploadPropertyImage(data: {
  propertyId: string;
  file: File;
  alt?: string;
  isCover?: boolean;
  sortOrder?: number;
}): Promise<{ publicUrl: string; imageId: string }> {
  const token = getAuthToken();
  const form = new FormData();
  form.append("file", data.file);
  form.append("propertyId", data.propertyId);
  if (data.alt) form.append("alt", data.alt);
  form.append("isCover", String(data.isCover ?? false));
  form.append("sortOrder", String(data.sortOrder ?? 0));

  const response = await fetch(`${API_BASE_URL}/v1/public/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "Upload failed");
    throw new Error(err);
  }

  const json = await response.json() as { success: boolean; data: { publicUrl: string; imageId: string } };
  return json.data;
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

