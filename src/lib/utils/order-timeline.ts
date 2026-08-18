import type { Order, OrderTimelineStep } from "~/lib/api/types";
import { getOrderStatusLabel } from "~/lib/utils/order-status";

/**
 * Step descriptions for each order status. Labels come from
 * ORDER_STATUS_LABELS so the timeline and the status badges can never drift.
 */
const STATUS_DESCRIPTIONS: Record<string, string> = {
  NEW: "We've received your order and it's in line for production",
  PRINT: "Your order has been sent to our production team and will be prepared soon",
  PICKING_UP: "Our team is picking each item in your order from inventory",
  PROCESSING: "We're applying logos, names, and numbers to your uniforms",
  PARTIALLY_SHIPPED: "Part of your order is on its way — the rest is still in production",
  SHIPPING: "Your order is on its way — see your tracking number below",
  DELIVERED: "Your order has been delivered",
  REFUND: "Your order has been refunded",
};

/**
 * Extra italic note shown under a step's description. Kept separate from
 * STATUS_DESCRIPTIONS so the description stays the factual "what is happening"
 * line and the note carries expectation-setting copy.
 */
const STATUS_NOTES: Record<string, string> = {
  PRINT: "This is the stage that takes the longest — thank you for your patience.",
};

function getStepConfig(status: string) {
  return {
    label: getOrderStatusLabel(status),
    description: STATUS_DESCRIPTIONS[status] ?? "",
    note: STATUS_NOTES[status],
  };
}

/**
 * Maps order data to timeline steps for display
 */
export function getOrderTimeline(order: Order): OrderTimelineStep[] {
  const timeline: OrderTimelineStep[] = [];

  // MISSING is an internal inventory status and is never surfaced to customers.
  // Keep the order at PRINT and show the rest of the flow as upcoming steps.
  const status = order.status === "MISSING" ? "PRINT" : order.status;

  // Define the complete order flow (normal flow, excluding Refund)
  // Include PARTIALLY_SHIPPED step only if the order has that status
  const hasPartiallyShipped = status === "PARTIALLY_SHIPPED" || !!order.partiallyShippedAt;
  const statusFlow = [
    "NEW",
    "PRINT",
    "PICKING_UP",
    "PROCESSING",
    ...(hasPartiallyShipped ? ["PARTIALLY_SHIPPED"] : []),
    "SHIPPING",
    "DELIVERED",
  ];

  // Map status to timestamp field
  const statusTimestamps: Record<string, string | null> = {
    NEW: order.createdAt,
    PRINT: order.printedAt,
    PICKING_UP: order.pickedAt,
    PROCESSING: order.processedAt,
    PARTIALLY_SHIPPED: order.partiallyShippedAt,
    SHIPPING: order.shippedAt,
    DELIVERED: order.deliveredAt,
    REFUND: order.updatedAt,
  };

  // Handle the Refund status, which breaks the normal flow
  if (status === "REFUND") {
    // Show all completed steps up to the point it became Refund
    statusFlow.forEach((status) => {
      const timestamp = statusTimestamps[status];
      if (timestamp) {
        const config = getStepConfig(status);

        timeline.push({
          status: status.toLowerCase(),
          label: config.label,
          description: config.description,
          note: config.note,
          date: formatDate(timestamp),
          completed: true,
          isActive: false,
          trackingNumber: status === "SHIPPING" ? order.trackingNumber || undefined : undefined,
        });
      }
    });

    // Add the special status at the end
    const config = getStepConfig(status);
    timeline.push({
      status: status.toLowerCase(),
      label: config.label,
      description: config.description,
      note: config.note,
      date: formatDate(order.updatedAt),
      completed: true,
      isActive: true,
      trackingNumber: undefined,
    });

    return timeline;
  }

  // Find current status index for normal flow
  const currentStatusIndex = statusFlow.indexOf(status);

  // Build timeline for normal flow
  statusFlow.forEach((status, index) => {
    const config = getStepConfig(status);

    const timestamp = statusTimestamps[status];
    const completed = index <= currentStatusIndex && timestamp !== null;
    const isActive = index === currentStatusIndex;

    timeline.push({
      status: status.toLowerCase(),
      label: config.label,
      description: config.description,
      note: config.note,
      date: timestamp && index <= currentStatusIndex ? formatDate(timestamp) : null,
      completed,
      isActive,
      trackingNumber: status === "SHIPPING" ? order.trackingNumber || undefined : undefined,
    });
  });

  return timeline;
}

/**
 * Formats ISO date string to readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Calculates estimated delivery date (3-5 business days from order creation)
 */
export function getEstimatedDelivery(order: Order): string {
  if (order.deliveredAt) {
    return "Delivered";
  }

  const createdDate = new Date(order.createdAt);
  const month = createdDate.getMonth(); // 0-indexed: 0=Jan, 11=Dec
  const isOffSeason = month >= 5 && month <= 10; // Jun (5) to Nov (10)
  const daysToAdd = isOffSeason ? 56 : 21; // Dec-May: 21 days, Jun-Nov: 56 days

  const estimatedDate = new Date(createdDate);
  estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);

  return estimatedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
