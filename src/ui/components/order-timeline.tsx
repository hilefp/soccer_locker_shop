import {
  Circle,
  Package,
  PackageCheck,
  ShoppingCart,
  Truck,
  Printer,
  ClipboardList,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { cn } from "~/lib/cn";
import type { OrderTimelineStep } from "~/lib/api/types";

interface OrderTimelineProps {
  timeline: OrderTimelineStep[];
}

const STATUS_CONFIG = {
  new: {
    icon: ShoppingCart,
  },
  print: {
    icon: Printer,
  },
  picking_up: {
    icon: ClipboardList,
  },
  processing: {
    icon: Package,
  },
  shipping: {
    icon: Truck,
  },
  delivered: {
    icon: PackageCheck,
  },
  missing: {
    icon: AlertCircle,
  },
  refund: {
    icon: DollarSign,
  },
};

export function OrderTimeline({ timeline }: OrderTimelineProps) {
  return (
    <div className="relative space-y-6">
      {timeline.map((item, index) => {
        const config =
          STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || {
            icon: Circle,
            label: item.label,
            description: item.description,
          };
        const Icon = config.icon;
        const isLast = index === timeline.length - 1;
        const isCompleted = item.completed;
        const isActive = item.isActive;

        return (
          <div className="relative flex gap-4" key={index}>
            {/* Timeline line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-5 top-10 h-full w-0.5",
                  isCompleted
                    ? "bg-primary"
                    : "bg-border dark:bg-neutral-800"
                )}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={cn(
                  `
                    flex h-10 w-10 items-center justify-center rounded-full
                    border-2 transition-all duration-200
                  `,
                  isCompleted
                    ? `
                      border-primary bg-primary text-primary-foreground
                      shadow-lg shadow-primary/20
                    `
                    : isActive
                      ? `
                        animate-pulse border-primary bg-background
                        text-primary
                      `
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-6 pt-1">
              <div
                className={cn(
                  "mb-1 font-semibold",
                  isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </div>
              <div className="mb-1 text-sm text-muted-foreground">
                {item.description}
              </div>
              {item.date && (
                <div className="text-xs text-muted-foreground">
                  {item.date}
                </div>
              )}
              {item.trackingNumber && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">
                    Tracking Number:{" "}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {item.trackingNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
