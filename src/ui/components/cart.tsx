import { cn } from "~/lib/cn";

import { CartClient } from "./cart-client";

export interface CartItem {
  category: string;
  clubId?: string;
  clubPackageId?: string;    // Real ClubPackage ID (header uses unique instanceId as id)
  clubProductId?: string;
  customFields?: Record<string, any>;
  id: string;
  image: string;
  isPackageHeader?: boolean; // Virtual row grouping package sub-items
  name: string;
  packageId?: string;        // Links sub-items to their package header
  packageName?: string;      // Display name of the parent package
  price: number;
  quantity: number;
  variantId?: string;
}

interface CartProps {
  className?: string;
}

export function Cart({ className }: CartProps) {
  return (
    <div className={cn("relative", className)}>
      <CartClient className={cn("", className)} />
    </div>
  );
}
