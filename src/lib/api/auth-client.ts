"use client";

// Re-export from use-auth for backwards compatibility
export { useAuth, useAuth as useSession } from "~/lib/hooks/use-auth";

// Helper hook for protected routes
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "~/lib/hooks/use-auth";

export function useRequireAuth(redirectTo = "/auth/login") {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router]);

  return { loading, isAuthenticated };
}

export function useCurrentUser() {
  const { user, loading } = useAuth();
  return { loading, user };
}

export function useCurrentUserOrRedirect(redirectTo = "/auth/login") {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router]);

  return { loading, user };
}
