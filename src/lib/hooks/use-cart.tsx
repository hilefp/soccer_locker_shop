"use client";

import * as React from "react";

import type { CartItem } from "~/ui/components/cart";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface CartContextType {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /**
   * Stable id for this cart's checkout, minted when the cart stops being empty
   * and dropped when it is cleared. Persisted beside the cart so a reload or a
   * second tab keeps the same one.
   *
   * Empty string while the cart is empty. Not sent to the backend yet — the
   * checkout DTO rejects unknown fields.
   */
  checkoutId: string;
  clearCart: () => void;
  itemCount: number;
  items: CartItem[];
  removeItem: (id: string) => void;
  subtotal: number;
  updateQuantity: (id: string, quantity: number) => void;
}

/* -------------------------------------------------------------------------- */
/*                                Context                                     */
/* -------------------------------------------------------------------------- */

const CartContext = React.createContext<CartContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*                         Local-storage helpers                              */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "cart";
const CHECKOUT_ID_KEY = "cart-checkout-id";
const DEBOUNCE_MS = 500;

const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as CartItem[];
    }
  } catch (err) {
    console.error("Failed to load cart:", err);
  }
  return [];
};

const loadCheckoutIdFromStorage = (): string => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CHECKOUT_ID_KEY) ?? "";
  } catch (err) {
    console.error("Failed to load the checkout id:", err);
    return "";
  }
};

/* -------------------------------------------------------------------------- */
/*                          Cart-item identity                                */
/* -------------------------------------------------------------------------- */

// Two cart lines can share the same product/variant but carry different player
// customization (e.g. one jersey per child). To keep them as separate lines we
// fold a stable, key-order-independent signature of the custom fields into the
// line id: identical customization collapses into one line (quantity +1) while
// different customization produces a distinct line.
const customFieldsSignature = (fields?: Record<string, unknown>): string => {
  if (!fields) return "";
  const keys = Object.keys(fields).sort();
  if (keys.length === 0) return "";
  const ordered = keys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = fields[key];
    return acc;
  }, {});
  return JSON.stringify(ordered);
};

const cartItemKey = (item: Omit<CartItem, "quantity">): string => {
  const sig = customFieldsSignature(item.customFields);
  return sig ? `${item.id}::${sig}` : item.id;
};

/* -------------------------------------------------------------------------- */
/*                               Provider                                     */
/* -------------------------------------------------------------------------- */

export function CartProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = React.useState<CartItem[]>(loadCartFromStorage);
  const [checkoutId, setCheckoutId] = React.useState<string>(
    loadCheckoutIdFromStorage,
  );

  /* ---------------------- Checkout id for this cart --------------------- */
  // Invariant: a non-empty cart always carries a checkout id, an empty one
  // never does. Kept as an effect rather than minted inside addItem so a cart
  // restored from storage (or one saved before this field existed) also gets
  // one.
  React.useEffect(() => {
    if (items.length === 0) return;
    if (checkoutId) return;

    const next = crypto.randomUUID();
    setCheckoutId(next);
    try {
      localStorage.setItem(CHECKOUT_ID_KEY, next);
    } catch (err) {
      console.error("Failed to save the checkout id:", err);
    }
  }, [items.length, checkoutId]);

  /* -------------------- Persist to localStorage (debounced) ------------- */
  const saveTimeout = React.useRef<null | ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error("Failed to save cart:", err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [items]);

  /* ----------------------------- Actions -------------------------------- */
  const addItem = React.useCallback(
    (newItem: Omit<CartItem, "quantity">, qty = 1) => {
      if (qty <= 0) return;
      // Distinguish lines by customization so two children with the same
      // product/size stay on separate lines instead of merging to quantity 2.
      const id = cartItemKey(newItem);
      setItems((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (existing) {
          return prev.map((i) =>
            i.id === id ? { ...i, quantity: i.quantity + qty } : i,
          );
        }
        return [...prev, { ...newItem, id, quantity: qty }];
      });
    },
    [],
  );

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      // If removing a package header, also remove all its sub-items
      if (target?.isPackageHeader) {
        return prev.filter((i) => i.id !== id && i.packageId !== id);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const updateQuantity = React.useCallback((id: string, qty: number) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      return prev.flatMap((i) => {
        if (i.id === id) {
          if (qty <= 0) return [];
          if (qty === i.quantity) return [i];
          return [{ ...i, quantity: qty }];
        }
        // If this is a sub-item of the package header being updated, scale its qty
        if (target?.isPackageHeader && i.packageId === id) {
          if (qty <= 0) return [];
          const scaledQty = Math.round(i.quantity * (qty / target.quantity));
          return [{ ...i, quantity: scaledQty }];
        }
        return [i];
      });
    });
  }, []);

  // A cleared cart retires its checkout id; the next cart mints a fresh one.
  const clearCart = React.useCallback(() => {
    setItems([]);
    setCheckoutId("");
    try {
      localStorage.removeItem(CHECKOUT_ID_KEY);
    } catch (err) {
      console.error("Failed to clear the checkout id:", err);
    }
  }, []);

  /* --------------------------- Derived data ----------------------------- */
  // Exclude virtual package header rows from the physical item count
  const itemCount = React.useMemo(
    () => items.filter((i) => !i.isPackageHeader).reduce((t, i) => t + i.quantity, 0),
    [items],
  );

  // Sub-items have price 0; only the package header carries the price
  const subtotal = React.useMemo(
    () => items.reduce((t, i) => t + i.price * i.quantity, 0),
    [items],
  );

  /* ----------------------------- Context value -------------------------- */
  const value = React.useMemo<CartContextType>(
    () => ({
      addItem,
      checkoutId,
      clearCart,
      itemCount,
      items,
      removeItem,
      subtotal,
      updateQuantity,
    }),
    [
      items,
      checkoutId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
    ],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

/* -------------------------------------------------------------------------- */
/*                                 Hook                                      */
/* -------------------------------------------------------------------------- */

export function useCart(): CartContextType {
  const ctx = React.use(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
