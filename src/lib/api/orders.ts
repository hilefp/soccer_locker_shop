import { apiGet } from "~/lib/api/client";
import { apiGetServer } from "~/lib/api/client-server";
import type { Order } from "~/lib/api/types";

/**
 * Get order by order number (client-side)
 */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  try {
    // Backend returns raw order object, not wrapped in ApiResponse
    const order = await apiGet<Order>(
      `/api/shop/orders/number/${orderNumber}`,
    );

    return order;
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return null;
  }
}

/**
 * Get order by order number (server-side)
 */
export async function getOrderByNumberServer(
  orderNumber: string,
): Promise<Order | null> {
  try {
    // Backend returns raw order object, not wrapped in ApiResponse
    const order = await apiGetServer<Order>(
      `/api/shop/orders/number/${orderNumber}`,
    );

    return order;
  } catch (error) {
    // Only a backend 404 means "no such order". Anything else — a 429 from the
    // shared throttle, a 5xx, a timeout — is "we don't know", and must not be
    // reported as missing: checkout recovery reads 404 as "order gone" and
    // offers the card form again (payment audit F-04).
    const status =
      (error as { status?: number; statusCode?: number })?.status ??
      (error as { statusCode?: number })?.statusCode;
    if (status === 404) return null;
    throw error;
  }
}
