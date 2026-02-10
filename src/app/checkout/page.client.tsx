"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiDelete, apiPost } from "~/lib/api/client";
import type { CheckoutRequest, CheckoutResponse } from "~/lib/api/types";
import { useAuth } from "~/lib/hooks/use-auth";
import { useCart } from "~/lib/hooks/use-cart";
import { useSquarePayments } from "~/lib/hooks/use-square-payments";
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
import { Checkbox } from "~/ui/primitives/checkbox";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                           Address Form Fields                              */
/* -------------------------------------------------------------------------- */

function AddressFields({
  errors,
  prefix,
  register,
}: {
  errors: Record<string, { message?: string }> | undefined;
  prefix: "billing" | "shipping";
  register: ReturnType<typeof useForm<CheckoutFormData>>["register"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.firstName`}>First Name *</Label>
          <Input
            id={`${prefix}.firstName`}
            placeholder="John"
            {...register(`${prefix}.firstName`)}
          />
          {errors?.firstName && (
            <p className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.lastName`}>Last Name *</Label>
          <Input
            id={`${prefix}.lastName`}
            placeholder="Doe"
            {...register(`${prefix}.lastName`)}
          />
          {errors?.lastName && (
            <p className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}.company`}>Company (Optional)</Label>
        <Input
          id={`${prefix}.company`}
          placeholder="Acme Inc"
          {...register(`${prefix}.company`)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}.email`}>Email *</Label>
        <Input
          id={`${prefix}.email`}
          placeholder="john@example.com"
          type="email"
          {...register(`${prefix}.email`)}
        />
        {errors?.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}.phone`}>Phone (Optional)</Label>
        <Input
          id={`${prefix}.phone`}
          placeholder="+1 (555) 123-4567"
          type="tel"
          {...register(`${prefix}.phone`)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}.address1`}>Address *</Label>
        <Input
          id={`${prefix}.address1`}
          placeholder="123 Main St"
          {...register(`${prefix}.address1`)}
        />
        {errors?.address1 && (
          <p className="text-sm text-destructive">
            {errors.address1.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}.address2`}>
          Apartment, suite, etc. (Optional)
        </Label>
        <Input
          id={`${prefix}.address2`}
          placeholder="Apt 4B"
          {...register(`${prefix}.address2`)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.city`}>City *</Label>
          <Input
            id={`${prefix}.city`}
            placeholder="New York"
            {...register(`${prefix}.city`)}
          />
          {errors?.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.state`}>State *</Label>
          <Input
            id={`${prefix}.state`}
            placeholder="NY"
            {...register(`${prefix}.state`)}
          />
          {errors?.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.country`}>Country *</Label>
          <Input
            id={`${prefix}.country`}
            placeholder="USA"
            {...register(`${prefix}.country`)}
          />
          {errors?.country && (
            <p className="text-sm text-destructive">
              {errors.country.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}.postalCode`}>Postal Code *</Label>
          <Input
            id={`${prefix}.postalCode`}
            placeholder="10001"
            {...register(`${prefix}.postalCode`)}
          />
          {errors?.postalCode && (
            <p className="text-sm text-destructive">
              {errors.postalCode.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Checkout Page Client                              */
/* -------------------------------------------------------------------------- */

export function CheckoutPageClient() {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { cardRef, isReady, error: squareError, tokenize } = useSquarePayments();

  const [cartSyncing, setCartSyncing] = React.useState(false);
  const [cartSynced, setCartSynced] = React.useState(false);
  const [orderComplete, setOrderComplete] = React.useState(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      billing: {
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
      shipToDifferentAddress: false,
      shipping: {},
    },
    resolver: zodResolver(checkoutSchema),
  });

  const shipToDifferent = watch("shipToDifferentAddress");

  /* ---------------------- Cart sync on mount ----------------------------- */
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  React.useEffect(() => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    let cancelled = false;

    async function syncCart() {
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
          setCartSynced(true);
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
  }, []);

  /* ---------------------- Form submission -------------------------------- */
  const onSubmit = async (data: CheckoutFormData) => {
    try {
      const sourceId = await tokenize();

      const payload: CheckoutRequest = {
        billingFirstName: data.billing.firstName,
        billingLastName: data.billing.lastName,
        billingCompany: data.billing.company || undefined,
        billingCountry: data.billing.country,
        billingAddress1: data.billing.address1,
        billingAddress2: data.billing.address2 || undefined,
        billingCity: data.billing.city,
        billingState: data.billing.state,
        billingPostalCode: data.billing.postalCode,
        billingPhone: data.billing.phone || undefined,
        billingEmail: data.billing.email,
        ...(data.shipToDifferentAddress && data.shipping
          ? {
              shippingFirstName: data.shipping.firstName,
              shippingLastName: data.shipping.lastName,
              shippingCompany: data.shipping.company || undefined,
              shippingCountry: data.shipping.country,
              shippingAddress1: data.shipping.address1,
              shippingAddress2: data.shipping.address2 || undefined,
              shippingCity: data.shipping.city,
              shippingState: data.shipping.state,
              shippingPostalCode: data.shipping.postalCode,
              shippingPhone: data.shipping.phone || undefined,
              shippingEmail: data.shipping.email || undefined,
            }
          : {}),
        sourceId,
      };

      const result = await apiPost<CheckoutResponse>(
        "/api/shop/checkout",
        payload,
      );

      clearCart();
      setOrderComplete(true);
      setOrderId(result.orderId);
      toast.success("Order placed successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Checkout failed. Please try again.",
      );
      console.error("Checkout error:", err);
    }
  };

  /* ---------------------- Order confirmation view ------------------------ */
  if (orderComplete) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold">Order Confirmed!</h2>
            {orderId && (
              <p className="mb-2 text-sm text-muted-foreground">
                Order #{orderId}
              </p>
            )}
            <p className="mb-8 text-muted-foreground">
              Thank you for your purchase. You will receive a confirmation email
              shortly.
            </p>
            <Link href="/">
              <Button size="lg">Continue Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent>
                <AddressFields
                  errors={
                    errors.billing as
                      | Record<string, { message?: string }>
                      | undefined
                  }
                  prefix="billing"
                  register={register}
                />
              </CardContent>
            </Card>

            {/* Shipping toggle */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={shipToDifferent}
                id="shipToDifferentAddress"
                onCheckedChange={(checked) =>
                  setValue("shipToDifferentAddress", checked === true)
                }
              />
              <Label htmlFor="shipToDifferentAddress">
                Ship to a different address
              </Label>
            </div>

            {/* Shipping Address (conditional) */}
            {shipToDifferent && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressFields
                    errors={
                      errors.shipping as
                        | Record<string, { message?: string }>
                        | undefined
                    }
                    prefix="shipping"
                    register={register}
                  />
                </CardContent>
              </Card>
            )}

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="min-h-[90px] rounded-md"
                  id="card-container"
                  ref={cardRef}
                />
                {squareError && (
                  <p className="mt-2 text-sm text-destructive">
                    {squareError}
                  </p>
                )}
                {!isReady && !squareError && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading payment form...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              className="w-full"
              disabled={isSubmitting || !cartSynced}
              size="lg"
              type="submit"
            >
              {isSubmitting
                ? "Processing..."
                : `Pay $${subtotal.toFixed(2)}`}
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
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-base font-semibold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
