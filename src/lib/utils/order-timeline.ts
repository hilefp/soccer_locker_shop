import type { Order, OrderTimelineStep } from "~/lib/api/types";

/**
 * Status configuration for each order status
 */
const STATUS_CONFIG: Record<string, { label: string; description: string }> = {
  NEW: {
    label: "Order Placed",
    description: "Your order has been received",
  },
  PRINT: {
    label: "Ready to Print",
    description: "Your order has been printed",
  },
  PICKING_UP: {
    label: "Preparing",
    description: "Your order is being prepared",
  },
  PROCESSING: {
    label: "Processing",
    description: "Your order is being processed",
  },
  SHIPPING: {
    label: "Shipping",
    description: "Your order is being shipped",
  },
  DELIVERED: {
    label: "Delivered",
    description: "Your order has been delivered",
  },
  MISSING: {
    label: "Missing",
    description: "There is an issue with your order",
  },
  REFUND: {
    label: "Refund",
    description: "Your order has been refunded",
  },
};

/**
 * Maps order data to timeline steps for display
 */
export function getOrderTimeline(order: Order): OrderTimelineStep[] {
  const timeline: OrderTimelineStep[] = [];

  // Define the complete order flow (normal flow, excluding Missing/Refund)
  const statusFlow = [
    "NEW",
    "PRINT",
    "PICKING_UP",
    "PROCESSING",
    "SHIPPING",
    "DELIVERED",
  ];

  // Map status to timestamp field
  const statusTimestamps: Record<string, string | null> = {
    NEW: order.createdAt,
    PRINT: order.printedAt,
    PICKING_UP: order.pickedAt,
    PROCESSING: order.processedAt,
    SHIPPING: order.shippedAt,
    DELIVERED: order.deliveredAt,
    MISSING: order.updatedAt,
    REFUND: order.updatedAt,
  };

  // Handle special statuses (Missing, Refund) that break normal flow
  if (order.status === "MISSING" || order.status === "REFUND") {
    // Show all completed steps up to the point it became Missing/Refund
    statusFlow.forEach((status) => {
      const timestamp = statusTimestamps[status];
      if (timestamp) {
        const config = STATUS_CONFIG[status] || {
          label: status.replace(/_/g, " "),
          description: "",
        };

        timeline.push({
          status: status.toLowerCase(),
          label: config.label,
          description: config.description,
          date: formatDate(timestamp),
          completed: true,
          isActive: false,
          trackingNumber: status === "SHIPPING" ? order.trackingNumber || undefined : undefined,
        });
      }
    });

    // Add the special status at the end
    const config = STATUS_CONFIG[order.status];
    timeline.push({
      status: order.status.toLowerCase(),
      label: config.label,
      description: config.description,
      date: formatDate(order.updatedAt),
      completed: true,
      isActive: true,
      trackingNumber: undefined,
    });

    return timeline;
  }

  // Find current status index for normal flow
  const currentStatusIndex = statusFlow.indexOf(order.status);

  // Build timeline for normal flow
  statusFlow.forEach((status, index) => {
    const config = STATUS_CONFIG[status] || {
      label: status.replace(/_/g, " "),
      description: "",
    };

    const timestamp = statusTimestamps[status];
    const completed = index <= currentStatusIndex && timestamp !== null;
    const isActive = index === currentStatusIndex;

    timeline.push({
      status: status.toLowerCase(),
      label: config.label,
      description: config.description,
      date: timestamp ? formatDate(timestamp) : null,
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
  const estimatedDate = new Date(createdDate);
  estimatedDate.setDate(estimatedDate.getDate() + 5); // Add 5 business days

  return estimatedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
