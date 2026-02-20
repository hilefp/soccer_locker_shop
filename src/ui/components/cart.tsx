import { cn } from "~/lib/cn";

import { CartClient } from "./cart-client";

export interface CartItem {
  category: string;
  clubId?: string;
  id: string;
  image: string;
  name: string;
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
