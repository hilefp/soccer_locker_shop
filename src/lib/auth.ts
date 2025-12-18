// JWT-based authentication (replaces Better-Auth)

import {
  getCurrentUser as apiGetCurrentUser,
  getCurrentUserOrRedirect as apiGetCurrentUserOrRedirect,
} from "~/lib/api/auth-server";

// Re-export server-side auth functions for compatibility
export const getCurrentUser = apiGetCurrentUser;
export const getCurrentUserOrRedirect = apiGetCurrentUserOrRedirect;

// These exports maintain compatibility with existing code
export {
  clearAuthCookie,
  getRefreshToken,
  getSession,
  setAuthCookie,
  verifyToken,
} from "~/lib/api/auth-server";
