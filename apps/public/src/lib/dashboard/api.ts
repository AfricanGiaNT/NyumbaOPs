import { auth } from "./firebase";
import { PropertyImage } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001/nyumbaops/us-central1/api";

type ApiError = {
  message?: string;
};

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
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
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
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
  const token = await getAuthToken();
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
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return handleResponse(response);
}

// Image upload functions

export async function requestImageUpload(data: {
  propertyId: string;
  filename: string;
  contentType: string;
  alt?: string;
  isCover?: boolean;
  sortOrder?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  console.log('[DEBUG] requestImageUpload called:', data);
  
  const response = await apiPost<{ success: boolean; data: { uploadUrl: string; publicUrl: string } }>(
    "/v1/public/uploads",
    data
  );
  
  console.log('[DEBUG] requestImageUpload response:', response.data);
  
  return response.data;
}

export async function uploadFileToSignedUrl(
  signedUrl: string,
  file: File
): Promise<void> {
  console.log('[DEBUG] uploadFileToSignedUrl called:', { signedUrl, fileName: file.name, fileType: file.type, fileSize: file.size });
  
  // Firebase Storage emulator uses POST, production uses PUT
  const isEmulatorUrl = signedUrl.includes('127.0.0.1') || signedUrl.includes('localhost');
  const method = isEmulatorUrl ? "POST" : "PUT";
  
  console.log('[DEBUG] Using method:', method, 'for URL:', signedUrl.substring(0, 80) + '...');
  
  const response = await fetch(signedUrl, {
    method,
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  console.log('[DEBUG] Upload response:', { 
    ok: response.ok, 
    status: response.status, 
    statusText: response.statusText,
    url: signedUrl.substring(0, 80) + '...'
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => 'Unable to read response');
    console.error('[DEBUG] Upload failed, response body:', responseText);
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  console.log('[DEBUG] Upload successful');
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

