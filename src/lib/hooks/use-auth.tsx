"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { ShopCustomer } from "~/lib/api/types";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  register: (data: unknown) => Promise<void>;
  user: ShopCustomer | null;
}

/* -------------------------------------------------------------------------- */
/*                                Context                                     */
/* -------------------------------------------------------------------------- */

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*                         Session helpers                                    */
/* -------------------------------------------------------------------------- */

const getClientSession = async (): Promise<{
  token: string | null;
  user: ShopCustomer | null;
}> => {
  try {
    const response = await fetch("/api/shop/auth/session");
    if (!response.ok) {
      return { token: null, user: null };
    }
    const data = (await response.json()) as { token?: string; user?: ShopCustomer };
    return {
      token: data.token || null,
      user: data.user || null,
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return { token: null, user: null };
  }
};

/* -------------------------------------------------------------------------- */
/*                               Provider                                     */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const [user, setUser] = React.useState<ShopCustomer | null>(null);
  const [loading, setLoading] = React.useState(true);

  /* ----------------------- Load session on mount ------------------------ */
  React.useEffect(() => {
    async function loadSession() {
      const session = await getClientSession();
      setUser(session.user);

      // Store token in localStorage for API client
      if (session.token) {
        localStorage.setItem("auth-token", session.token);
      } else {
        // Clear invalid token from localStorage
        localStorage.removeItem("auth-token");
      }

      setLoading(false);
    }

    void loadSession();
  }, []);

  /* --------------------------- Refresh session -------------------------- */
  const refreshSession = React.useCallback(async () => {
    setLoading(true);
    const session = await getClientSession();
    setUser(session.user);

    if (session.token) {
      localStorage.setItem("auth-token", session.token);
    } else {
      // Clear invalid token from localStorage
      localStorage.removeItem("auth-token");
    }

    setLoading(false);
  }, []);

  /* ------------------------------- Login -------------------------------- */
  const login = React.useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        console.log("🔵 Starting login for:", email);
        const response = await fetch("/api/shop/auth/login", {
          body: JSON.stringify({ email, password }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          const error = (await response.json()) as { error?: string };
          console.error("❌ Login failed:", error);
          throw new Error(error.error || "Login failed");
        }

        const data = (await response.json()) as { token: string; user: ShopCustomer };
        console.log("✅ Login successful for:", email);
        setUser(data.user);

        // Store token
        localStorage.setItem("auth-token", data.token);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ------------------------------ Register ------------------------------ */
  const register = React.useCallback(async (data: unknown) => {
    setLoading(true);
    try {
      console.log("🔵 Starting registration...");
      const response = await fetch("/api/shop/auth/register", {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        console.error("❌ Registration failed:", error);
        throw new Error(error.error || "Registration failed");
      }

      const result = (await response.json()) as { token: string; user: ShopCustomer };
      console.log("✅ Registration successful, got user:", result.user?.email);
      console.log("✅ Got token:", result.token ? "Yes" : "No");

      setUser(result.user);

      // Store token
      localStorage.setItem("auth-token", result.token);
      console.log("✅ Token stored in localStorage");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ------------------------------- Logout ------------------------------- */
  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/shop/auth/logout", { method: "POST" });

      // Clear local state
      setUser(null);
      localStorage.removeItem("auth-token");

      // Redirect to home
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* --------------------------- Computed values -------------------------- */
  const isAuthenticated = React.useMemo(() => user !== null, [user]);

  /* --------------------------- Context value ---------------------------- */
  const value = React.useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      loading,
      login,
      logout,
      refreshSession,
      register,
      user,
    }),
    [user, loading, login, register, logout, refreshSession, isAuthenticated],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/* -------------------------------------------------------------------------- */
/*                                 Hook                                      */
/* -------------------------------------------------------------------------- */

export function useAuth(): AuthContextType {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
