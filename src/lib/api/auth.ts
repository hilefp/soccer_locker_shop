// Shop Authentication API Client

import { apiPost } from "~/lib/api/client";
import type {
  ShopAuthResponse,
  ShopForgotPasswordRequest,
  ShopLoginRequest,
  ShopPasswordResetResponse,
  ShopRegisterRequest,
  ShopResetPasswordRequest,
} from "~/lib/api/types";

const SHOP_AUTH_BASE = "/shop/auth";

/**
 * Register new shop customer
 */
export async function registerShopCustomer(
  data: ShopRegisterRequest,
): Promise<ShopAuthResponse> {
  return apiPost<ShopAuthResponse>(`${SHOP_AUTH_BASE}/register`, data);
}

/**
 * Login shop customer
 */
export async function loginShopCustomer(
  credentials: ShopLoginRequest,
): Promise<ShopAuthResponse> {
  return apiPost<ShopAuthResponse>(`${SHOP_AUTH_BASE}/login`, credentials);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  data: ShopForgotPasswordRequest,
): Promise<ShopPasswordResetResponse> {
  return apiPost<ShopPasswordResetResponse>(
    `${SHOP_AUTH_BASE}/forgot-password`,
    data,
  );
}

/**
 * Reset password with token
 */
export async function resetPassword(
  data: ShopResetPasswordRequest,
): Promise<ShopPasswordResetResponse> {
  return apiPost<ShopPasswordResetResponse>(
    `${SHOP_AUTH_BASE}/reset-password`,
    data,
  );
}

/**
 * Sign out - client-side only (clears local state)
 */
export async function signOutShopCustomer(): Promise<void> {
  // Clear local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-token");
  }
}
