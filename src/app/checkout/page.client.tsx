"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiDelete, apiPost } from "~/lib/api/client";
import type { CheckoutRequest, CheckoutResponse } from "~/lib/api/types";
import { useAuth } from "~/lib/hooks/use-auth";
import { useCart } from "~/lib/hooks/use-cart";
import {
  checkoutSchema,
  type CheckoutFormData,
} from "~/lib/validations/checkout";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";
import { Textarea } from "~/ui/primitives/textarea";

/* -------------------------------------------------------------------------- */
/*                           Shipping Calculator                              */
/* -------------------------------------------------------------------------- */

function calculateShipping(totalItems: number): number {
  if (totalItems <= 0) return 0;
  if (totalItems <= 2) return 7.99;
  if (totalItems <= 12) return 11.99;
  return 14.99;
}

/* -------------------------------------------------------------------------- */
/*                          Checkout Page Client                              */
/* -------------------------------------------------------------------------- */

export function CheckoutPageClient() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount } = useCart();

  const [cartSyncing, setCartSyncing] = React.useState(false);

  const shippingCost = calculateShipping(itemCount);
  const total = subtotal + shippingCost;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      shipping: {
        firstName: user?.profile?.firstName || "",
        lastName: user?.profile?.lastName || "",
        company: user?.profile?.companyName || "",
        email: user?.email || "",
        phone: user?.profile?.phone || "",
        address1: user?.profile?.address || "",
        address2: "",
        city: user?.profile?.city || "",
        state: user?.profile?.state || "",
        country: user?.profile?.country || "",
        postalCode: user?.profile?.postalCode || "",
      },
      notes: "",
    },
    resolver: zodResolver(checkoutSchema),
  });

  /* ---------------------- Cart sync on mount ----------------------------- */
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  React.useEffect(() => {
    if (authLoading || !user) return;

    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    let cancelled = false;

    async function syncCart() {
        console.log("🔑 token in localStorage:", localStorage.getItem("auth-token"));

      setCartSyncing(true);
      try {
        await apiDelete("/api/shop/cart");

        for (const item of currentItems) {
          if (cancelled) return;
          const productVariantId = item.variantId || item.id;
          await apiPost("/api/shop/cart/items", {
            productVariantId,
            quantity: item.quantity,
          });
        }

        if (!cancelled) {
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            "Failed to prepare your cart for checkout. Please try again.",
          );
          console.error("Cart sync error:", err);
        }
      } finally {
        if (!cancelled) setCartSyncing(false);
      }
    }

    void syncCart();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  /* ---------------------- Form submission -------------------------------- */
  const onSubmit = async (data: CheckoutFormData) => {
    try {
      // Use the clubId from the first cart item (all items belong to the same club)
      const clubId = items.find((i) => i.clubId)?.clubId;

      const payload: CheckoutRequest = {
        shipping: {
          name: `${data.shipping.firstName} ${data.shipping.lastName}`.trim(),
          phone: data.shipping.phone || undefined,
          address1: data.shipping.address1,
          address2: data.shipping.address2 || undefined,
          city: data.shipping.city,
          state: data.shipping.state,
          postalCode: data.shipping.postalCode,
          country: data.shipping.country,
        },
        clubId,
        notes: data.notes || undefined,
      };

      const result = await apiPost<CheckoutResponse>(
        "/api/shop/checkout",
        payload,
      );

      // Redirect to Square hosted checkout page
      window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.",
      );
      console.error("Checkout error:", err);
    }
  };

  /* ---------------------- Empty cart view -------------------------------- */
  if (items.length === 0 && !cartSyncing) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Your cart is empty</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Add some items to your cart before checking out.
            </p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------- Cart syncing view ------------------------------ */
  if (cartSyncing) {
    return (
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 md:px-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Preparing your order...</p>
      </div>
    );
  }

  /* ---------------------- Main checkout view ----------------------------- */
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column — Form */}
        <div className="lg:col-span-2">
          <form
            className="space-y-6"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.firstName">First Name *</Label>
                      <Input
                        id="shipping.firstName"
                        placeholder="John"
                        {...register("shipping.firstName")}
                      />
                      {errors.shipping?.firstName && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.lastName">Last Name *</Label>
                      <Input
                        id="shipping.lastName"
                        placeholder="Doe"
                        {...register("shipping.lastName")}
                      />
                      {errors.shipping?.lastName && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shipping.company">Company (Optional)</Label>
                    <Input
                      id="shipping.company"
                      placeholder="Acme Inc"
                      {...register("shipping.company")}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shipping.email">Email *</Label>
                    <Input
                      id="shipping.email"
                      placeholder="john@example.com"
                      type="email"
                      {...register("shipping.email")}
                    />
                    {errors.shipping?.email && (
                      <p className="text-sm text-destructive">
                        {errors.shipping.email.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shipping.phone">Phone (Optional)</Label>
                    <Input
                      id="shipping.phone"
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                      {...register("shipping.phone")}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shipping.address1">Address *</Label>
                    <Input
                      id="shipping.address1"
                      placeholder="123 Main St"
                      {...register("shipping.address1")}
                    />
                    {errors.shipping?.address1 && (
                      <p className="text-sm text-destructive">
                        {errors.shipping.address1.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shipping.address2">
                      Apartment, suite, etc. (Optional)
                    </Label>
                    <Input
                      id="shipping.address2"
                      placeholder="Apt 4B"
                      {...register("shipping.address2")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.city">City *</Label>
                      <Input
                        id="shipping.city"
                        placeholder="New York"
                        {...register("shipping.city")}
                      />
                      {errors.shipping?.city && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.city.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.state">State *</Label>
                      <Input
                        id="shipping.state"
                        placeholder="NY"
                        {...register("shipping.state")}
                      />
                      {errors.shipping?.state && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.state.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.country">Country *</Label>
                      <Input
                        id="shipping.country"
                        placeholder="USA"
                        {...register("shipping.country")}
                      />
                      {errors.shipping?.country && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.country.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shipping.postalCode">
                        Postal Code *
                      </Label>
                      <Input
                        id="shipping.postalCode"
                        placeholder="10001"
                        {...register("shipping.postalCode")}
                      />
                      {errors.shipping?.postalCode && (
                        <p className="text-sm text-destructive">
                          {errors.shipping.postalCode.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Order Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="notes">
                    Special instructions for your order
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g. Leave at front door, gift wrap, special sizing notes..."
                    rows={4}
                    {...register("notes")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              className="w-full"
              disabled={isSubmitting || cartSyncing}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to payment...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Proceed to Payment — ${total.toFixed(2)}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right column — Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div className="flex gap-3" key={item.id}>
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      alt={item.name}
                      className="object-cover"
                      fill
                      sizes="64px"
                      src={item.image}
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <p className="line-clamp-2 text-sm font-medium">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-sm font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Shipping ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
                <span className="font-medium">${shippingCost.toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-base font-semibold">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  You will be redirected to Square&apos;s secure payment page to
                  complete your purchase.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
