// Server-side API client (can use next/headers)

import { ofetch } from "ofetch";
import { cookies } from "next/headers";

// API configuration
const API_URL = process.env.NEXT_SERVER_API_URL;

if (!API_URL) {
  throw new Error("NEXT_SERVER_API_URL is not configured");
}

// Public server client — does NOT read cookies, safe for static/ISR pages
const apiClientPublic = ofetch.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  async onResponseError({ response }) {
    console.error(`API Error: ${response.status}`, response._data);
  },
});

// Authenticated server client — reads cookies, forces dynamic rendering
export const apiClientServer = ofetch.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  async onRequest({ options }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (token) {
      options.headers = options.headers || {};
      (options.headers as unknown as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  },
  async onResponseError({ response }) {
    console.error(`API Error: ${response.status}`, response._data);
  },
});

// Public GET — no cookies, allows static rendering
export async function apiGetServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientPublic<T>(path, { method: "GET", ...options });
}

// Authenticated GET — reads cookies, makes route dynamic
export async function apiGetServerAuth<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientServer<T>(path, { method: "GET", ...options });
}

export async function apiPostServer<T>(
  path: string,
  body?: Record<string, any> | null,
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
  body?: Record<string, any> | null,
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
