"use client";

// Client-side authentication - now using shop authentication system

// Re-export auth functions from API client
export {
  useAuth,
  useCurrentUser,
  useCurrentUserOrRedirect,
  useRequireAuth,
  useSession,
} from "~/lib/api/auth-client";

// Export signOut as a function that uses the hook
export async function signOut(): Promise<void> {
  // Clear local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-token");
  }
  // Call logout endpoint
  await fetch("/api/auth/logout", { method: "POST" });
  // Redirect to home
  window.location.href = "/";
}

// For backwards compatibility with old code
import { useAuth } from "~/lib/api/auth-client";

// Create a compatibility wrapper for old signIn.email() calls
export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    // This won't work directly since useAuth is a hook
    // Old code should be updated to use useAuth hook instead
    throw new Error("Please use the useAuth hook for authentication");
  },
  social: {
    github: () => {
      throw new Error("OAuth not implemented in shop authentication");
    },
    google: () => {
      throw new Error("OAuth not implemented in shop authentication");
    },
  },
};

export const authClient = {
  signIn,
  signOut: async () => {
    throw new Error("Please use the useAuth hook's logout method");
  },
  signUp: async () => {
    throw new Error("Please use the useAuth hook's register method");
  },
  useSession: useAuth,
};

// Placeholder for twoFactor - not implemented in shop auth
export const twoFactor = {
  enable: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  disable: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  verify: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  verifyBackupCode: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  verifyTotp: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  generateBackupCodes: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: null, error: "2FA not implemented" };
  },
  getTwoFactorStatus: async (...args: any[]): Promise<{ data: { enabled: boolean }; error?: any }> => {
    console.warn("2FA is not implemented in shop authentication");
    return { data: { enabled: false } };
  },
};
