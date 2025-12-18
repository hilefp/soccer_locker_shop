// Authentication API client - calls external API

import { apiPost } from "~/lib/api/client";
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
} from "~/lib/api/types";

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  credentials: SignInRequest,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/signin", credentials);
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  data: SignUpRequest,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/signup", data);
}

/**
 * Sign out - invalidate session on external API
 */
export async function signOut(refreshToken: string): Promise<void> {
  await apiPost("/auth/signout", { refreshToken });
}

/**
 * Refresh JWT token
 */
export async function refreshAuthToken(
  refreshToken: string,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/refresh", { refreshToken });
}

/**
 * Get current user from external API
 */
export async function fetchCurrentUser() {
  try {
    const response = await apiPost("/auth/me");
    return response;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  email: string,
): Promise<void> {
  await apiPost("/auth/password/reset-request", { email });
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiPost("/auth/password/reset", {
    newPassword,
    token,
  });
}

/**
 * Get GitHub OAuth URL
 */
export function getGitHubOAuthUrl(): string {
  const apiUrl =
    typeof window === "undefined"
      ? process.env.NEXT_SERVER_API_URL
      : process.env.NEXT_PUBLIC_API_URL;
  return `${apiUrl}/auth/oauth/github`;
}

/**
 * Get Google OAuth URL
 */
export function getGoogleOAuthUrl(): string {
  const apiUrl =
    typeof window === "undefined"
      ? process.env.NEXT_SERVER_API_URL
      : process.env.NEXT_PUBLIC_API_URL;
  return `${apiUrl}/auth/oauth/google`;
}
