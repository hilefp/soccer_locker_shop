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
    console.error("Failed to fetch order:", error);
    return null;
  }
}
