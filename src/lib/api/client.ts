import { ofetch } from "ofetch";

import type { ApiResponse } from "~/lib/api/types";

// API configuration
const API_URL =
  typeof window === "undefined"
    ? process.env.NEXT_SERVER_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not configured");
}

// Client-side HTTP client (for browser)
export const apiClientBrowser = ofetch.create({
  baseURL: API_URL,
  credentials: "include", // Include cookies
  headers: {
    "Content-Type": "application/json",
  },
  async onRequest({ options }) {
    // Get token from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth-token");
      if (token) {
        const headers = new Headers(options.headers as HeadersInit);
        headers.set("Authorization", `Bearer ${token}`);
        options.headers = headers;
      }
    }
  },
  async onResponseError({ response }) {
    console.error(`API Error: ${response.status}`, response._data);
  },
});

// Type-safe API wrapper functions (client-side)
export async function apiGet<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientBrowser<T>(path, { method: "GET", ...options });
}

export async function apiPost<T>(
  path: string,
  body?: Record<string, any> | null,
  options?: RequestInit,
): Promise<T> {
  return apiClientBrowser<T>(path, {
    body,
    method: "POST",
    ...options,
  });
}

export async function apiPut<T>(
  path: string,
  body?: Record<string, any> | null,
  options?: RequestInit,
): Promise<T> {
  return apiClientBrowser<T>(path, {
    body,
    method: "PUT",
    ...options,
  });
}

export async function apiPatch<T>(
  path: string,
  body?: Record<string, any> | null,
  options?: RequestInit,
): Promise<T> {
  return apiClientBrowser<T>(path, {
    body,
    method: "PATCH",
    ...options,
  });
}

export async function apiDelete<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientBrowser<T>(path, { method: "DELETE", ...options });
}

/**
 * Extract the API's own explanation from a failed request.
 *
 * ofetch throws a FetchError whose `.message` describes the HTTP failure
 * (`[POST] "http://localhost:4000/...": 409 Conflict`) rather than what the
 * server said, so the response body has to be read explicitly. Also understands
 * the `{ error }` shape our Next route handlers re-serialize backend errors
 * into, and NestJS validation errors, which arrive as a string array.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const err = error as Record<string, any> | null | undefined;

  // err.data is the parsed JSON body; _data is ofetch's raw copy of it
  const body = err?.data ?? err?.response?._data;
  const raw = body?.message ?? body?.error;

  if (Array.isArray(raw)) {
    const joined = raw.filter((m): m is string => typeof m === "string").join(". ");
    if (joined.trim()) return joined;
  }
  if (typeof raw === "string" && raw.trim()) return raw;

  // A FetchError with no usable body only knows the transport failure, which is
  // meaningless to a customer. Anything else — including an Error we threw after
  // already reading the body — carries a message worth showing.
  if (err?.name !== "FetchError" && error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

// Helper to handle API responses
export function handleApiResponse<T>(
  response: ApiResponse<T>,
): T {
  if (!response.success || response.error) {
    throw new Error(
      response.error?.message || "An error occurred",
    );
  }
  if (!response.data) {
    throw new Error("No data in response");
  }
  return response.data;
}
