// Payments API client (Polar integration)

import { apiGetServer } from "~/lib/api/client-server";
import type { PolarCustomer, PolarSubscription } from "~/lib/api/types";

/**
 * Get customer state for a user
 */
export async function getCustomerState(
  userId: string,
): Promise<PolarCustomer | null> {
  try {
    const customer = await apiGetServer<PolarCustomer>(
      `/payments/customers/${userId}`,
    );
    return customer;
  } catch (error) {
    console.error(
      `Failed to fetch customer state for user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * Get user subscriptions
 */
export async function getUserSubscriptions(
  userId: string,
): Promise<PolarSubscription[]> {
  try {
    const subscriptions = await apiGetServer<PolarSubscription[]>(
      `/payments/subscriptions/${userId}`,
    );
    return subscriptions;
  } catch (error) {
    console.error(
      `Failed to fetch subscriptions for user ${userId}:`,
      error,
    );
    return [];
  }
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(
  userId: string,
): Promise<boolean> {
  const subscriptions = await getUserSubscriptions(userId);
  return subscriptions.some((sub) => sub.status === "active");
}
