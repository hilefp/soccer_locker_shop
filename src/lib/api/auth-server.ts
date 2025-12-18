// Server-side authentication utilities

import * as jose from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { JWTPayload, User } from "~/lib/api/types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

/**
 * Verify JWT token and return payload
 */
export async function verifyToken(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Convert JWT payload to User object
 */
export function jwtPayloadToUser(payload: JWTPayload): User {
  return {
    age: payload.age || null,
    createdAt: new Date(),
    email: payload.email,
    emailVerified: payload.emailVerified || false,
    firstName: payload.firstName || null,
    id: payload.sub,
    image: null,
    lastName: payload.lastName || null,
    name: payload.name,
    role: payload.role || "user",
    twoFactorEnabled: null,
    updatedAt: new Date(),
  };
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<{
  token: string;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    token,
    user: jwtPayloadToUser(payload),
  };
}

/**
 * Get current user (server-side)
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Get current user or redirect to sign-in
 */
export async function getCurrentUserOrRedirect(
  forbiddenUrl = "/auth/sign-in",
  okUrl = "",
  ignoreForbidden = false,
): Promise<User | null> {
  const user = await getCurrentUser();

  // if no user is found
  if (!user) {
    // redirect to forbidden url unless explicitly ignored
    if (!ignoreForbidden) {
      redirect(forbiddenUrl);
    }
    // if ignoring forbidden, return the null user immediately
    return user; // user is null here
  }

  // if user is found and an okUrl is provided, redirect there
  if (okUrl) {
    redirect(okUrl);
  }

  // if user is found and no okUrl is provided, return the user
  return user; // user is User here
}

/**
 * Set auth token cookie
 */
export async function setAuthCookie(
  token: string,
  refreshToken?: string,
): Promise<void> {
  const cookieStore = await cookies();

  // Set access token
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Set refresh token if provided
  if (refreshToken) {
    cookieStore.set("refresh-token", refreshToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  cookieStore.delete("refresh-token");
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("refresh-token")?.value || null;
}
