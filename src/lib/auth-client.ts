"use client";

// Client-side authentication - now using JWT instead of better-auth

// Re-export auth functions from API client
export {
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  signUp,
  useCurrentUser,
  useCurrentUserOrRedirect,
  useSession,
} from "~/lib/api/auth-client";

// Import for creating objects
import {
  signIn as apiSignInFn,
  signInSocial,
  signOut as apiSignOut,
  signUp as apiSignUp,
  useSession as apiUseSession,
} from "~/lib/api/auth-client";

// Export signIn object with email and social properties
export const signIn = {
  email: apiSignInFn,
  social: signInSocial,
};

export const authClient = {
  signIn: apiSignIn,
  signOut: apiSignOut,
  signUp: apiSignUp,
  useSession: apiUseSession,
};

// Placeholder for twoFactor - now handled by external API
// This is here for backwards compatibility
export const twoFactor = {
  enable: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  disable: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  verify: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  verifyBackupCode: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  verifyTotp: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  generateBackupCodes: async (...args: any[]): Promise<{ data: any; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: null, error: "2FA should be handled by external API" };
  },
  getTwoFactorStatus: async (...args: any[]): Promise<{ data: { enabled: boolean }; error?: any }> => {
    console.warn("2FA is now handled by external API");
    return { data: { enabled: false } };
  },
};
