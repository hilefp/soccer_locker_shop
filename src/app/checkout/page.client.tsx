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
import {
  clearPaymentAttempt,
  isWithinSettlingWindow,
  readPaymentAttempt,
  resolvePaymentAttempt,
  resolvePaymentAttemptWithRetries,
  writePaymentAttempt,
  type PaymentAttempt,
} from "~/lib/checkout/payment-attempt";
import { useAuth } from "~/lib/hooks/use-auth";
import { useCart } from "~/lib/hooks/use-cart";
import {
  useSquarePayments,
  type SquareBillingContact,
  type SquareWalletKind,
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

/**
 * `POST /api/shop/checkout/confirm` stays off until the backend ships a
 * read-only payment-state endpoint: today it can mark an order `FAILED` while
 * the charge is still settling, turning a successful payment into a failed one.
 *
 * With the flag off, an unresolved payment is reconciled through the plain
 * `GET /api/orders/:orderNumber` lookup instead, which cannot change anything.
 * Set NEXT_PUBLIC_ENABLE_CHECKOUT_CONFIRM_POLLING=true once /confirm is safe.
 */
const CONFIRM_POLLING_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CHECKOUT_CONFIRM_POLLING === "true";

/**
 * Backend error codes that mean "no money was taken, retrying is safe".
 *
 * Anything else — any other 4xx, any 5xx, a transport failure with no status —
 * is treated as "the card may have been charged": the UI goes to verifying and
 * never re-offers the Pay button. See `submitPayment`.
 */
const NOT_CHARGED_ERROR_CODES = new Set([
  "INVALID_PAYMENT_TOKEN",
  "ORDER_EXPIRED",
  "PAYMENT_DECLINED",
]);

/** How long a mount-time recovery waits out a possibly-settling charge. */
const SETTLING_POLL_WINDOW_MS = 60_000;
const SETTLING_POLL_INTERVAL_MS = 3_000;

interface PaymentSuccess {
  orderNumber: string;
  status: string;
  total: number | string;
}

interface PaySource {
  sourceId: string;
  verificationToken?: string;
}

/** What the mount-time check found out about a saved payment attempt. */
type RecoveryState =
  /** The lookup says unpaid, but the charge may still be in flight. */
  | { attempt: PaymentAttempt; kind: "settling" }
  /** We could not reach the lookup. Never offer the form in this state. */
  | { attempt: PaymentAttempt; kind: "unknown" }
  /** Confirmed unpaid and past the settling window — the form is safe. */
  | { attempt: PaymentAttempt; kind: "unpaid" }
  | { kind: "checking" }
  | { kind: "clear" };

export function CheckoutPageClient() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount, checkoutId, clearCart } = useCart();

  const [cartSyncing, setCartSyncing] = React.useState(false);
  const [step, setStep] = React.useState<
    "already-paid" | "details" | "success"
  >("details");
  // Set when the backend says this order was already paid (409
  // ORDER_ALREADY_PAID) — the buyer must be told, not charged again
  const [alreadyPaidOrder, setAlreadyPaidOrder] = React.useState<null | string>(
    null,
  );
  // Starts as "checking" so the first paint is a spinner rather than a card
  // form we might have to take away: the mount-time check resolves within a
  // tick when there is nothing saved.
  const [recovery, setRecovery] = React.useState<RecoveryState>({
    kind: "checking",
  });
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

  // Synchronous submit guard. `payState` cannot do this job: two clicks in the
  // same task both read the pre-update value and both get through, which is how
  // a fast double click used to create two orders.
  const payInFlightRef = React.useRef(false);

  // Must be reset on mount, not only set on unmount: under React StrictMode the
  // mount → cleanup → mount cycle would otherwise leave this latched at true
  // for the life of the page and every poll below would exit on its first tick.
  const pollCancelledRef = React.useRef(false);
  React.useEffect(() => {
    pollCancelledRef.current = false;
    return () => {
      pollCancelledRef.current = true;
    };
  }, []);

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
    getValues,
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

  const {
    applePayReady,
    cardEntered,
    cardHasError,
    googlePayReady,
    status: squareStatus,
    tokenize,
    verifyBuyer,
    walletTokenize,
  } = useSquarePayments({
    // Never mount the card element while a saved attempt is unresolved: an
    // empty card form is an invitation to pay twice.
    enabled:
      step === "details" &&
      !cartSyncing &&
      items.length > 0 &&
      (recovery.kind === "clear" || recovery.kind === "unpaid"),
    total,
  });

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

  /* ---------------------- Order creation ---------------------------------- */
  // Reuses the pending order on a payment retry; only recreates it when the
  // buyer changed something that affects it (address, coupon, rush, notes)
  const ensureOrder = async (
    data: CheckoutFormData,
  ): Promise<CheckoutResponse> => {
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
      // `checkoutId` deliberately stays out of this payload: the NestJS
      // ValidationPipe runs with forbidNonWhitelisted, so an unknown field
      // answers 400. It is persisted locally (see writePaymentAttempt) and
      // starts going out once the backend contract accepts it.
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
    return currentOrder;
  };

  const reportOrderCreationError = (err: any) => {
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
  };

  /* ---------------------- Form submission (card payment) ------------------ */
  const onSubmit = async (data: CheckoutFormData) => {
    // The ref is the real guard — see payInFlightRef. The payState check stays
    // for the longer-lived states ("verifying" must not accept a submit).
    if (payInFlightRef.current) return;
    if (payState !== "idle" || squareStatus !== "ready") return;
    payInFlightRef.current = true;
    setPayError(null);
    setPayState("paying");
    try {
      const currentOrder = await ensureOrder(data);
      const source = await buildCardSource(currentOrder);
      if (!source) return;
      await submitPayment(currentOrder, source, {
        canRecreateOrder: true,
        rebuildSource: buildCardSource,
      });
    } catch (err: any) {
      // Only order creation throws here — the payment helpers report their own
      reportOrderCreationError(err);
    } finally {
      payInFlightRef.current = false;
      // An unresolved payment switches to "verifying" and must survive this
      setPayState((s) => (s === "paying" ? "idle" : s));
    }
  };

  /* ---------------------- Wallet payment (Apple Pay / Google Pay) --------- */
  const handleWalletPay = async (wallet: SquareWalletKind) => {
    if (payInFlightRef.current) return;
    if (payState !== "idle" || cartSyncing) return;
    // Sync-only validation: any await before tokenize would break the
    // user-gesture call chain Apple Pay requires to open its sheet
    const parsed = checkoutSchema.safeParse(getValues());
    if (!parsed.success) {
      toast.error("Please complete your shipping details first.");
      void handleSubmit(() => undefined)(); // surfaces the field errors
      return;
    }

    // Claimed only once nothing else can bail out before the try/finally
    payInFlightRef.current = true;
    setPayError(null);
    setPayState("paying");
    try {
      const tokenResult = await walletTokenize(wallet);
      if (tokenResult.status === "Cancel") return; // buyer closed the sheet
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        const messages = tokenResult.errors
          ?.map((e) => e.message ?? e.detail)
          .filter(Boolean)
          .join(" ");
        setPayError(
          messages || "The payment could not be started. Please try again.",
        );
        return;
      }

      const currentOrder = await ensureOrder(parsed.data);
      // No verifyBuyer for wallets: Apple/Google already authenticate the
      // buyer strongly (Face ID / fingerprint), so /pay goes without it
      await submitPayment(
        currentOrder,
        { sourceId: tokenResult.token },
        { canRecreateOrder: true },
      );
    } catch (err: any) {
      reportOrderCreationError(err);
    } finally {
      payInFlightRef.current = false;
      setPayState((s) => (s === "paying" ? "idle" : s));
    }
  };

  /* ---------------------- Payment ---------------------------------------- */
  const handlePaymentSuccess = React.useCallback(
    (result: PaymentSuccess) => {
      // The outcome is settled — this is one of only two places the saved
      // attempt is allowed to go (the other is an order the backend says is
      // gone or expired)
      clearPaymentAttempt();
      setSuccessData(result);
      setPayState("idle");
      setStep("success");
      clearCart();
      toast.success("Payment successful!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [clearCart],
  );

  /**
   * Reconciles a payment whose outcome we never saw.
   *
   * Default path: poll the read-only order lookup, which cannot change the
   * order. `POST /checkout/confirm` is only used when
   * CONFIRM_POLLING_ENABLED is set, because today it can flip a settling order
   * to FAILED. Either way the card form stays locked while this runs.
   */
  const pollPaymentResult = React.useCallback(
    async (orderId: string, orderNumber: string, total: number) => {
      const MAX_ATTEMPTS = 40;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await sleep(3000);
        if (pollCancelledRef.current) return;

        if (!CONFIRM_POLLING_ENABLED) {
          const { order: recovered, outcome } = await resolvePaymentAttempt({
            checkoutId,
            orderId,
            orderNumber,
            startedAt: new Date().toISOString(),
            total,
          });
          if (pollCancelledRef.current) return;

          if (outcome === "paid") {
            handlePaymentSuccess({
              orderNumber,
              status: recovered?.status ?? "NEW",
              total: recovered?.total ?? total,
            });
            return;
          }
          if (outcome === "gone") {
            clearPaymentAttempt();
            setPayState("idle");
            setPayError(
              "We couldn't find your order. Please try again, or contact support if you were charged.",
            );
            return;
          }
          // "unpaid" is not final while a charge may still be settling, and
          // "unknown" tells us nothing — keep looking either way.
          continue;
        }

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
        // Still unresolved. The attempt record stays so a reload picks the
        // reconciliation back up instead of starting a second order.
        setPayError(
          `We couldn't confirm your payment. Please do NOT retry — contact support and mention order #${orderNumber}.`,
        );
      }
    },
    [checkoutId, handlePaymentSuccess],
  );

  /* ---------------------- Recovering a saved attempt ---------------------- */
  // Runs before the card form is shown. A payment attempt saved by an earlier
  // page load means a charge may already exist for this buyer, so the first
  // question is what really happened to it — not "which card do you want to
  // use". Without this check the buyer is handed a blank form and a second
  // order gets created, which is a real double charge.
  const runRecovery = React.useCallback(
    async (isCancelled: () => boolean) => {
      const attempt = readPaymentAttempt();
      if (!attempt) {
        setRecovery({ kind: "clear" });
        return;
      }
      setRecovery({ kind: "checking" });

      const settleAsPaid = (order?: { status: string; total: string }) =>
        handlePaymentSuccess({
          orderNumber: attempt.orderNumber,
          status: order?.status ?? "NEW",
          total: order?.total ?? attempt.total,
        });

      // Retried, so a flaky connection does not strand the buyer on a spinner
      const first = await resolvePaymentAttemptWithRetries(attempt, {
        isCancelled,
      });
      if (isCancelled()) return;

      if (first.outcome === "paid") {
        settleAsPaid(first.order);
        return;
      }
      if (first.outcome === "gone") {
        // The backend has no such order — nothing left to protect
        clearPaymentAttempt();
        setRecovery({ kind: "clear" });
        return;
      }
      if (first.outcome === "unknown") {
        // Out of retries: show the order number and a way to check again,
        // never a card form.
        setRecovery({ attempt, kind: "unknown" });
        return;
      }

      // Unpaid. If /pay went out moments ago the backend may still be charging
      // — it has no lock yet — so showing the form here is how a second payment
      // on the same order happens. Wait the charge out first.
      if (!isWithinSettlingWindow(attempt)) {
        setRecovery({ attempt, kind: "unpaid" });
        return;
      }

      setRecovery({ attempt, kind: "settling" });
      const deadline = Date.now() + SETTLING_POLL_WINDOW_MS;
      while (!isCancelled() && Date.now() < deadline) {
        await sleep(SETTLING_POLL_INTERVAL_MS);
        if (isCancelled()) return;

        const next = await resolvePaymentAttemptWithRetries(attempt, {
          attempts: 2,
          isCancelled,
        });
        if (isCancelled()) return;

        if (next.outcome === "paid") {
          settleAsPaid(next.order);
          return;
        }
        if (next.outcome === "gone") {
          clearPaymentAttempt();
          setRecovery({ kind: "clear" });
          return;
        }
        // "unpaid" / "unknown" — keep waiting out the window
      }

      // Still unpaid after the window: the charge is not coming. The record
      // stays, and the backend reuses this PENDING_PAYMENT order for an
      // unchanged cart, so the retry lands on it rather than on a new one.
      if (!isCancelled()) setRecovery({ attempt, kind: "unpaid" });
    },
    [handlePaymentSuccess],
  );

  React.useEffect(() => {
    let cancelled = false;
    void runRecovery(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [runRecovery]);

  // Tokenizes the card inside Square's iframe and runs buyer verification
  // (SCA/3DS). Returns null — with the error already shown — on failure.
  const buildCardSource = React.useCallback(
    async (currentOrder: CheckoutResponse): Promise<null | PaySource> => {
      const tokenResult = await tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        const messages = tokenResult.errors
          ?.map((e) => e.message ?? e.detail)
          .filter(Boolean)
          .join(" ");
        setPayError(messages || "Please check your card details and try again.");
        return null;
      }

      try {
        const verificationToken = await verifyBuyer(
          tokenResult.token,
          Number(currentOrder.total).toFixed(2),
          billingContactRef.current,
        );
        return { sourceId: tokenResult.token, verificationToken };
      } catch {
        setPayError("Card verification was not completed. Please try again.");
        return null;
      }
    },
    [tokenize, verifyBuyer],
  );

  const submitPayment = React.useCallback(
    async (
      currentOrder: CheckoutResponse,
      source: PaySource,
      opts: {
        canRecreateOrder: boolean;
        // Card payments can silently rebuild a fresh token; wallets can't
        // (re-opening the Apple/Google sheet needs a new user gesture)
        rebuildSource?: (order: CheckoutResponse) => Promise<null | PaySource>;
      },
    ): Promise<void> => {
      // Written BEFORE the request leaves: from here on a reload, a crash or a
      // second tab can find this order again instead of minting another one
      writePaymentAttempt({
        checkoutId,
        orderId: currentOrder.orderId,
        orderNumber: currentOrder.orderNumber,
        startedAt: new Date().toISOString(),
        total: Number(currentOrder.total) || 0,
      });

      try {
        const payload: PayCheckoutRequest = {
          orderId: currentOrder.orderId,
          ...source,
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

        // --- codes the backend will start sending with the new contract ---
        // Both arrive as 409. Matched on the code alone so a change of status
        // does not silently drop them into the catch-all below. Until the
        // backend emits them these branches are dormant and the catch-all
        // already errs on the safe side for anything it has not seen.

        // The order is already paid: say so, never charge again.
        if (errorCode === "ORDER_ALREADY_PAID") {
          clearPaymentAttempt();
          clearCart(); // also retires the cart's checkoutId
          setAlreadyPaidOrder(currentOrder.orderNumber);
          setPayState("idle");
          setStep("already-paid");
          window.scrollTo({ behavior: "smooth", top: 0 });
          return;
        }

        // Another request is mid-charge on this order — wait, do not retry.
        if (errorCode === "PAYMENT_IN_PROGRESS") {
          setPayState("verifying");
          void pollPaymentResult(
            currentOrder.orderId,
            currentOrder.orderNumber,
            Number(currentOrder.total) || 0,
          );
          return;
        }

        if (errorCode === "INVALID_PAYMENT_TOKEN") {
          if (opts.rebuildSource) {
            const fresh = await opts.rebuildSource(currentOrder);
            if (fresh) {
              await submitPayment(currentOrder, fresh, {
                ...opts,
                rebuildSource: undefined,
              });
            }
            return;
          }
          setPayError("Your payment session expired. Please try again.");
          return;
        }

        if (errorCode === "ORDER_EXPIRED" && opts.canRecreateOrder) {
          const payload2 = checkoutPayloadRef.current;
          if (payload2) {
            try {
              // The backend declared this order dead, so the attempt pointing
              // at it is worthless; the retry below writes a fresh one
              clearPaymentAttempt();
              const fresh = await apiPost<CheckoutResponse>(
                "/api/shop/checkout",
                payload2,
              );
              setOrder(fresh);
              orderPayloadKeyRef.current = JSON.stringify(payload2);
              // The charge never happened, so the token is still unused —
              // retry it against the fresh order
              await submitPayment(fresh, source, {
                ...opts,
                canRecreateOrder: false,
              });
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

        // Everything that reaches here is a payment whose outcome we do not
        // know: a 503, a transport failure with no status at all, a 5xx, or a
        // 4xx whose code is not one of NOT_CHARGED_ERROR_CODES. The card may
        // have been charged, so this must never read as a failure and must
        // never re-offer the Pay button — it goes to verifying and reconciles.
        //
        // Deliberately asymmetric: a real validation 400 now parks the buyer in
        // a verifying state too. That is the safe direction to be wrong in, and
        // it stops once /pay returns a documented code on every response.
        if (!errorCode || !NOT_CHARGED_ERROR_CODES.has(errorCode)) {
          setPayState("verifying");
          void pollPaymentResult(
            currentOrder.orderId,
            currentOrder.orderNumber,
            Number(currentOrder.total) || 0,
          );
          return;
        }

        // A known "not charged" code we did not handle above (a declined 402
        // that did not carry the 402 status, an INVALID_PAYMENT_TOKEN with no
        // way left to rebuild the token): safe to show and safe to retry.
        setPayError(
          getApiErrorMessage(err, "Please check your card details and try again."),
        );
      }
    },
    [checkoutId, clearCart, handlePaymentSuccess, pollPaymentResult],
  );


  /* ---------------------- Already-paid view ------------------------------- */
  // 409 ORDER_ALREADY_PAID: the money is in, so this is good news, not an
  // error. Rendered before the empty-cart guard — the cart is cleared here too.
  if (step === "already-paid") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              This order is already paid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Order{" "}
              <span className="font-medium">#{alreadyPaidOrder}</span> has
              already been paid, so we didn&apos;t charge you again. You will
              receive a confirmation email shortly.
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/track-order?orderNumber=${alreadyPaidOrder ?? ""}`}>
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

  /* ------------- Unresolved earlier payment (before everything) ---------- */
  // These two come before the empty-cart and cart-sync views: a payment that
  // may have gone through outranks anything else this page could say.
  if (recovery.kind === "checking") {
    return (
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 md:px-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Checking your last payment...</p>
      </div>
    );
  }

  // The lookup says unpaid but /pay may still be charging on the backend.
  // Polling runs in runRecovery; this screen just holds the buyer there.
  if (recovery.kind === "settling") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              Confirming your payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You started a payment for order{" "}
              <span className="font-medium">
                #{recovery.attempt.orderNumber}
              </span>
              . We&apos;re checking whether it went through — this takes a few
              seconds. Please don&apos;t close this page or pay again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (recovery.kind === "unknown") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              We couldn&apos;t check your payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              You started a payment for order{" "}
              <span className="font-medium">
                #{recovery.attempt.orderNumber}
              </span>{" "}
              and we can&apos;t reach our system to confirm it. Please
              don&apos;t pay again — you may already have been charged.
            </p>
            <div className="flex flex-col gap-3">
              {/* Checks again. Never a way to pay: the outcome is unknown. */}
              <Button
                className="w-full"
                onClick={() => void runRecovery(() => false)}
                size="lg"
              >
                Check again
              </Button>
              <Link
                href={`/track-order?orderNumber=${recovery.attempt.orderNumber}`}
              >
                <Button className="w-full" size="lg" variant="outline">
                  Track Your Order
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
        </div>

        {/* Payment — embedded Square card + wallets. Stacks last on mobile
            (below the coupon); sits under the form on desktop */}
        <div className="mt-6 lg:col-span-2 lg:col-start-1 lg:mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Express checkout — Apple Pay (Safari) / Google Pay (Chrome).
                  The Google Pay container must stay in the DOM for the SDK to
                  attach, so it's hidden rather than unmounted */}
              <div
                className={
                  applePayReady || googlePayReady ? "grid gap-2" : "hidden"
                }
              >
                {applePayReady && (
                  <button
                    aria-label="Pay with Apple Pay"
                    className="h-12 w-full rounded-md disabled:opacity-50"
                    disabled={payInFlight}
                    onClick={() => void handleWalletPay("applePay")}
                    style={
                      {
                        WebkitAppearance: "-apple-pay-button",
                      } as React.CSSProperties
                    }
                    type="button"
                  />
                )}
                <div
                  aria-disabled={payInFlight}
                  className={googlePayReady ? "h-12 w-full" : "hidden"}
                  id="google-pay-button"
                  onClick={
                    payInFlight
                      ? undefined
                      : () => void handleWalletPay("googlePay")
                  }
                />
              </div>

              {(applePayReady || googlePayReady) && (
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    or pay with card
                  </span>
                  <Separator className="flex-1" />
                </div>
              )}

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

              {recovery.kind === "unpaid" && payState === "idle" && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    Your earlier attempt on order{" "}
                    <span className="font-medium">
                      #{recovery.attempt.orderNumber}
                    </span>{" "}
                    didn&apos;t go through — you were not charged. You can pay
                    for it below.
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

          <Button
            className="mt-6 w-full"
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
