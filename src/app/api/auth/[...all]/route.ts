// Custom auth endpoints - replacing better-auth with JWT

import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookie,
  getRefreshToken,
  getSession,
  setAuthCookie,
} from "~/lib/auth";
import {
  refreshAuthToken,
  signInWithEmail,
  signOut as apiSignOut,
  signUpWithEmail,
} from "~/lib/api/auth";
import type { SignInRequest, SignUpRequest } from "~/lib/api/types";

// Handle auth routes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ all: string[] }> },
) {
  const { all } = await params;
  const route = all.join("/");

  try {
    // Sign in endpoint
    if (route === "signin") {
      const body = (await request.json()) as SignInRequest;
      const authResponse = await signInWithEmail(body);

      // Set HTTP-only cookies
      await setAuthCookie(authResponse.token, authResponse.refreshToken);

      return NextResponse.json({
        success: true,
        token: authResponse.token,
        user: authResponse.user,
      });
    }

    // Sign up endpoint
    if (route === "signup") {
      const body = (await request.json()) as SignUpRequest;
      const authResponse = await signUpWithEmail(body);

      // Set HTTP-only cookies
      await setAuthCookie(authResponse.token, authResponse.refreshToken);

      return NextResponse.json({
        success: true,
        token: authResponse.token,
        user: authResponse.user,
      });
    }

    // Sign out endpoint
    if (route === "signout") {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await apiSignOut(refreshToken);
      }
      await clearAuthCookie();

      return NextResponse.json({ success: true });
    }

    // Refresh token endpoint
    if (route === "refresh") {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return NextResponse.json(
          { error: "No refresh token" },
          { status: 401 },
        );
      }

      const authResponse = await refreshAuthToken(refreshToken);
      await setAuthCookie(authResponse.token, authResponse.refreshToken);

      return NextResponse.json({
        success: true,
        token: authResponse.token,
        user: authResponse.user,
      });
    }

    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Auth route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 500 },
    );
  }
}

// Handle GET requests
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ all: string[] }> },
) {
  const { all } = await params;
  const route = all.join("/");

  try {
    // Session endpoint
    if (route === "session") {
      const session = await getSession();

      if (!session) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      return NextResponse.json({
        success: true,
        token: session.token,
        user: session.user,
      });
    }

    // OAuth callback handlers would go here
    // For now, redirect to external API OAuth endpoints
    if (route.startsWith("callback/github") || route.startsWith("callback/google")) {
      // Get the callback from external API and handle the response
      // This is a placeholder - you'll need to implement based on your external API
      return NextResponse.json(
        { error: "OAuth callback should be handled by external API" },
        { status: 501 },
      );
    }

    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Auth route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 500 },
    );
  }
}
