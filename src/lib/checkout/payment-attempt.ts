"use client";

import type { Order } from "~/lib/api/types";

import { apiGet } from "~/lib/api/client";

/* -------------------------------------------------------------------------- */
/*                              Payment attempt                               */
/* -------------------------------------------------------------------------- */

/**
 * A payment the browser started and may not have seen the answer to.
 *
 * Written to localStorage — not sessionStorage — right before
 * `POST /api/shop/checkout/pay`, so that a reload, a crash or a second tab can
 * find the order again instead of creating a new one and charging the buyer
 * twice. It lives next to the cart (`cart`, `cart-checkout-id`).
 */
export interface PaymentAttempt {
  /**
   * Cart-scoped id minted with the cart. Carried here so a recovered attempt
   * can be matched to the cart it came from.
   *
   * NOT sent to the backend: the checkout DTO would reject an unknown field
   * (`forbidNonWhitelisted`). Start sending it once the contract accepts it.
   */
  checkoutId: string;
  orderId: string;
  orderNumber: string;
  /** ISO timestamp taken just before the /pay request went out. */
  startedAt: string;
  /** Order total as the backend priced it, for the recovered success screen. */
  total: number;
}

export const PAYMENT_ATTEMPT_KEY = "checkout-payment-attempt";

/**
 * Attempts older than this are dropped on read. Without a cap, a buyer who
 * abandons a declined checkout would be greeted by a recovery check forever.
 */
const MAX_ATTEMPT_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * How long after /pay went out an order that still reads `PENDING_PAYMENT` is
 * treated as possibly-still-settling rather than definitely unpaid.
 *
 * The backend has no lock on `/pay` yet, so a buyer who reloads mid-request can
 * reach a checkout form while the first charge is still being processed. Within
 * this window the app waits instead of offering the form.
 */
export const SETTLING_WINDOW_MS = 2 * 60 * 1000;

/**
 * True while a "never attempted" (PENDING) reading cannot be trusted as final:
 * the /pay request may still be on its way to the backend (a proxy timeout, a
 * reload mid-request). A FAILED reading is the backend's definitive answer and
 * is final at once; only PENDING waits out this window.
 *
 * An unparseable `startedAt` counts as inside the window: being wrong this way
 * costs the buyer a short wait, being wrong the other way can cost them a
 * second charge.
 */
export function isWithinSettlingWindow(attempt: PaymentAttempt): boolean {
  const startedMs = Date.parse(attempt.startedAt);
  if (Number.isNaN(startedMs)) return true;
  return Date.now() - startedMs < SETTLING_WINDOW_MS;
}

export function readPaymentAttempt(): null | PaymentAttempt {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PAYMENT_ATTEMPT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PaymentAttempt> | null;
    if (!parsed || typeof parsed.orderId !== "string" || !parsed.orderId) {
      return null;
    }

    const startedAt =
      typeof parsed.startedAt === "string" ? parsed.startedAt : "";
    const startedMs = startedAt ? Date.parse(startedAt) : Number.NaN;
    if (!Number.isNaN(startedMs) && Date.now() - startedMs > MAX_ATTEMPT_AGE_MS) {
      clearPaymentAttempt();
      return null;
    }

    return {
      checkoutId: typeof parsed.checkoutId === "string" ? parsed.checkoutId : "",
      orderId: parsed.orderId,
      orderNumber:
        typeof parsed.orderNumber === "string" ? parsed.orderNumber : "",
      startedAt,
      total: typeof parsed.total === "number" ? parsed.total : 0,
    };
  } catch (err) {
    console.error("Failed to read the saved payment attempt:", err);
    return null;
  }
}

export function writePaymentAttempt(attempt: PaymentAttempt): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAYMENT_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch (err) {
    // A full or blocked store must not stop the payment — it only costs us the
    // recovery path, which the buyer can still reach through Track Order.
    console.error("Failed to save the payment attempt:", err);
  }
}

export function clearPaymentAttempt(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PAYMENT_ATTEMPT_KEY);
  } catch (err) {
    console.error("Failed to clear the payment attempt:", err);
  }
}

/* -------------------------------------------------------------------------- */
/*                        Resolving what really happened                      */
/* -------------------------------------------------------------------------- */

export type PaymentOutcome =
  /** The backend has no such order (for this customer) — nothing to recover. */
  | "gone"
  /** A staff member must resolve this payment. Never offer the form. */
  | "review"
  /** The order exists and is paid. */
  | "paid"
  /** A charge may still be in flight on the backend. Wait; never re-pay. */
  | "processing"
  /** The backend states that no money was taken. Paying is safe. */
  | "unpaid"
  /** We could not find out (offline, rate limited, logged out). Never a failure. */
  | "unknown";

/** `GET /api/shop/checkout/payment-status/:orderId` (backend, authenticated). */
interface PaymentStatusResponse {
  canRetry: boolean;
  message: string;
  orderId: string;
  orderNumber: string;
  status: "FAILED" | "NEEDS_REVIEW" | "PAID" | "PENDING" | "PROCESSING";
  total: number;
}

/**
 * Asks the backend what happened to the payment for this attempt's order.
 *
 * Uses the authenticated, owner-only payment-status endpoint (payment audit
 * F-04): it is backed by the payment-attempt records the backend locks on, so
 * "unpaid" here is the backend's word that no charge exists or is in flight —
 * not an inference. Only a real 404 for this customer means "gone"; any other
 * failure (401, 429, 5xx, offline) is "unknown", which never discards the
 * attempt and never offers the card form.
 */
export interface ResolvedAttempt {
  /** Backend payment status, when the backend answered. */
  backendStatus?: PaymentStatusResponse["status"];
  order?: Pick<Order, "status" | "total">;
  outcome: PaymentOutcome;
}

export async function resolvePaymentAttempt(
  attempt: PaymentAttempt,
): Promise<ResolvedAttempt> {
  if (!attempt.orderId) return { outcome: "unknown" };

  try {
    const status = await apiGet<PaymentStatusResponse>(
      `/api/shop/checkout/payment-status/${encodeURIComponent(attempt.orderId)}`,
      { cache: "no-store" },
    );
    const order = { status: status.status, total: String(status.total) } as Pick<
      Order,
      "status" | "total"
    >;
    const backendStatus = status.status;
    switch (status.status) {
      case "PAID":
        return { backendStatus, order, outcome: "paid" };
      case "PROCESSING":
        return { backendStatus, order, outcome: "processing" };
      case "NEEDS_REVIEW":
        return { backendStatus, order, outcome: "review" };
      default:
        return {
          backendStatus,
          order,
          outcome: status.canRetry ? "unpaid" : "unknown",
        };
    }
  } catch (err) {
    const httpStatus =
      (err as { status?: number; statusCode?: number })?.status ??
      (err as { statusCode?: number })?.statusCode;
    if (httpStatus === 404) return { outcome: "gone" };
    return { outcome: "unknown" };
  }
}

/**
 * Resolves an attempt, retrying while the answer is `unknown` — a flaky
 * connection or a lookup that is briefly down must not leave the buyer in front
 * of a spinner that never resolves. Stops at the first definite answer.
 */
export async function resolvePaymentAttemptWithRetries(
  attempt: PaymentAttempt,
  options: {
    attempts?: number;
    delayMs?: number;
    isCancelled?: () => boolean;
  } = {},
): Promise<ResolvedAttempt> {
  const { attempts = 3, delayMs = 1500, isCancelled } = options;
  let last: ResolvedAttempt = { outcome: "unknown" };

  for (let i = 0; i < attempts; i++) {
    if (isCancelled?.()) return last;
    last = await resolvePaymentAttempt(attempt);
    if (last.outcome !== "unknown") return last;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return last;
}
