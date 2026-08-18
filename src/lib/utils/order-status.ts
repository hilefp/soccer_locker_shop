import type { OrderStatus } from "~/lib/api/types";

/**
 * Customer-facing labels for each order status.
 *
 * The API returns the raw enum, which is shared with the warehouse admin app —
 * it will never send a display label, and the admin wording is not always the
 * wording a customer should see (e.g. PICKING_UP is "Picking Up" to the
 * warehouse but "Preparing" to the customer). Every customer-facing status
 * render must go through `getOrderStatusLabel`.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  NEW: "Order Placed",
  PRINT: "In Production Queue",
  PICKING_UP: "Gathering Your Items",
  PROCESSING: "Customizing Your Order",
  PARTIALLY_SHIPPED: "Partially Shipped",
  SHIPPING: "Shipped",
  DELIVERED: "Delivered",
  // MISSING is an internal inventory state. Customers see it as the previous
  // step so a stock issue we are already handling doesn't read as a problem
  // with their order.
  MISSING: "In Production Queue",
  REFUND: "Refund",
  FAILED: "Payment Failed",
};

/**
 * Resolves a raw order status to its customer-facing label.
 *
 * An unmapped status — a value a future backend release adds before this map
 * catches up — degrades to its humanized raw value ("SOME_NEW_STATUS" becomes
 * "Some New Status") rather than rendering `undefined`.
 */
export function getOrderStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";

  return ORDER_STATUS_LABELS[status as OrderStatus] ?? humanizeStatus(status);
}

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
