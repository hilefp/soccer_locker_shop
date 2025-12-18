// Server-side API client (can use next/headers)

import { ofetch } from "ofetch";
import { cookies } from "next/headers";

// API configuration
const API_URL = process.env.NEXT_SERVER_API_URL;

if (!API_URL) {
  throw new Error("NEXT_SERVER_API_URL is not configured");
}

// Server-side HTTP client
export const apiClientServer = ofetch.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  async onRequest({ options }) {
    // Add auth token from cookies on server
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  },
  async onResponseError({ response }) {
    console.error(`API Error: ${response.status}`, response._data);
  },
});

// Type-safe API wrapper functions for server
export async function apiGetServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientServer<T>(path, { method: "GET", ...options });
}

export async function apiPostServer<T>(
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiClientServer<T>(path, {
    body,
    method: "POST",
    ...options,
  });
}

export async function apiPatchServer<T>(
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiClientServer<T>(path, {
    body,
    method: "PATCH",
    ...options,
  });
}

export async function apiDeleteServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientServer<T>(path, { method: "DELETE", ...options });
}
