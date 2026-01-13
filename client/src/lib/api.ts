/**
 * API client for making authenticated requests to the server.
 * All requests include credentials and proper JSON headers.
 */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(error.error || "API request failed", res.status);
  }

  return res.json();
}

// Helper for GET requests
export function apiGet<T>(url: string): Promise<T> {
  return api<T>(url);
}

// Helper for POST requests
export function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return api<T>(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Helper for PUT requests
export function apiPut<T>(url: string, data?: unknown): Promise<T> {
  return api<T>(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Helper for PATCH requests
export function apiPatch<T>(url: string, data?: unknown): Promise<T> {
  return api<T>(url, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Helper for DELETE requests
export function apiDelete<T>(url: string): Promise<T> {
  return api<T>(url, { method: "DELETE" });
}
