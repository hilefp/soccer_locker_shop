import { expect, test } from "@playwright/test";

import { E2E } from "../../playwright.config";
import {
  CARDS,
  CheckoutLog,
  addProductToCart,
  cardFrame,
  dismissDialogs,
  fillCard,
  gotoCheckoutReady,
  payButton,
  prepareCheckout,
  readStoredAttempt,
} from "../helpers/checkout";

/**
 * Payment audit — browser level, REAL Square Sandbox (the dev stack on :3000 →
 * :4000). Complements e2e/checkout-diagnostic.spec.ts. Every POST /pay body is
 * redacted by CheckoutLog; traces are kept only on failure.
 */

const SUCCESS_HEADING = /order received/i;

/** Console errors from our own app (Square's iframe noise excluded). */
function watchConsole(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    // CSP rejections are reported as console errors/warnings in all engines
    if (/content security policy|refused to (load|execute|frame|connect)/i.test(text)) {
      errors.push(`CSP: ${text.slice(0, 300)}`);
      return;
    }
    if (msg.type() !== "error") return;
    if (/squarecdn|pci-connect|sq-|google|apple/i.test(text)) return;
    errors.push(text.slice(0, 300));
  });
  return errors;
}

test.describe("AUDIT · payment UI", () => {
  test("PAY-001 successful Sandbox payment end to end (runs on every browser project)", async ({
    page,
  }, testInfo) => {
    const consoleErrors = watchConsole(page);
    const log = new CheckoutLog(page);
    await addProductToCart(page);
    // Deliberately NO wait here: the cart used to be persisted only after a
    // 500 ms debounce, and a hard navigation sooner than that lost the item
    // (Firefox exposed it — audit F-08). The pagehide flush must cover it.
    await gotoCheckoutReady(page);
    await fillCard(page, CARDS.success);
    await expect(payButton(page)).toBeEnabled({ timeout: 30_000 });
    await payButton(page).click();
    await expect(payButton(page)).toBeDisabled();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
    await log.settle();
    log.print(`PAY-001 ${testInfo.project.name}`);

    expect(log.of("pay")).toHaveLength(1);
    expect([200, 201]).toContain(log.of("pay")[0]?.status);
    expect(await readStoredAttempt(page)).toBeNull();
    console.log(`PAY-001 console errors: ${JSON.stringify(consoleErrors)}`);
    // F-14: the checkout CSP must not block anything the payment needs
    expect(consoleErrors.filter((e) => e.startsWith("CSP:"))).toEqual([]);
    // F-14: no <img src=""> on the checkout page
    expect(consoleErrors.filter((e) => /src.*empty string|missing required "src"/i.test(e))).toEqual([]);
  });

  test("NAV-001 back / forward / reload after a paid order never re-offers payment for it", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);
    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });

    await page.reload();
    await dismissDialogs(page);
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 60_000 });

    await page.goBack();
    await dismissDialogs(page);
    await page.goForward();
    await dismissDialogs(page);
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 60_000 });

    await log.settle();
    log.print("NAV-001");
    expect(log.of("pay")).toHaveLength(1);
    expect(log.of("")).toHaveLength(1); // one order creation
  });
});

test.describe("AUDIT · duplicate submissions across tabs", () => {
  test("DUP-008 the same cart paid from two tabs at the same time → exactly one successful charge", async ({
    context,
    page,
  }) => {
    await addProductToCart(page);
    const tabA = page;
    const tabB = await context.newPage();
    const logA = new CheckoutLog(tabA);
    const logB = new CheckoutLog(tabB);

    await gotoCheckoutReady(tabA);
    await gotoCheckoutReady(tabB);
    await fillCard(tabA, CARDS.success);
    await fillCard(tabB, CARDS.success);
    await expect(payButton(tabA)).toBeEnabled({ timeout: 30_000 });
    await expect(payButton(tabB)).toBeEnabled({ timeout: 30_000 });

    await Promise.all([payButton(tabA).click(), payButton(tabB).click()]);

    // Let both tabs reach whatever final state they reach.
    await Promise.all(
      [tabA, tabB].map((p) =>
        p
          .getByText(/order received|already paid|verifying|declined|could not|unable/i)
          .first()
          .waitFor({ timeout: 150_000 })
          .catch(() => undefined),
      ),
    );
    await tabA.waitForTimeout(5_000);
    await logA.settle();
    await logB.settle();
    logA.print("DUP-008 tab A");
    logB.print("DUP-008 tab B");

    const pays = [...logA.of("pay"), ...logB.of("pay")];
    const succeeded = pays.filter(
      (c) => typeof c.status === "number" && c.status >= 200 && c.status < 300,
    );
    const orderIds = new Set(
      [...logA.of(""), ...logB.of("")].map((c) => c.orderId).filter(Boolean),
    );
    const paidOrderIds = new Set(succeeded.map((c) => c.orderId));
    console.log(
      `DUP-008 orders created=${orderIds.size} pay calls=${pays.length} ` +
        `2xx=${succeeded.length} distinct paid orders=${paidOrderIds.size}`,
    );
    expect(paidOrderIds.size, "one cart must produce one paid order").toBe(1);
  });
});

test.describe("AUDIT · A1 — order lookup errors read as 'order gone'", () => {
  test("A1-001 a throttled lookup must never report an existing order as missing (404)", async ({
    page,
    request,
  }) => {
    // A real paid order to look up
    const log = new CheckoutLog(page);
    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
    await log.settle();
    const orderNumber = log.order?.orderNumber as string;
    expect(orderNumber).toBeTruthy();

    // The shop's recovery polls GET /api/orders/:n, which the Next SERVER
    // forwards to the backend — so every shopper shares one throttle bucket.
    const statuses: number[] = [];
    for (let i = 0; i < 36; i++) {
      const r = await request.get(`${E2E.appUrl}/api/orders/${orderNumber}`, {
        failOnStatusCode: false,
      });
      statuses.push(r.status());
    }
    const counts = statuses.reduce<Record<number, number>>(
      (acc, s) => ((acc[s] = (acc[s] ?? 0) + 1), acc),
      {},
    );
    console.log(`A1-001 Next /api/orders/${orderNumber} statuses: ${JSON.stringify(counts)}`);

    // Now a browser that holds a saved attempt for that PAID order reloads
    await page.evaluate(
      ([n, id]) =>
        localStorage.setItem(
          "checkout-payment-attempt",
          JSON.stringify({
            checkoutId: "audit",
            orderId: id,
            orderNumber: n,
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            total: 1,
          }),
        ),
      [orderNumber, log.order?.orderId as string],
    );
    await page.goto("/checkout");
    await dismissDialogs(page);
    await page.waitForTimeout(8_000);
    const attemptAfter = await readStoredAttempt(page);
    console.log(
      `A1-001 saved attempt after reload while throttled: ${JSON.stringify(attemptAfter)}`,
    );

    // Invariant: an existing order must never be reported as missing, and a
    // paid order must be recognised as paid (not "gone", not a card form).
    // Recovery now asks the authenticated payment-status endpoint, so the
    // public lookup's throttle cannot affect it; the attempt is cleared only
    // because the payment was settled as PAID.
    expect(statuses.filter((s) => s === 404), "existing order reported 404").toHaveLength(0);
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 30_000 });
    await expect(cardFrame(page).locator("#cardNumber")).toHaveCount(0);
    expect(attemptAfter, "attempt cleared only after PAID was confirmed").toBeNull();
  });
});

test.describe("AUDIT · mobile", () => {
  test.use({ viewport: { height: 844, width: 390 }, isMobile: true, hasTouch: true });
  test("PAY-001-mobile the card form mounts and a payment succeeds at phone width", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);
    await addProductToCart(page);
    await gotoCheckoutReady(page);
    await expect(cardFrame(page).locator("#cardNumber")).toBeVisible();
    await fillCard(page, CARDS.success);
    await payButton(page).scrollIntoViewIfNeeded();
    await payButton(page).click();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
    await log.settle();
    expect(log.of("pay")).toHaveLength(1);
  });
});

test.describe("AUDIT · coupon", () => {
  test("CPN-001 a FREE_SHIPPING coupon zeroes shipping and the charged total matches the backend", async ({
    page,
  }) => {
    const code = process.env.E2E_COUPON ?? "";
    test.skip(!code, "E2E_COUPON not set");
    const log = new CheckoutLog(page);
    await addProductToCart(page);
    await gotoCheckoutReady(page);
    await page.getByPlaceholder(/enter code/i).fill(code);
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/free shipping|coupon applied/i).first()).toBeVisible({ timeout: 30_000 });
    await fillCard(page, CARDS.success);
    await payButton(page).click();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
    await log.settle();
    const created = log.of("")[0]?.responseBody as { shippingTotal?: number; total?: number; subtotal?: number; taxTotal?: number };
    const paid = log.of("pay")[0]?.responseBody as { total?: number };
    console.log(`CPN-001 created=${JSON.stringify(created)} paidTotal=${paid?.total}`);
    expect(created.shippingTotal).toBe(0);
    expect(Number(paid?.total)).toBeCloseTo(Number(created.subtotal) + Number(created.taxTotal), 2);
  });
});
