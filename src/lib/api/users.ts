// Users API client

import { apiGetServer, apiPatchServer } from "~/lib/api/client-server";
import type { User } from "~/lib/api/types";

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const user = await apiGetServer<User>(`/users/${userId}`);
    return user;
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<User>,
): Promise<User> {
  return apiPatchServer<User>(`/users/${userId}`, data);
}
