"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShoppingCart,
  Tag,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiDelete, apiGet, apiPost, getApiErrorMessage } from "~/lib/api/client";
import type {
  CheckoutRequest,
  CheckoutResponse,
  ConfirmCheckoutResponse,
  PayCheckoutRequest,
  PayCheckoutResponse,
  RushFeeResponse,
} from "~/lib/api/types";
import { useAuth } from "~/lib/hooks/use-auth";
import { useCart } from "~/lib/hooks/use-cart";
import {
  useSquarePayments,
  type SquareBillingContact,
} from "~/lib/hooks/use-square-payments";
import { getOrderStatusLabel } from "~/lib/utils/order-status";
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
import { Switch } from "~/ui/primitives/switch";
import { Textarea } from "~/ui/primitives/textarea";

/* -------------------------------------------------------------------------- */
/*                           Shipping Calculator                              */
/* -------------------------------------------------------------------------- */

function calculateShipping(totalItems: number): number {
  if (totalItems <= 0) return 0;
  return 11.99;
}

/* -------------------------------------------------------------------------- */
/*                          Checkout Page Client                              */
/* -------------------------------------------------------------------------- */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PaymentSuccess {
  orderNumber: string;
  status: string;
  total: number | string;
}

export function CheckoutPageClient() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount, clearCart } = useCart();

  const [cartSyncing, setCartSyncing] = React.useState(false);
  const [step, setStep] = React.useState<"details" | "success">("details");
  const [order, setOrder] = React.useState<CheckoutResponse | null>(null);
  const [payState, setPayState] = React.useState<
    "idle" | "paying" | "verifying"
  >("idle");
  const [payError, setPayError] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<PaymentSuccess | null>(
    null,
  );

  // Kept for retries: ORDER_EXPIRED recreates the order from the same payload,
  // and verifyBuyer needs the buyer's contact data on every (re)tokenization
  const checkoutPayloadRef = React.useRef<CheckoutRequest | null>(null);
  const billingContactRef = React.useRef<SquareBillingContact>({});
  // Fingerprint of the payload the current order was created with: a retry
  // after a declined card reuses the order, but any edit creates a fresh one
  const orderPayloadKeyRef = React.useRef<null | string>(null);

  const pollCancelledRef = React.useRef(false);
  React.useEffect(
    () => () => {
      pollCancelledRef.current = true;
    },
    [],
  );

  const {
    cardEntered,
    cardHasError,
    status: squareStatus,
    tokenize,
    verifyBuyer,
  } = useSquarePayments({
    enabled: step === "details" && !cartSyncing && items.length > 0,
  });
  const [rushFeeAmount, setRushFeeAmount] = React.useState(0);
  const [rushDescription, setRushDescription] = React.useState("");
  const [rushFeeEnabled, setRushFeeEnabled] = React.useState(false);
  const [couponCode, setCouponCode] = React.useState("");
  const [couponValidating, setCouponValidating] = React.useState(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    type: string;
    description: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
        country: "US",
        postalCode: user?.profile?.postalCode || "",
      },
      notes: "",
      isRushOrder: false,
    },
    resolver: zodResolver(checkoutSchema),
  });

  const isRushOrder = watch("isRushOrder");

  // All cart items belong to the same club
  const clubId = React.useMemo(
    () => items.find((i) => i.clubId)?.clubId,
    [items],
  );

  // The rush option only exists when the club has it enabled and a fee is set
  const rushAvailable = rushFeeEnabled && rushFeeAmount > 0;

  // Never let a stale/persisted rush flag survive once the option is hidden,
  // otherwise the displayed total would include a fee the backend won't charge
  React.useEffect(() => {
    if (!rushAvailable && isRushOrder) {
      setValue("isRushOrder", false);
    }
  }, [rushAvailable, isRushOrder, setValue]);

  const TAX_RATE = 0.07;
  const baseShippingCost = calculateShipping(itemCount);
  const shippingCost =
    appliedCoupon?.type === "FREE_SHIPPING" ? 0 : baseShippingCost;
  const tax = subtotal * TAX_RATE;
  const rushFee = rushAvailable && isRushOrder ? rushFeeAmount : 0;
  const total = subtotal + tax + shippingCost + rushFee;

  /* ---------------------- Coupon validation ----------------------------- */
  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;

    setCouponValidating(true);
    try {
      const result = await apiPost<{
        valid: boolean;
        type: string;
        description: string;
      }>("/api/shop/checkout/validate-coupon", { code });

      setAppliedCoupon({ code, type: result.type, description: result.description });
      toast.success(`Coupon "${code}" applied!`);
    } catch (err: any) {
      const msg =
        err?.data?.message ?? err?.response?._data?.message ?? "Invalid coupon code.";
      toast.error(typeof msg === "string" ? msg : "Invalid coupon code.");
      setAppliedCoupon(null);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  /* ---------------------- Cart sync on mount ----------------------------- */
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  React.useEffect(() => {
    if (authLoading || !user) return;

    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    let cancelled = false;

    async function syncCart() {
      setCartSyncing(true);
      try {
        await apiDelete("/api/shop/cart");

        // Separate packages from standalone items
        const packageHeaders = currentItems.filter((i) => i.isPackageHeader);
        const subItems = currentItems.filter((i) => !!i.packageId && !i.isPackageHeader);
        const standaloneItems = currentItems.filter((i) => !i.isPackageHeader && !i.packageId);

        for (const header of packageHeaders) {
          if (cancelled) return;
          const pkgSubItems = subItems.filter((i) => i.packageId === header.id);
          await apiPost("/api/shop/cart/package", {
            clubId: header.clubId,
            clubPackageId: header.clubPackageId ?? header.id,
            quantity: header.quantity,
            items: pkgSubItems.map((i) => ({
              productVariantId: i.variantId ?? i.id,
              quantity: i.quantity / header.quantity,
              ...(i.customFields && Object.keys(i.customFields).length > 0
                ? { customFields: i.customFields }
                : {}),
            })),
          });
        }

        for (const item of standaloneItems) {
          if (cancelled) return;
          await apiPost("/api/shop/cart/items", {
            productVariantId: item.variantId ?? item.id,
            quantity: item.quantity,
            customFields: item.customFields,
            clubProductId: item.clubProductId,
          });
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

  /* ---------------------- Fetch rush fee --------------------------------- */
  React.useEffect(() => {
    let cancelled = false;

    async function fetchRushFee() {
      try {
        const query = clubId
          ? `?${new URLSearchParams({ clubId }).toString()}`
          : "";
        const data = await apiGet<RushFeeResponse>(
          `/api/shop/checkout/rush-fee${query}`,
        );
        if (cancelled) return;
        setRushFeeAmount(data.rushFee);
        setRushDescription(data.description);
        setRushFeeEnabled(data.enabled);
      } catch (err) {
        if (cancelled) return;
        // Fail closed: without a confirmed answer, don't offer the rush option
        setRushFeeEnabled(false);
        console.error("Failed to fetch rush fee:", err);
      }
    }

    void fetchRushFee();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  /* ---------------------- Form submission (create order + pay) ----------- */
  const onSubmit = async (data: CheckoutFormData) => {
    if (payState !== "idle" || squareStatus !== "ready") return;
    setPayError(null);
    setPayState("paying");
    try {
      const payload: CheckoutRequest = {
        shipping: {
          name: `${data.shipping.firstName} ${data.shipping.lastName}`.trim(),
          phone: data.shipping.phone || "",
          address1: data.shipping.address1,
          address2: data.shipping.address2 || undefined,
          city: data.shipping.city,
          state: data.shipping.state,
          postalCode: data.shipping.postalCode,
          country: data.shipping.country,
        },
        clubId,
        notes: data.notes || undefined,
        isRushOrder: rushAvailable ? data.isRushOrder || false : false,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod: "CARD",
      };

      billingContactRef.current = {
        givenName: data.shipping.firstName,
        familyName: data.shipping.lastName,
        email: data.shipping.email,
        addressLines: [data.shipping.address1, data.shipping.address2].filter(
          (line): line is string => !!line,
        ),
        city: data.shipping.city,
        state: data.shipping.state,
        postalCode: data.shipping.postalCode,
        countryCode: "US",
      };

      // Reuse the pending order on a payment retry; only recreate when the
      // buyer changed something that affects it (address, coupon, rush, notes)
      const payloadKey = JSON.stringify(payload);
      let currentOrder = order;
      if (!currentOrder || orderPayloadKeyRef.current !== payloadKey) {
        currentOrder = await apiPost<CheckoutResponse>(
          "/api/shop/checkout",
          payload,
        );
        checkoutPayloadRef.current = payload;
        orderPayloadKeyRef.current = payloadKey;
        setOrder(currentOrder);
      }

      await attemptPay(currentOrder, {
        canRetryToken: true,
        canRecreateOrder: true,
      });
    } catch (err: any) {
      // Only order creation throws here — attemptPay reports its own errors
      const apiMessages = err?.data?.message ?? err?.response?._data?.message;
      const errorText = Array.isArray(apiMessages)
        ? apiMessages.join(". ")
        : typeof apiMessages === "string"
          ? apiMessages
          : err instanceof Error
            ? err.message
            : "Checkout failed. Please try again.";
      toast.error(errorText);
      console.error("Checkout error:", err);
    } finally {
      // A 503 switches to "verifying" and must survive this cleanup
      setPayState((s) => (s === "paying" ? "idle" : s));
    }
  };

  /* ---------------------- Payment ---------------------------------------- */
  const handlePaymentSuccess = React.useCallback(
    (result: PaymentSuccess) => {
      setSuccessData(result);
      setPayState("idle");
      setStep("success");
      clearCart();
      toast.success("Payment successful!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [clearCart],
  );

  // 503 fallback: the charge may or may not have gone through, so keep asking
  // the backend until it knows. The backend deduplicates, so this can never
  // double-charge; the card form stays locked the whole time.
  const pollPaymentResult = React.useCallback(
    async (orderId: string, orderNumber: string) => {
      const MAX_ATTEMPTS = 40;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await sleep(3000);
        if (pollCancelledRef.current) return;
        try {
          const result = await apiPost<ConfirmCheckoutResponse>(
            "/api/shop/checkout/confirm",
            { orderId },
          );
          if (pollCancelledRef.current) return;
          if (result.status === "NEW" || result.status === "CONFIRMED") {
            handlePaymentSuccess(result);
            return;
          }
        } catch (err: any) {
          if (pollCancelledRef.current) return;
          const httpStatus =
            err?.status ?? err?.statusCode ?? err?.response?.status;
          const body = err?.data ?? err?.response?._data;
          if (httpStatus === 402 || body?.error === "PAYMENT_DECLINED") {
            setPayState("idle");
            setPayError(
              typeof body?.message === "string" && body.message
                ? body.message
                : "Your card was declined. Please try another card.",
            );
            return;
          }
          // Transient error — keep polling
        }
      }
      if (!pollCancelledRef.current) {
        setPayError(
          `We couldn't confirm your payment. Please do NOT retry — contact support and mention order #${orderNumber}.`,
        );
      }
    },
    [handlePaymentSuccess],
  );

  const attemptPay = React.useCallback(
    async (
      currentOrder: CheckoutResponse,
      opts: { canRetryToken: boolean; canRecreateOrder: boolean },
    ): Promise<void> => {
      // 1. Tokenize the card inside Square's iframe (tokens are single-use)
      const tokenResult = await tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        const messages = tokenResult.errors
          ?.map((e) => e.message ?? e.detail)
          .filter(Boolean)
          .join(" ");
        setPayError(messages || "Please check your card details and try again.");
        return;
      }

      // 2. Buyer verification (SCA/3DS)
      let verificationToken: string | undefined;
      try {
        verificationToken = await verifyBuyer(
          tokenResult.token,
          Number(currentOrder.total).toFixed(2),
          billingContactRef.current,
        );
      } catch {
        setPayError("Card verification was not completed. Please try again.");
        return;
      }

      // 3. Charge
      try {
        const payload: PayCheckoutRequest = {
          orderId: currentOrder.orderId,
          sourceId: tokenResult.token,
          verificationToken,
        };
        const result = await apiPost<PayCheckoutResponse>(
          "/api/shop/checkout/pay",
          payload,
        );
        handlePaymentSuccess(result);
      } catch (err: any) {
        // Never log this error object anywhere: its request options echo the
        // single-use payment tokens
        const httpStatus =
          err?.status ?? err?.statusCode ?? err?.response?.status;
        const body = err?.data ?? err?.response?._data;
        const errorCode = body?.error;

        if (httpStatus === 402 && errorCode === "PAYMENT_DECLINED") {
          setPayError(
            typeof body?.message === "string" && body.message
              ? body.message
              : "Your card was declined. Please try another card.",
          );
          return;
        }

        if (errorCode === "INVALID_PAYMENT_TOKEN" && opts.canRetryToken) {
          await attemptPay(currentOrder, { ...opts, canRetryToken: false });
          return;
        }

        if (errorCode === "ORDER_EXPIRED" && opts.canRecreateOrder) {
          const payload = checkoutPayloadRef.current;
          if (payload) {
            try {
              const fresh = await apiPost<CheckoutResponse>(
                "/api/shop/checkout",
                payload,
              );
              setOrder(fresh);
              await attemptPay(fresh, { ...opts, canRecreateOrder: false });
              return;
            } catch (recreateErr) {
              setPayError(
                getApiErrorMessage(
                  recreateErr,
                  "Your checkout session expired and we couldn't renew it. Please refresh and try again.",
                ),
              );
              return;
            }
          }
        }

        if (httpStatus === 503 || errorCode === "PAYMENT_STATUS_UNKNOWN") {
          setPayState("verifying");
          void pollPaymentResult(currentOrder.orderId, currentOrder.orderNumber);
          return;
        }

        setPayError(
          getApiErrorMessage(err, "Payment failed. Please try again."),
        );
      }
    },
    [tokenize, verifyBuyer, handlePaymentSuccess, pollPaymentResult],
  );


  /* ---------------------- Success view ------------------------------------ */
  // Must render before the empty-cart guard: the cart is cleared on success
  if (step === "success") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Order Received!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Thank you for your purchase. You will receive a confirmation
              email shortly.
            </p>

            {successData && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Order Number</span>
                    <span className="font-medium">
                      #{successData.orderNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {getOrderStatusLabel(successData.status)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Total Paid</span>
                    <span className="text-base font-semibold">
                      ${(Number(successData.total) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <Link
                href={`/track-order?orderNumber=${successData?.orderNumber || ""}`}
              >
                <Button className="w-full" size="lg">
                  Track Your Order
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full" size="lg" variant="outline">
                  Continue Shopping
                </Button>
              </Link>
            </div>
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
            <Link href="/teams">
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
  const payInFlight = isSubmitting || payState !== "idle";
  const payDisabled =
    payInFlight ||
    cartSyncing ||
    squareStatus !== "ready" ||
    !cardEntered ||
    cardHasError;
  const payButtonContent =
    payState === "verifying" ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Verifying payment...
      </>
    ) : payInFlight ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing payment...
      </>
    ) : (
      <>
        <CreditCard className="mr-2 h-4 w-4" />
        Pay ${total.toFixed(2)}
      </>
    );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
        {/* Left column — Form */}
        <div className="lg:col-span-2">
          <form
            id="checkout-form"
            className="space-y-6"
            onSubmit={handleSubmit(onSubmit)}
          >


            {/* Rush Processing — hidden when the club has rush fees disabled */}
            {rushAvailable && (
              <Card
                className={
                  isRushOrder
                    ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50 dark:border-amber-600 transition-colors"
                    : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 transition-colors"
                }
              >
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                        Rush my order for faster processing
                      </h3>
                      <Switch
                        checked={isRushOrder ?? false}
                        onCheckedChange={(checked) =>
                          setValue("isRushOrder", checked === true)
                        }
                      />
                    </div>
                    <p className="mt-1 text-sm text-amber-700/70 dark:text-amber-300/70">
                      {rushDescription}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                      + ${rushFeeAmount.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}


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
                    <Label htmlFor="shipping.phone">Phone *</Label>
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

                  <input type="hidden" {...register("shipping.country")} />
                  <div className="grid gap-2">
                    <Label htmlFor="shipping.postalCode">Postal Code *</Label>
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
                    {...register("notes")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment — embedded Square card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Square's card iframe mounts here — card data never touches our code */}
                <div className="relative rounded-md">
                  <div id="card-container" className="min-h-22.5" />
                  {(squareStatus === "idle" || squareStatus === "loading") && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {payState === "verifying" && (
                    <div className="absolute inset-0 z-10 cursor-not-allowed bg-background/50" />
                  )}
                </div>

                {squareStatus === "error" && (
                  <p className="text-sm text-destructive">
                    The payment form could not be loaded. Please refresh the
                    page and try again.
                  </p>
                )}

                {payState === "verifying" && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Verifying your payment… Please don&apos;t close this page
                      or re-enter your card. Retrying is safe and will never
                      charge you twice.
                    </p>
                  </div>
                )}

                {payError && (
                  <p className="text-sm text-destructive">{payError}</p>
                )}

                <p className="text-xs text-muted-foreground">
                  Payments are processed securely by Square. Your card details
                  never touch our servers.
                </p>
              </CardContent>
            </Card>

            {/* Submit — desktop only */}
            <Button
              className="hidden w-full lg:flex"
              disabled={payDisabled}
              size="lg"
              type="submit"
            >
              {payButtonContent}
            </Button>
          </form>
        </div>

        {/* Right column — Order Summary */}
        <div className="lg:col-span-1 sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const isSubItem = !!item.packageId && !item.isPackageHeader;
                return (
                <div
                  className={isSubItem ? "flex gap-3 ml-4" : "flex gap-3"}
                  key={item.id}
                >
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
                    {isSubItem ? (
                      <p className="text-xs text-muted-foreground">
                        Part of: {item.packageName}
                      </p>
                    ) : (
                      item.customFields &&
                      Object.keys(item.customFields).length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(item.customFields).map(
                            ([key, value]) =>
                              value ? (
                                <span key={key} className="text-xs text-primary">
                                  {key}: {value}
                                </span>
                              ) : null,
                          )}
                        </div>
                      )
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                      {!isSubItem && (
                        <span className="text-sm font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Shipping ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
                {appliedCoupon?.type === "FREE_SHIPPING" ? (
                  <span className="font-medium">
                    <span className="mr-1 text-muted-foreground line-through">
                      ${baseShippingCost.toFixed(2)}
                    </span>
                    $0.00
                  </span>
                ) : (
                  <span className="font-medium">
                    ${shippingCost.toFixed(2)}
                  </span>
                )}
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">
                    Coupon ({appliedCoupon.code})
                  </span>
                  <span className="font-medium text-green-600">
                    Free Shipping
                  </span>
                </div>
              )}
              {rushFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Rush Processing
                  </span>
                  <span className="font-medium">
                    ${rushFee.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax (7%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
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
                  Your payment is processed securely by Square
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Code */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Coupon Code</h3>
              </div>
              {appliedCoupon ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {appliedCoupon.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-destructive hover:underline"
                    onClick={handleRemoveCoupon}
                  >
                    Remove coupon
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleApplyCoupon();
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={couponValidating || !couponCode.trim()}
                    onClick={() => void handleApplyCoupon()}
                  >
                    {couponValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit — mobile only */}
          <Button
            className="mt-4 w-full lg:hidden"
            disabled={payDisabled}
            form="checkout-form"
            size="lg"
            type="submit"
          >
            {payButtonContent}
          </Button>
        </div>
      </div>
    </div>
  );
}
