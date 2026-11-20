import type { APIRequestContext, FrameLocator, Page } from "@playwright/test";

import { expect } from "@playwright/test";

import { E2E } from "../../playwright.config";

/* -------------------------------------------------------------------------- */
/*                               Test cards                                   */
/* -------------------------------------------------------------------------- */

/** https://developer.squareup.com/docs/devtools/sandbox/payments */
export const CARDS = {
  /** Square Sandbox: always declines with CARD_DECLINED. */
  declined: "4000000000000002",
  /** Square Sandbox: always approves. */
  success: "4111111111111111",
} as const;

/**
 * Square Sandbox payment tokens that always fail in one specific way.
 * https://developer.squareup.com/docs/devtools/sandbox/payments
 *
 * These exercise the backend's real error mapping — no `route.fulfill` stubs —
 * because they are rejected by Square itself, not by us.
 */
export const BAD_PAY_TOKENS = {
  alreadyUsed: "cnon:card-nonce-already-used",
  declined: "cnon:card-nonce-declined",
  rejectedCvv: "cnon:card-nonce-rejected-cvv",
  rejectedPostalCode: "cnon:card-nonce-rejected-postalcode",
} as const;

export const PAY_ROUTE = "**/api/shop/checkout/pay";

export const CARD_EXTRAS = {
  cvv: "111",
  /** Any future date. Today is well before Dec 2030. */
  expiry: "1230",
  zip: "10001",
} as const;

export const SHIPPING = {
  address1: "1200 Brickell Avenue",
  address2: "Suite 1900",
  city: "Miami",
  email: E2E.user.email,
  firstName: "E2E",
  lastName: "Tester",
  phone: "+15551234567",
  postalCode: "33131",
  state: "FL",
} as const;

/* -------------------------------------------------------------------------- */
/*                   /api/shop/checkout/* request recorder                    */
/* -------------------------------------------------------------------------- */

export interface CheckoutCall {
  /**
   * `pay`, `confirm`, `` (order creation), `payment-config`, or
   * `order-lookup` for the read-only `GET /api/orders/:orderNumber` the
   * reconciliation polls.
   */
  endpoint: string;
  method: string;
  /** Order id seen in either the request or the response body. */
  orderId?: string;
  orderNumber?: string;
  /** Square payment id — identical across deduplicated retries. */
  paymentId?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  /** null while still in flight, "failed" when the transport died. */
  status: null | number | "failed";
  url: string;
}

/** `GET /api/orders/:orderNumber` — the read-only order lookup. */
const ORDER_LOOKUP_RE = /^\/api\/orders\/[^/]+$/;

/** Single-use payment tokens must never be written to a log or a trace. */
function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of ["sourceId", "verificationToken"]) {
    if (key in copy) copy[key] = "<redacted>";
  }
  return copy;
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 400);
  }
}

/**
 * Records every `/api/shop/checkout/*` round trip the page makes. The app calls
 * the NestJS backend directly (NEXT_PUBLIC_API_URL), so these are cross-origin
 * requests to :4000, not Next route handlers.
 */
export class CheckoutLog {
  readonly calls: CheckoutCall[] = [];
  private readonly pending: Promise<void>[] = [];

  constructor(private readonly page: Page) {
    page.on("request", (request) => {
      if (!CheckoutLog.matches(request.url())) return;
      const call: CheckoutCall = {
        endpoint: CheckoutLog.endpointOf(request.url()),
        method: request.method(),
        requestBody: redact(parse(request.postData() ?? "")),
        status: null,
        url: request.url(),
      };
      const body = call.requestBody as Record<string, unknown> | undefined;
      if (body && typeof body.orderId === "string") call.orderId = body.orderId;
      this.calls.push(call);
    });

    page.on("requestfailed", (request) => {
      if (!CheckoutLog.matches(request.url())) return;
      const call = this.findOpen(request.url(), request.method());
      if (call) call.status = "failed";
    });

    page.on("response", (response) => {
      const request = response.request();
      if (!CheckoutLog.matches(request.url())) return;
      const call = this.findOpen(request.url(), request.method());
      if (!call) return;
      call.status = response.status();
      this.pending.push(
        response
          .text()
          .then((text) => {
            call.responseBody = redact(parse(text));
            const body = call.responseBody as Record<string, unknown>;
            if (body && typeof body === "object") {
              if (typeof body.orderId === "string") call.orderId = body.orderId;
              if (typeof body.orderNumber === "string") {
                call.orderNumber = body.orderNumber;
              }
              if (typeof body.paymentId === "string") {
                call.paymentId = body.paymentId;
              }
            }
          })
          .catch(() => {
            call.responseBody = "<body unavailable>";
          }),
      );
    });
  }

  static endpointOf(url: string): string {
    const { pathname } = new URL(url);
    if (ORDER_LOOKUP_RE.test(pathname)) return "order-lookup";
    return pathname.replace(/^.*\/api\/shop\/checkout\/?/, "");
  }

  static matches(url: string): boolean {
    if (url.includes("/api/shop/checkout")) return true;
    // The reconciliation path polls the Next route handler, not the backend
    return ORDER_LOOKUP_RE.test(new URL(url).pathname);
  }

  /** Flushes the in-flight `response.text()` reads. Call before asserting. */
  async settle(): Promise<void> {
    await Promise.all(this.pending);
  }

  /**
   * Read-only reconciliation lookups: the authenticated payment-status
   * endpoint (current) or the public order lookup (legacy).
   */
  statusLookups(): CheckoutCall[] {
    return this.calls.filter(
      (c) =>
        c.method === "GET" &&
        (c.endpoint === "order-lookup" || c.endpoint.startsWith("payment-status")),
    );
  }

  of(endpoint: string, method = "POST"): CheckoutCall[] {
    return this.calls.filter(
      (c) => c.endpoint === endpoint && c.method === method,
    );
  }

  /** The order the page created, as reported by `POST /api/shop/checkout`. */
  get order(): { orderId: string; orderNumber: string } | undefined {
    for (const call of [...this.calls].reverse()) {
      if (call.endpoint === "" && call.method === "POST" && call.orderId) {
        return {
          orderId: call.orderId,
          orderNumber: call.orderNumber ?? "",
        };
      }
    }
    return undefined;
  }

  print(label: string): void {
    console.log(`\n── /api/shop/checkout/* calls — ${label} ──`);
    if (this.calls.length === 0) console.log("  (none)");
    for (const c of this.calls) {
      console.log(
        `  ${c.method} /${c.endpoint || "(create order)"} -> ${c.status}` +
          `${c.orderId ? ` orderId=${c.orderId}` : ""}` +
          `${c.orderNumber ? ` orderNumber=${c.orderNumber}` : ""}` +
          `${c.paymentId ? ` paymentId=${c.paymentId}` : ""}`,
      );
      if (c.method !== "GET") {
        console.log(`      req: ${JSON.stringify(c.requestBody)}`);
        console.log(`      res: ${JSON.stringify(c.responseBody)}`);
      }
    }
    console.log("──────────────────────────────────────────\n");
  }

  private findOpen(url: string, method: string): CheckoutCall | undefined {
    return [...this.calls]
      .reverse()
      .find((c) => c.url === url && c.method === method && c.status === null);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Square card iframe                             */
/* -------------------------------------------------------------------------- */

/**
 * Square's Web Payments SDK renders all four card fields inside ONE iframe
 * (`iframe.sq-card-component`, title "Secure Credit Card Form") mounted into
 * `#card-container`. The iframe's `name` carries a fresh uuid on every mount,
 * so it is matched by position instead. Verified against SDK 1.86.0.
 */
export function cardFrame(page: Page): FrameLocator {
  return page.frameLocator("#card-container iframe.sq-card-component");
}

/**
 * Types a card into Square's iframe. Uses real keystrokes rather than fill():
 * the SDK only emits `cardBrandChanged` — which is what unlocks the app's Pay
 * button — while digits arrive through input events.
 */
export async function fillCard(page: Page, cardNumber: string): Promise<void> {
  const frame = cardFrame(page);

  const number = frame.locator("#cardNumber");
  await number.waitFor({ state: "visible", timeout: 60_000 });
  await number.click();
  await number.fill("");
  await number.pressSequentially(cardNumber, { delay: 30 });

  const expiry = frame.locator("#expirationDate");
  await expiry.click();
  await expiry.fill("");
  await expiry.pressSequentially(CARD_EXTRAS.expiry, { delay: 30 });

  const cvv = frame.locator("#cvv");
  await cvv.click();
  await cvv.fill("");
  await cvv.pressSequentially(CARD_EXTRAS.cvv, { delay: 30 });

  // The ZIP field lives in the same iframe; in SDK 1.86 it is rendered up
  // front, but it only becomes required once a card number is recognized.
  const zip = frame.locator("#postalCode");
  if (await zip.count()) {
    await zip.click();
    await zip.fill("");
    await zip.pressSequentially(CARD_EXTRAS.zip, { delay: 30 });
  }
}

/**
 * Rewrites the single-use card token in the `/pay` body to one of Square's
 * always-failing Sandbox nonces and lets the request through to the REAL
 * backend, so the assertion is about the backend's own error mapping.
 *
 * `sourceId` is the field that carries the token (`PayCheckoutRequest`,
 * src/lib/api/types.ts). `verificationToken` is dropped: verifyBuyer issued it
 * for the genuine card token and it means nothing next to a canned nonce.
 */
export async function usePayToken(page: Page, token: string): Promise<void> {
  await page.route(PAY_ROUTE, async (route) => {
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(route.request().postData() ?? "{}") as Record<
        string,
        unknown
      >;
    } catch {
      body = {};
    }
    body.sourceId = token;
    delete body.verificationToken;
    await route.continue({ postData: JSON.stringify(body) });
  });
}

/** The payment attempt the app persists next to the cart, as the page sees it. */
export async function readStoredAttempt(
  page: Page,
): Promise<null | Record<string, unknown>> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem("checkout-payment-attempt");
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  });
}

/** The cart-scoped checkout id, minted with the cart and dropped with it. */
export async function readCheckoutId(page: Page): Promise<null | string> {
  return page.evaluate(() => {
    try {
      return localStorage.getItem("cart-checkout-id");
    } catch {
      return null;
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                               Page objects                                 */
/* -------------------------------------------------------------------------- */

export function payButton(page: Page) {
  return page.locator('button[type="submit"][form="checkout-form"]');
}

/** Field ids are dotted (`shipping.firstName`), so they need attribute form. */
function field(page: Page, name: string) {
  return page.locator(`[id="shipping.${name}"]`);
}

export async function fillShipping(page: Page): Promise<void> {
  await field(page, "firstName").fill(SHIPPING.firstName);
  await field(page, "lastName").fill(SHIPPING.lastName);
  await field(page, "email").fill(SHIPPING.email);
  await field(page, "phone").fill(SHIPPING.phone);
  await field(page, "address1").fill(SHIPPING.address1);
  await field(page, "address2").fill(SHIPPING.address2);
  await field(page, "city").fill(SHIPPING.city);
  await field(page, "state").fill(SHIPPING.state);
  await field(page, "postalCode").fill(SHIPPING.postalCode);
}

/**
 * Closes the storefront's unprompted dialogs. `OrderProcessingTimesModal` is
 * mounted on both the club page and /checkout and reopens on every mount with
 * no dismissal memory; while it is open Radix marks <main> aria-hidden, so no
 * role-based locator underneath it resolves.
 */
export async function dismissDialogs(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  // They open from a mount effect, so they can arrive a tick after load.
  await dialog
    .first()
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(() => undefined);

  for (let i = 0; i < 5 && (await dialog.count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await dialog
      .first()
      .waitFor({ state: "hidden", timeout: 3_000 })
      .catch(() => undefined);
  }
}

/**
 * Adds one product to the cart through the real storefront: club page → product
 * quick-view dialog → size → Add to Bag.
 */
export async function addProductToCart(page: Page): Promise<void> {
  await page.goto(`/clubs/${E2E.clubName.toLowerCase()}`);
  await page.waitForLoadState("networkidle");
  // "Order Processing Times" opens on every club page view and has no
  // dismissal memory, so it has to be closed each time.
  await dismissDialogs(page);

  const card = page.locator("button:has(h3)").first();
  await card.waitFor({ state: "visible", timeout: 60_000 });
  await card.click();

  const addToBag = page.getByRole("button", { name: /add to bag/i });
  await addToBag.waitFor({ state: "visible", timeout: 60_000 });

  const sizeSelect = page.locator("#size-select");
  if (await sizeSelect.count()) {
    const values = await sizeSelect
      .locator("option")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLOptionElement).value).filter(Boolean),
      );
    if (values.length > 0) await sizeSelect.selectOption(values[0]);
  }

  // Any required personalization field (player name/number) must be filled
  // or Add to Bag refuses.
  const customFields = page.locator('[role="dialog"] [id^="cf-"]');
  for (let i = 0; i < (await customFields.count()); i++) {
    const input = customFields.nth(i);
    const tag = await input.evaluate((el) => el.tagName);
    if (tag === "SELECT") {
      const values = await input
        .locator("option")
        .evaluateAll((els) =>
          els.map((e) => (e as HTMLOptionElement).value).filter(Boolean),
        );
      if (values.length > 0) await input.selectOption(values[0]);
    } else {
      await input.fill("10");
    }
  }

  await addToBag.click();
  await expect(page.getByText(/added to cart/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await dismissDialogs(page);
}

/**
 * Lands on /checkout with one product in the cart, the shipping form filled and
 * Square's card element mounted and ready. Attach the CheckoutLog *before*
 * calling this if the order-creation call matters to the test.
 */
export async function gotoCheckoutReady(page: Page): Promise<void> {
  await page.goto("/checkout");
  // /checkout mounts OrderProcessingTimesModal too.
  await dismissDialogs(page);

  // Cart sync (DELETE /cart + POST /cart/items) renders a blocking spinner.
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({
    timeout: 90_000,
  });

  // Square's card iframe only mounts once the SDK and payment-config resolve.
  await cardFrame(page)
    .locator("#cardNumber")
    .waitFor({ state: "visible", timeout: 90_000 });

  await fillShipping(page);
}

/** Full happy path up to "a valid card is typed and Pay is enabled". */
export async function prepareCheckout(
  page: Page,
  card: string = CARDS.success,
): Promise<void> {
  await addProductToCart(page);
  await gotoCheckoutReady(page);
  await fillCard(page, card);
  await expect(payButton(page)).toBeEnabled({ timeout: 30_000 });
}

/* -------------------------------------------------------------------------- */
/*                       Backend order state (for the report)                 */
/* -------------------------------------------------------------------------- */

export interface BackendOrder {
  orderNumber?: string;
  paymentStatus?: string;
  status?: string;
  total?: string;
  [key: string]: unknown;
}

/**
 * Reads the order back from the backend the way the Track Order page does
 * (`GET /api/orders/:orderNumber`), so the reported status is the backend's
 * own view rather than whatever the checkout UI last rendered.
 */
export async function fetchBackendOrder(
  request: APIRequestContext,
  orderNumber: string,
): Promise<BackendOrder | null> {
  if (!orderNumber) return null;
  const response = await request.get(
    `${E2E.appUrl}/api/orders/${encodeURIComponent(orderNumber)}`,
    { failOnStatusCode: false },
  );
  if (!response.ok()) return null;
  return (await response.json()) as BackendOrder;
}

/**
 * The shopper's JWT. The storageState cookie only authenticates requests to the
 * Next app on :3000; calling the NestJS backend directly needs the bearer token
 * the app keeps in localStorage, which `/api/shop/auth/session` also returns.
 */
export async function shopperToken(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(`${E2E.appUrl}/api/shop/auth/session`);
  expect(response.ok(), "the shopper session must be valid").toBeTruthy();
  const { token } = (await response.json()) as { token?: string };
  expect(token, "the session must carry a bearer token").toBeTruthy();
  return token as string;
}

/** Prints the backend's view of an order — the row the report needs. */
export async function reportOrder(
  request: APIRequestContext,
  label: string,
  order: { orderId: string; orderNumber: string } | undefined,
): Promise<void> {
  if (!order) {
    console.log(`\n>>> ORDER [${label}]: no order was created\n`);
    return;
  }
  const backend = await fetchBackendOrder(request, order.orderNumber);
  console.log(
    `\n>>> ORDER [${label}] orderId=${order.orderId} orderNumber=${order.orderNumber}\n` +
      `    backend: status=${backend?.status ?? "?"} ` +
      `paymentStatus=${backend?.paymentStatus ?? "?"} total=${backend?.total ?? "?"}\n` +
      `    raw: ${JSON.stringify(backend)?.slice(0, 600)}\n`,
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The backend payment-status endpoint the checkout reconciles through. */
export const PAYMENT_STATUS_ROUTE = "**/api/shop/checkout/payment-status/**";
