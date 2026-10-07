"use client";

import type { Order } from "~/lib/api/types";

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
 * True while a `PENDING_PAYMENT` reading cannot be trusted as final.
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
  /** The backend has no such order — nothing to recover. */
  | "gone"
  /** The order exists and is paid. */
  | "paid"
  /** The order exists and carries no payment. Retrying it is safe. */
  | "unpaid"
  /** We could not find out. Never treat this as a failure. */
  | "unknown";

/**
 * Order statuses that mean "no money has been taken for this order".
 *
 * `FAILED` is in here because the order can be paid again; the backend
 * deduplicates `/pay` per `orderId`, so retrying the same order cannot charge
 * twice even if this reading turns out to be stale.
 */
const UNPAID_STATUSES = new Set<string>(["PENDING_PAYMENT", "FAILED"]);

/**
 * TEMPORARY — infers the payment state from the order's lifecycle status.
 *
 * `GET /api/orders/:orderNumber` is the only read-only view of an order we
 * have, and it exposes `status` but no `paymentStatus`, so "paid" is inferred
 * from the status not being one of the unpaid ones. That conflates two axes and
 * breaks silently the day the backend inserts a new pre-`NEW` status.
 *
 * Replace the whole function with the real payment-state endpoint once the
 * backend ships it (tracked in the hand-off doc: we asked for `paymentStatus`
 * and `total` on the order, plus a `GET /checkout/pending` lookup).
 *
 * `POST /api/shop/checkout/confirm` is deliberately not used here: with the
 * current backend it can mark an order `FAILED` while the charge is still
 * settling. This is a plain GET and cannot change anything.
 */
export async function resolvePaymentAttempt(
  attempt: PaymentAttempt,
): Promise<{ order?: Order; outcome: PaymentOutcome }> {
  if (!attempt.orderNumber) return { outcome: "unknown" };

  try {
    const response = await fetch(
      `/api/orders/${encodeURIComponent(attempt.orderNumber)}`,
      { cache: "no-store" },
    );

    if (response.status === 404) return { outcome: "gone" };
    if (!response.ok) return { outcome: "unknown" };

    const order = (await response.json()) as Order;
    if (typeof order?.status !== "string") return { outcome: "unknown" };

    return {
      order,
      outcome: UNPAID_STATUSES.has(order.status) ? "unpaid" : "paid",
    };
  } catch {
    // Offline or the lookup is down — unknown, never "failed".
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
): Promise<{ order?: Order; outcome: PaymentOutcome }> {
  const { attempts = 3, delayMs = 1500, isCancelled } = options;
  let last: { order?: Order; outcome: PaymentOutcome } = { outcome: "unknown" };

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
