import { expect, test } from "@playwright/test";

import { E2E } from "../playwright.config";
import {
  BAD_PAY_TOKENS,
  CARDS,
  CheckoutLog,
  PAY_ROUTE,
  cardFrame,
  dismissDialogs,
  fetchBackendOrder,
  fillCard,
  payButton,
  prepareCheckout,
  readCheckoutId,
  readStoredAttempt,
  reportOrder,
  shopperToken,
  sleep,
  usePayToken,
} from "./helpers/checkout";

/**
 * Diagnostic + regression suite for the embedded Square checkout.
 *
 * Every charge goes to the Square Sandbox merchant the backend reports from
 * /checkout/payment-config, which the first test asserts before any card is
 * typed.
 *
 * The app now reconciles an unresolved payment through the read-only
 * `GET /api/orders/:orderNumber` lookup; `POST /checkout/confirm` is behind
 * NEXT_PUBLIC_ENABLE_CHECKOUT_CONFIRM_POLLING and must stay silent by default.
 */

/** Text the UI must NOT show when the payment outcome is actually unknown. */
const FAILURE_WORDING =
  /(payment failed|declined|could not|couldn't|try again|error)/i;
const VERIFYING_WORDING = /verifying your payment/i;
const RECOVERY_WORDING = /checking your (last )?payment/i;
const SETTLING_WORDING = /confirming your payment/i;
const LOOKUP_FAILED_WORDING = /couldn.t check your payment/i;
const ALREADY_PAID_WORDING = /already paid/i;
const SUCCESS_HEADING = /order received/i;

/** Codes the frontend accepts as "no money was taken". */
const NOT_CHARGED_CODES = [
  "INVALID_PAYMENT_TOKEN",
  "ORDER_EXPIRED",
  "PAYMENT_DECLINED",
];

/* -------------------------------------------------------------------------- */

test.describe("Checkout — embedded Square card flow", () => {
  test("0 · guard: the backend points at a Square Sandbox merchant", async ({
    request,
  }) => {
    const token = await shopperToken(request);
    const response = await request.get(
      `${E2E.backendUrl}/api/shop/checkout/payment-config`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(
      response.ok(),
      `payment-config must be reachable (got ${response.status()})`,
    ).toBeTruthy();
    const config = (await response.json()) as {
      applicationId: string;
      environment: string;
      locationId: string;
    };
    console.log(`\n>>> SQUARE CONFIG: ${JSON.stringify(config)}\n`);

    // Refuse to run the rest of the suite against a live merchant.
    expect(config.environment, "Square environment must be sandbox").toBe(
      "sandbox",
    );
    expect(
      config.applicationId,
      "applicationId must carry the sandbox- prefix",
    ).toMatch(/^sandbox-/);
    expect(config.locationId, "locationId must be present").toBeTruthy();
  });

  /* ------------------------------------------------------------------ 1 --- */

  test("1 · a successful payment reaches the confirmation screen and clears the saved attempt", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);
    await prepareCheckout(page, CARDS.success);

    await payButton(page).click();

    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({
      timeout: 120_000,
    });

    await log.settle();
    log.print("case 1 — success");
    await reportOrder(request, "case 1 — success", log.order);

    expect(log.of("pay"), "exactly one POST /pay").toHaveLength(1);
    expect(log.of("pay")[0]?.status).toBe(201);

    // A settled payment is one of only two reasons to drop the record
    expect
      .soft(
        await readStoredAttempt(page),
        "the saved attempt is cleared on success",
      )
      .toBeNull();
  });

  /* ------------------------------------------------------------------ 2 --- */

  test("2 · a declined card explains itself, leaves the order unpaid, and allows a retry that succeeds", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);
    await prepareCheckout(page, CARDS.declined);

    await payButton(page).click();

    const declineMessage = page.locator("p.text-destructive").filter({
      hasText: /declin/i,
    });
    await expect
      .soft(declineMessage, "a decline message is shown")
      .toBeVisible({ timeout: 120_000 });

    await expect
      .soft(page.getByText(SUCCESS_HEADING), "no success screen")
      .toHaveCount(0);

    await log.settle();
    const declinedOrder = log.order;
    log.print("case 2 — declined");
    await reportOrder(request, "case 2 — declined", declinedOrder);

    if (declinedOrder?.orderNumber) {
      const backend = await fetchBackendOrder(request, declinedOrder.orderNumber);
      expect
        .soft(
          backend?.status,
          "backend must not mark the declined order as paid",
        )
        .toMatch(/pending_payment|failed/i);
    }

    // --- retry with a good card -------------------------------------------
    await fillCard(page, CARDS.success);
    await expect(payButton(page)).toBeEnabled({ timeout: 30_000 });
    await payButton(page).click();

    await expect
      .soft(page.getByText(SUCCESS_HEADING), "the retry succeeds")
      .toBeVisible({ timeout: 120_000 });

    await log.settle();
    log.print("case 2 — after retry");
    await reportOrder(request, "case 2 — retry", log.order);
  });

  /* ------------------------------------------------------------------ 3 --- */

  test("3 · a charge whose response is lost reconciles itself instead of reporting a failure", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);

    /** Real backend outcomes for each /pay the page attempted. */
    const realCharges: { paymentId?: string; status: number }[] = [];

    await page.route(PAY_ROUTE, async (route) => {
      try {
        // The charge really happens…
        const response = await route.fetch({ timeout: 120_000 });
        const text = await response.text();
        let paymentId: string | undefined;
        try {
          paymentId = (JSON.parse(text) as { paymentId?: string }).paymentId;
        } catch {
          paymentId = undefined;
        }
        realCharges.push({ paymentId, status: response.status() });
      } catch (error) {
        console.log("   route.fetch failed:", (error as Error).message);
      }
      // …but the browser never sees the answer.
      await route.abort("connectionfailed").catch(() => undefined);
    });

    await prepareCheckout(page, CARDS.success);
    const payStarted = page.waitForRequest(
      (r) => r.url().includes("/checkout/pay") && r.method() === "POST",
    );
    await payButton(page).click();
    await payStarted;

    await expect
      .poll(() => realCharges.length, { timeout: 120_000 })
      .toBeGreaterThan(0);

    // --- the transport failure must not read as a payment failure ----------
    await expect
      .soft(page.getByText(VERIFYING_WORDING), "a verifying state is shown")
      .toBeVisible({ timeout: 30_000 });

    const errorTexts = (
      await page.locator("p.text-destructive").allInnerTexts()
    ).join(" ");
    expect
      .soft(errorTexts, "the UI must not claim the payment failed")
      .not.toMatch(FAILURE_WORDING);
    expect
      .soft(
        await payButton(page).isEnabled(),
        "the UI must not invite a second payment",
      )
      .toBe(false);

    // The attempt was persisted before /pay went out
    const stored = await readStoredAttempt(page);
    console.log(`\n>>> CASE 3 saved attempt: ${JSON.stringify(stored)}\n`);
    expect
      .soft(stored?.orderId, "the orderId was persisted before /pay")
      .toBeTruthy();
    expect
      .soft(stored?.checkoutId, "the checkoutId was persisted too")
      .toBeTruthy();

    // --- and it resolves itself from the read-only lookup ------------------
    await expect
      .soft(
        page.getByText(SUCCESS_HEADING),
        "the real outcome (paid) is recovered without the buyer doing anything",
      )
      .toBeVisible({ timeout: 90_000 });

    await page.unroute(PAY_ROUTE);
    await log.settle();
    log.print("case 3 — lost response");
    await reportOrder(request, "case 3 — lost response", log.order);

    const distinctPayments = new Set(
      realCharges
        .filter((c) => c.status >= 200 && c.status < 300)
        .map((c) => c.paymentId)
        .filter(Boolean),
    );
    console.log(
      `>>> CASE 3 DISTINCT Square payments: ${distinctPayments.size} ` +
        `${JSON.stringify([...distinctPayments])}\n`,
    );
    expect
      .soft(distinctPayments.size, "the buyer's card is charged at most once")
      .toBeLessThanOrEqual(1);

    expect
      .soft(
        log.of("order-lookup", "GET").length,
        "the read-only order lookup is what reconciles",
      )
      .toBeGreaterThan(0);
    expect
      .soft(log.of("confirm").length, "POST /checkout/confirm stays off")
      .toBe(0);
  });

  /* ------------------------------------------------------------------ 4 --- */

  test("4 · a 503 PAYMENT_STATUS_UNKNOWN is treated as verifying, not as a failure", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);

    await page.route(PAY_ROUTE, (route) =>
      route.fulfill({
        body: JSON.stringify({
          error: "PAYMENT_STATUS_UNKNOWN",
          message:
            "We could not confirm the payment status. Please wait while we verify.",
          statusCode: 503,
        }),
        contentType: "application/json",
        status: 503,
      }),
    );

    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();

    await expect
      .soft(page.getByText(VERIFYING_WORDING), "a verifying state is shown")
      .toBeVisible({ timeout: 60_000 });

    expect
      .soft(
        (await payButton(page).innerText()).trim(),
        "the Pay button reflects verification",
      )
      .toMatch(/verifying/i);
    expect
      .soft(await payButton(page).isEnabled(), "the Pay button stays locked")
      .toBe(false);

    const errorTexts = (
      await page.locator("p.text-destructive").allInnerTexts()
    ).join(" ");
    expect
      .soft(errorTexts, "it is not rendered as a failure")
      .not.toMatch(FAILURE_WORDING);

    // The /pay call was stubbed, so no charge exists: the lookup keeps saying
    // PENDING_PAYMENT and the UI must keep waiting rather than decide.
    await expect
      .poll(() => log.of("order-lookup", "GET").length, { timeout: 40_000 })
      .toBeGreaterThan(0);

    console.log(
      `\n>>> CASE 4 order lookups: ${log.of("order-lookup", "GET").length}, ` +
        `POST /confirm: ${log.of("confirm").length}\n`,
    );
    expect
      .soft(log.of("confirm").length, "POST /checkout/confirm stays off")
      .toBe(0);

    await log.settle();
    log.print("case 4 — 503 PAYMENT_STATUS_UNKNOWN");
    await reportOrder(request, "case 4 — 503", log.order);
    await page.unroute(PAY_ROUTE);
  });

  /* ------------------------------------------------------------------ 5 --- */

  test("5 · a 400 after the card was already charged recovers to the real outcome", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);
    let realCharge: { paymentId?: string; status: number } | undefined;

    await page.route(PAY_ROUTE, async (route) => {
      // The money really moves…
      const response = await route.fetch({ timeout: 120_000 });
      const text = await response.text();
      let paymentId: string | undefined;
      try {
        paymentId = (JSON.parse(text) as { paymentId?: string }).paymentId;
      } catch {
        paymentId = undefined;
      }
      realCharge = { paymentId, status: response.status() };
      // …and the app is told the request was malformed.
      await route.fulfill({
        body: JSON.stringify({
          error: "Bad Request",
          message: "Validation failed",
          statusCode: 400,
        }),
        contentType: "application/json",
        status: 400,
      });
    });

    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();

    await expect
      .poll(() => realCharge !== undefined, { timeout: 120_000 })
      .toBe(true);
    console.log(`\n>>> CASE 5 real backend charge: ${JSON.stringify(realCharge)}\n`);

    // A 400 with no recognized code must be treated as "may have been charged"
    await expect
      .soft(
        page.getByText(VERIFYING_WORDING),
        "an unrecognized error goes to verifying, not to a failure",
      )
      .toBeVisible({ timeout: 30_000 });

    const errorTexts = (
      await page.locator("p.text-destructive").allInnerTexts()
    ).join(" ");
    expect
      .soft(errorTexts, "the backend's raw message is not shown as a failure")
      .not.toMatch(/validation failed/i);
    expect
      .soft(
        await payButton(page).isEnabled(),
        "a charged buyer must not be able to re-pay",
      )
      .toBe(false);

    // …and the reconciliation finds the charge that really happened
    await expect
      .soft(
        page.getByText(SUCCESS_HEADING),
        "the real outcome (paid) is recovered",
      )
      .toBeVisible({ timeout: 90_000 });

    await page.unroute(PAY_ROUTE);
    await log.settle();
    log.print("case 5 — 400 after a real charge");
    await reportOrder(request, "case 5 — 400 after charge", log.order);
  });

  /* ------------------------------------------------------------------ 6 --- */

  test("6 · a slow /pay keeps the button locked and admits no second submission", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);
    const DELAY_MS = 15_000;

    await page.route(PAY_ROUTE, async (route) => {
      const response = await route.fetch({ timeout: 120_000 });
      await sleep(DELAY_MS);
      await route.fulfill({ response }).catch(() => undefined);
    });

    await prepareCheckout(page, CARDS.success);

    const payStarted = page.waitForRequest(
      (r) => r.url().includes("/checkout/pay") && r.method() === "POST",
    );
    await payButton(page).click();
    await payStarted;

    await expect
      .soft(payButton(page), "the Pay button is disabled while in flight")
      .toBeDisabled();
    expect
      .soft(
        (await payButton(page).innerText()).trim(),
        "the button shows progress",
      )
      .toMatch(/processing|verifying/i);
    await expect
      .soft(payButton(page).locator("svg.animate-spin"), "a spinner is visible")
      .toBeVisible();

    const payCallsBefore = log.of("pay").length;
    await payButton(page)
      .click({ force: true, timeout: 5_000 })
      .catch(() => undefined);
    // Submitting the form directly is the harder version of the same attempt.
    await page.evaluate(() => {
      const form = document.getElementById("checkout-form");
      (form as HTMLFormElement | null)?.requestSubmit();
    });
    await page.waitForTimeout(3_000);
    expect
      .soft(log.of("pay").length, "no second POST /pay while one is in flight")
      .toBe(payCallsBefore);

    await expect
      .soft(page.getByText(SUCCESS_HEADING), "the slow payment still completes")
      .toBeVisible({ timeout: 120_000 });

    await log.settle();
    log.print("case 6 — 15s slow response");
    await page.unroute(PAY_ROUTE);
  });

  /* ------------------------------------------------------------------ 7 --- */

  test("7 · a fast double click on Pay sends exactly one POST /pay and creates one order", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);
    await prepareCheckout(page, CARDS.success);

    // Two clicks in the same task — the worst case a React state guard faces,
    // and why the submit guard is a ref.
    await payButton(page).evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });

    await page.waitForTimeout(25_000);
    await log.settle();
    log.print("case 7 — double click");

    const pageText = await page.locator("body").innerText();
    console.log(
      `\n>>> CASE 7 POST /checkout (order creations): ${log.of("").length} ` +
        `statuses=${JSON.stringify(log.of("").map((c) => c.status))}\n` +
        `>>> CASE 7 POST /checkout/pay: ${log.of("pay").length} ` +
        `statuses=${JSON.stringify(log.of("pay").map((c) => c.status))}\n` +
        `>>> CASE 7 on success screen: ${SUCCESS_HEADING.test(pageText)}\n`,
    );

    expect.soft(log.of("pay").length, "exactly one POST /pay").toBe(1);
    expect.soft(log.of("").length, "exactly one order is created").toBe(1);
  });

  /* ------------------------------------------------------------------ 8 --- */

  test("8 · reloading while /pay is in flight resumes the real outcome without a second charge", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);
    let realCharge:
      | { body: string; paymentId?: string; status: number }
      | undefined;

    await page.route(PAY_ROUTE, async (route) => {
      try {
        const response = await route.fetch({ timeout: 120_000 });
        const text = await response.text();
        let paymentId: string | undefined;
        try {
          paymentId = (JSON.parse(text) as { paymentId?: string }).paymentId;
        } catch {
          paymentId = undefined;
        }
        realCharge = {
          body: text.slice(0, 400),
          paymentId,
          status: response.status(),
        };
        // Hold the answer so the reload lands while it is still "in flight",
        // then drop it: a reload kills the request, so the page must never
        // receive this response. (Releasing it instead — by fulfilling, or by
        // unrouting while this handler is parked — delivers a late 201 to the
        // document that is already navigating away, which is a harness
        // artifact rather than anything a browser does.)
        await sleep(20_000);
        await route.abort("connectionfailed");
      } catch {
        // The reload tears the request down — expected.
      }
    });

    await prepareCheckout(page, CARDS.success);

    const payStarted = page.waitForRequest(
      (r) => r.url().includes("/checkout/pay") && r.method() === "POST",
    );
    await payButton(page).click();
    await payStarted;

    const orderBeforeReload = log.order;
    console.log(
      `\n>>> CASE 8 order before reload: ${JSON.stringify(orderBeforeReload)}\n`,
    );

    // Wait until the backend has really taken the money, then reload.
    await expect
      .poll(() => realCharge !== undefined, { timeout: 120_000 })
      .toBe(true);
    console.log(`>>> CASE 8 real backend charge: ${JSON.stringify(realCharge)}\n`);

    // The route stays installed across the reload on purpose — see the handler
    const ordersBeforeReload = log.of("").length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissDialogs(page);

    // The returning buyer must land on a recovery check, never on a card form
    const recoveryShown = await page
      .getByText(RECOVERY_WORDING)
      .first()
      .isVisible()
      .catch(() => false);

    await expect
      .soft(
        page.getByText(SUCCESS_HEADING),
        "a paid order resumes as paid after a reload",
      )
      .toBeVisible({ timeout: 90_000 });

    const observed = {
      cardFormOfferedAgain:
        (await cardFrame(page).locator("#cardNumber").count()) > 0,
      ordersCreatedAfterReload: log.of("").length - ordersBeforeReload,
      recoveryCheckShown: recoveryShown,
    };
    console.log(
      `\n>>> CASE 8 after the reload:\n${JSON.stringify(observed, null, 2)}\n`,
    );

    await log.settle();
    log.print("case 8 — reload mid-flight");
    await reportOrder(request, "case 8 — reload mid-flight", orderBeforeReload);

    expect
      .soft(
        observed.cardFormOfferedAgain,
        "a paid order must not hand the buyer a blank card form again",
      )
      .toBe(false);
    expect
      .soft(
        observed.ordersCreatedAfterReload,
        "no second order may be created after the reload",
      )
      .toBe(0);
    expect
      .soft(
        await readStoredAttempt(page),
        "the recovered attempt is cleared once it is settled",
      )
      .toBeNull();

    await page.unroute(PAY_ROUTE);
  });
});

/* -------------------------------------------------------------------------- */
/*                  Recovering an unresolved payment on mount                 */
/* -------------------------------------------------------------------------- */

test.describe("Recovery of an unresolved payment", () => {
  /**
   * The hazard case for the missing backend lock: the buyer reloads while the
   * charge has not reached Square yet, so the order still reads
   * PENDING_PAYMENT at mount. Showing the card form there is how a second
   * payment on the same order happens.
   *
   * To make the charge land *after* the reload — rather than before it, which
   * is case 8 — the /pay body is captured and dropped on the way out, then
   * replayed from the test a few seconds later. The token is single-use but
   * was never spent, so the replay charges exactly as the browser would have.
   */
  test("9 · a reload while the charge is still in flight waits instead of offering the card form", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);
    /** The /pay body, held only to replay it. Never logged: it carries tokens. */
    let heldBody: string | undefined;

    await page.route(PAY_ROUTE, async (route) => {
      heldBody ??= route.request().postData() ?? undefined;
      // The backend never sees it yet, so the order stays PENDING_PAYMENT
      await route.abort("connectionfailed");
    });

    await prepareCheckout(page, CARDS.success);
    const payStarted = page.waitForRequest(
      (r) => r.url().includes("/checkout/pay") && r.method() === "POST",
    );
    await payButton(page).click();
    await payStarted;
    await expect.poll(() => heldBody !== undefined, { timeout: 60_000 }).toBe(true);

    const order = log.order;
    console.log(`\n>>> CASE 9 order: ${JSON.stringify(order)}\n`);
    expect(order?.orderNumber, "an order was created").toBeTruthy();

    const ordersBeforeReload = log.of("").length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissDialogs(page);

    // --- the buyer is held, not handed a card form ------------------------
    await expect
      .soft(
        page.getByText(SETTLING_WORDING),
        "a settling state is shown while the charge may still be in flight",
      )
      .toBeVisible({ timeout: 30_000 });
    expect
      .soft(
        await cardFrame(page).locator("#cardNumber").count(),
        "no card form while the charge may still be settling",
      )
      .toBe(0);

    // --- now let the charge land, as the backend would have done ----------
    const token = await shopperToken(request);
    const replay = await request.post(
      `${E2E.backendUrl}/api/shop/checkout/pay`,
      {
        data: JSON.parse(heldBody ?? "{}") as Record<string, unknown>,
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log(`>>> CASE 9 replayed /pay -> ${replay.status()}\n`);
    expect(replay.status(), "the replayed charge must succeed").toBeLessThan(300);

    // --- the settling poll picks it up without the buyer doing anything ---
    await expect
      .soft(
        page.getByText(SUCCESS_HEADING),
        "the settled charge is picked up by the poll",
      )
      .toBeVisible({ timeout: 90_000 });

    await page.unroute(PAY_ROUTE);
    await log.settle();
    log.print("case 9 — reload mid-charge");
    await reportOrder(request, "case 9 — reload mid-charge", order);

    expect
      .soft(
        log.of("").length - ordersBeforeReload,
        "no second order may be created",
      )
      .toBe(0);
    expect
      .soft(await readStoredAttempt(page), "the attempt is cleared once settled")
      .toBeNull();
  });

  /* ----------------------------------------------------------------- 10 --- */

  test("10 · a recovery lookup that keeps failing never strands a spinner and never offers Pay", async ({
    page,
    request,
  }) => {
    const log = new CheckoutLog(page);

    // Leave an unresolved attempt behind: the order is created, /pay dies.
    await page.route(PAY_ROUTE, (route) => route.abort("connectionfailed"));
    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();
    await expect
      .poll(async () => (await readStoredAttempt(page)) !== null, {
        timeout: 60_000,
      })
      .toBe(true);
    const order = log.order;

    // Now break the lookup the recovery depends on, and come back.
    await page.route("**/api/orders/*", (route) =>
      route.abort("connectionfailed"),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissDialogs(page);

    await expect
      .soft(
        page.getByText(LOOKUP_FAILED_WORDING),
        "a failed lookup ends in a message, not an endless spinner",
      )
      .toBeVisible({ timeout: 60_000 });

    // It names the order and offers no way to pay.
    await expect
      .soft(
        page.getByText(`#${order?.orderNumber ?? ""}`),
        "the order number is shown",
      )
      .toBeVisible();
    expect
      .soft(
        await cardFrame(page).locator("#cardNumber").count(),
        "no card form while the outcome is unknown",
      )
      .toBe(0);
    expect
      .soft(await payButton(page).count(), "no Pay button while unknown")
      .toBe(0);

    const checkAgain = page.getByRole("button", { name: /check again/i });
    await expect.soft(checkAgain, "a retry is offered").toBeVisible();

    const lookupsBefore = log.of("order-lookup", "GET").length;
    await checkAgain.click();
    await expect
      .soft(
        page.getByText(LOOKUP_FAILED_WORDING),
        "a retry that also fails returns to the same message",
      )
      .toBeVisible({ timeout: 60_000 });

    // And once the lookup works again, it resolves.
    await page.unroute("**/api/orders/*");
    await checkAgain.click();
    await expect
      .soft(
        page.getByText(LOOKUP_FAILED_WORDING),
        "a working lookup leaves the unknown state",
      )
      .toBeHidden({ timeout: 60_000 });

    await page.unroute(PAY_ROUTE);
    await log.settle();
    console.log(
      `\n>>> CASE 10 lookup attempts: ${log.of("order-lookup", "GET").length} ` +
        `(before the retry: ${lookupsBefore})\n`,
    );
    log.print("case 10 — lookup down");
    await reportOrder(request, "case 10 — lookup down", order);
  });
});

/* -------------------------------------------------------------------------- */
/*          Contract responses the backend does not send yet (409s)           */
/* -------------------------------------------------------------------------- */

test.describe("Contract responses — ready ahead of the backend", () => {
  test("11 · 409 ORDER_ALREADY_PAID shows the paid order and clears the cart", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);

    await page.route(PAY_ROUTE, (route) =>
      route.fulfill({
        body: JSON.stringify({
          error: "ORDER_ALREADY_PAID",
          message: "This order has already been paid.",
          statusCode: 409,
        }),
        contentType: "application/json",
        status: 409,
      }),
    );

    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();

    await expect
      .soft(
        page.getByText(ALREADY_PAID_WORDING).first(),
        "the buyer is told the order is already paid",
      )
      .toBeVisible({ timeout: 60_000 });

    await log.settle();
    const orderNumber = log.order?.orderNumber ?? "";
    await expect
      .soft(page.getByText(`#${orderNumber}`), "the order number is shown")
      .toBeVisible();

    const errorTexts = (
      await page.locator("p.text-destructive").allInnerTexts()
    ).join(" ");
    expect
      .soft(errorTexts, "it is not rendered as a failure")
      .not.toMatch(FAILURE_WORDING);

    expect
      .soft(await readStoredAttempt(page), "the saved attempt is cleared")
      .toBeNull();
    expect
      .soft(await readCheckoutId(page), "the cart's checkoutId is retired")
      .toBeNull();

    log.print("case 11 — ORDER_ALREADY_PAID");
    await page.unroute(PAY_ROUTE);
  });

  /* ----------------------------------------------------------------- 12 --- */

  test("12 · 409 PAYMENT_IN_PROGRESS is treated as verifying", async ({
    page,
  }) => {
    const log = new CheckoutLog(page);

    await page.route(PAY_ROUTE, (route) =>
      route.fulfill({
        body: JSON.stringify({
          error: "PAYMENT_IN_PROGRESS",
          message: "A payment for this order is already being processed.",
          statusCode: 409,
        }),
        contentType: "application/json",
        status: 409,
      }),
    );

    await prepareCheckout(page, CARDS.success);
    await payButton(page).click();

    await expect
      .soft(page.getByText(VERIFYING_WORDING), "a verifying state is shown")
      .toBeVisible({ timeout: 60_000 });
    expect
      .soft(await payButton(page).isEnabled(), "the Pay button stays locked")
      .toBe(false);

    const errorTexts = (
      await page.locator("p.text-destructive").allInnerTexts()
    ).join(" ");
    expect
      .soft(errorTexts, "it is not rendered as a failure")
      .not.toMatch(FAILURE_WORDING);

    // It reconciles through the read-only lookup, not through /confirm
    await expect
      .poll(() => log.of("order-lookup", "GET").length, { timeout: 40_000 })
      .toBeGreaterThan(0);
    expect
      .soft(log.of("confirm").length, "POST /checkout/confirm stays off")
      .toBe(0);

    await log.settle();
    log.print("case 12 — PAYMENT_IN_PROGRESS");
    await page.unroute(PAY_ROUTE);
  });
});

/* -------------------------------------------------------------------------- */
/*            Backend error mapping — real Square Sandbox tokens              */
/* -------------------------------------------------------------------------- */

/**
 * These never stub a response. Each one swaps the single-use token in the /pay
 * body (`sourceId`) for a Square Sandbox nonce that Square itself always
 * rejects, then lets the request reach the real backend — so what is under test
 * is the backend's own error mapping and the frontend's reading of it.
 *
 * None of these tokens can produce a charge, so every case must leave the order
 * unpaid, whatever code comes back.
 */
test.describe("Backend error mapping — real Square Sandbox tokens", () => {
  const cases = [
    { label: "already used", token: BAD_PAY_TOKENS.alreadyUsed },
    { label: "declined", token: BAD_PAY_TOKENS.declined },
    { label: "rejected CVV", token: BAD_PAY_TOKENS.rejectedCvv },
    { label: "rejected postal code", token: BAD_PAY_TOKENS.rejectedPostalCode },
  ];

  for (const { label, token } of cases) {
    test(`${token} → the UI follows whatever the backend says`, async ({
      page,
      request,
    }) => {
      const log = new CheckoutLog(page);
      await usePayToken(page, token);
      await prepareCheckout(page, CARDS.success);

      await payButton(page).click();

      // Wait for the backend's verdict on the (last) /pay round trip.
      await expect
        .poll(
          () =>
            log
              .of("pay")
              .filter((c) => typeof c.status === "number").length,
          { timeout: 120_000 },
        )
        .toBeGreaterThan(0);
      await page.waitForTimeout(6_000);
      await log.settle();

      const payCalls = log
        .of("pay")
        .filter((c) => typeof c.status === "number");
      const last = payCalls[payCalls.length - 1];
      const body = (last?.responseBody ?? {}) as {
        code?: string;
        error?: string;
        message?: string;
      };
      const errorCode = body.error;

      const pageText = await page.locator("body").innerText();
      const observed = {
        backendCode: body.code,
        backendError: errorCode,
        backendMessage: body.message,
        backendStatus: last?.status,
        onSuccessScreen: SUCCESS_HEADING.test(pageText),
        payAttempts: payCalls.length,
        payButtonEnabled: await payButton(page).isEnabled(),
        verifyingShown: VERIFYING_WORDING.test(pageText),
        visibleErrors: await page.locator("p.text-destructive").allInnerTexts(),
      };
      console.log(
        `\n>>> ${token} (${label}):\n${JSON.stringify(observed, null, 2)}\n`,
      );

      log.print(`token ${token}`);
      await reportOrder(request, `token ${label}`, log.order);

      // --- a rejected token can never have taken money --------------------
      expect
        .soft(observed.onSuccessScreen, "no success screen for a rejected token")
        .toBe(false);
      if (log.order?.orderNumber) {
        const backend = await fetchBackendOrder(request, log.order.orderNumber);
        expect
          .soft(backend?.status, "the order must not be paid")
          .toMatch(/pending_payment|failed/i);
      }

      // --- and the UI must follow the contract ----------------------------
      if (errorCode && NOT_CHARGED_CODES.includes(errorCode)) {
        expect
          .soft(
            observed.payButtonEnabled,
            `${errorCode} means no charge happened, so a retry must be offered`,
          )
          .toBe(true);
        expect
          .soft(
            observed.visibleErrors.join(" "),
            `${errorCode} must be explained to the buyer`,
          )
          .not.toBe("");
      } else {
        expect
          .soft(
            observed.verifyingShown,
            `unmapped code ${String(errorCode)} must be treated as "may have been charged"`,
          )
          .toBe(true);
        expect
          .soft(
            observed.payButtonEnabled,
            "an unknown outcome must not re-offer Pay",
          )
          .toBe(false);
      }
    });
  }
});
