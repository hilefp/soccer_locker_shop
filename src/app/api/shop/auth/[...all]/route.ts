// Shop Authentication API Routes

import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookie,
  getSession,
  setAuthCookie,
} from "~/lib/api/auth-server";
import {
  loginShopCustomer,
  registerShopCustomer,
  requestPasswordReset,
  resetPassword,
} from "~/lib/api/auth";
import type {
  ShopForgotPasswordRequest,
  ShopLoginRequest,
  ShopRegisterRequest,
  ShopResetPasswordRequest,
} from "~/lib/api/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ all: string[] }> },
) {
  const { all } = await params;
  const route = all.join("/");

  try {
    // Register endpoint
    if (route === "register") {
      const body = (await request.json()) as ShopRegisterRequest;
      console.log("📝 Register request:", {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        hasPassword: !!body.password,
      });

      try {
        const authResponse = await registerShopCustomer(body);

        // Set HTTP-only cookie
        await setAuthCookie(authResponse.accessToken);

        console.log("✅ Registration successful for:", body.email);
        return NextResponse.json({
          success: true,
          token: authResponse.accessToken,
          user: authResponse.user,
        });
      } catch (registerError: unknown) {
        console.error("❌ Registration failed:", registerError);
        if (registerError && typeof registerError === 'object') {
          if ('data' in registerError) {
            console.error("Backend error response:", registerError.data);
          }
          if ('statusCode' in registerError) {
            console.error("Backend status code:", registerError.statusCode);
          }
        }
        throw registerError;
      }
    }

    // Login endpoint
    if (route === "login") {
      const body = (await request.json()) as ShopLoginRequest;
      const authResponse = await loginShopCustomer(body);

      // Set HTTP-only cookie
      await setAuthCookie(authResponse.accessToken);

      return NextResponse.json({
        success: true,
        token: authResponse.accessToken,
        user: authResponse.user,
      });
    }

    // Forgot password endpoint
    if (route === "forgot-password") {
      const body = (await request.json()) as ShopForgotPasswordRequest;
      const response = await requestPasswordReset(body);

      return NextResponse.json({
        success: true,
        message: response.message,
      });
    }

    // Reset password endpoint
    if (route === "reset-password") {
      const body = (await request.json()) as ShopResetPasswordRequest;
      const response = await resetPassword(body);

      return NextResponse.json({
        success: true,
        message: response.message,
      });
    }

    // Logout endpoint
    if (route === "logout") {
      await clearAuthCookie();

      return NextResponse.json({ success: true });
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
        // Clear invalid cookies in Route Handler (where it's allowed)
        await clearAuthCookie();
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
