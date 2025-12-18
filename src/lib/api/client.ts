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
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        };
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
  body?: unknown,
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
  body?: unknown,
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
  body?: unknown,
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
