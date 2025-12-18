"use client";

// Client-side authentication hooks and utilities

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  User,
} from "~/lib/api/types";
import {
  getGitHubOAuthUrl,
  getGoogleOAuthUrl,
  signInWithEmail as apiSignIn,
  signUpWithEmail as apiSignUp,
} from "~/lib/api/auth";

/**
 * Get session from client-side
 */
async function getClientSession(): Promise<{
  token: string | null;
  user: User | null;
}> {
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      return { token: null, user: null };
    }
    const data = await response.json();
    return {
      token: data.token || null,
      user: data.user || null,
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return { token: null, user: null };
  }
}

/**
 * useSession hook - get current session
 */
export function useSession() {
  const [session, setSession] = useState<{
    token: string | null;
    user: User | null;
  }>({
    token: null,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const sessionData = await getClientSession();
      setSession(sessionData);
      setLoading(false);
    }

    void loadSession();
  }, []);

  const refreshSession = async () => {
    setLoading(true);
    const sessionData = await getClientSession();
    setSession(sessionData);
    setLoading(false);
  };

  return {
    ...session,
    loading,
    refreshSession,
  };
}

/**
 * useCurrentUser hook - get current user
 */
export function useCurrentUser() {
  const { loading, refreshSession, user } = useSession();

  return {
    loading,
    refreshUser: refreshSession,
    user,
  };
}

/**
 * useCurrentUserOrRedirect hook - redirect if not authenticated
 */
export function useCurrentUserOrRedirect(
  redirectTo = "/auth/sign-in",
) {
  const router = useRouter();
  const { loading, user } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [loading, user, redirectTo, router]);

  return { loading, user };
}

/**
 * Sign in with email and password
 */
export async function signIn(
  credentials: SignInRequest,
): Promise<AuthResponse> {
  // Call external API via our backend proxy
  const response = await fetch("/api/auth/signin", {
    body: JSON.stringify(credentials),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Sign in failed");
  }

  return response.json();
}

/**
 * Sign up with email and password
 */
export async function signUp(
  data: SignUpRequest,
): Promise<AuthResponse> {
  // Call external API via our backend proxy
  const response = await fetch("/api/auth/signup", {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Sign up failed");
  }

  return response.json();
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", {
    method: "POST",
  });

  // Clear local storage
  localStorage.removeItem("auth-token");

  // Redirect to home
  window.location.href = "/";
}

/**
 * Sign in with GitHub OAuth
 */
export function signInWithGitHub(): void {
  const oauthUrl = getGitHubOAuthUrl();
  window.location.href = oauthUrl;
}

/**
 * Sign in with Google OAuth
 */
export function signInWithGoogle(): void {
  const oauthUrl = getGoogleOAuthUrl();
  window.location.href = oauthUrl;
}

/**
 * Social provider sign in
 */
export const signInSocial = {
  github: signInWithGitHub,
  google: signInWithGoogle,
};

/**
 * Email sign in wrapper
 */
export const signInEmail = {
  email: signIn,
  social: signInSocial,
};
