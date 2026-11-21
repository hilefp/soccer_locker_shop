import { expect, type Page, test } from "@playwright/test";

import {
  CARDS,
  CheckoutLog,
  fillCard,
  payButton,
  prepareCheckout,
  readStoredAttempt,
} from "../helpers/checkout";

/**
 * 3DS / SCA with a CHALLENGE — REAL Square Sandbox (dev stack :3000 → :4000).
 *
 * Square's Sandbox SCA cards for the Web Payments SDK:
 * https://developer.squareup.com/docs/devtools/sandbox/payments
 * The challenge is Square's simulated issuer ACS, rendered in an iframe named
 * 3DSChallengeFlowIframe. In production that iframe points at the buyer's own
 * bank, a different domain per issuer, which is why the /checkout CSP allows
 * https: for frame-src and form-action (next.config.ts).
 *
 *   E2E_EMAIL=… E2E_PASSWORD=… npx playwright test -c playwright.audit.config.ts e2e/audit/checkout-3ds.spec.ts --project=chromium
 */

const SCA = {
  /** Visa EU: modal with verification code. */
  challenge: "4310000000201019",
  /** Mastercard (US): modal with verification code. */
  challengeMastercard: "5248480000210026",
  code: "123456",
  /** Visa: no challenge, verification fails. */
  failedVerification: "4811110000000008",
} as const;

const SUCCESS_HEADING = /order received/i;
const VERIFY_FAILED = /card verification was not completed/i;

function challengeFrame(page: Page) {
  return page.frameLocator('iframe[name="3DSChallengeFlowIframe"]');
}

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/content security policy|refused to (load|execute|frame|connect)/i.test(text)) {
      violations.push(text.slice(0, 300));
    }
  });
  return violations;
}

const payCalls = (log: CheckoutLog) => log.of("pay");

test.describe("AUDIT · 3DS with challenge", () => {
  for (const [label, card] of [
    ["Visa EU", SCA.challenge],
    ["Mastercard", SCA.challengeMastercard],
  ] as const) {
    test(`3DS-001 ${label}: the challenge opens, the right code charges exactly once`, async ({
      page,
    }) => {
      const csp = watchCsp(page);
      const log = new CheckoutLog(page);
      await prepareCheckout(page, card);
      await payButton(page).click();

      const otp = challengeFrame(page).locator("#otp");
      await expect(otp).toBeVisible({ timeout: 45_000 });
      // Nothing may be charged while the bank is still asking
      expect(payCalls(log)).toHaveLength(0);

      // The simulated ACS only enables "Authenticate" on real keystrokes
      await otp.click();
      await otp.pressSequentially(SCA.code, { delay: 50 });
      await challengeFrame(page).locator("#sendOtp").click();

      await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
      await log.settle();
      log.print(`3DS-001 ${label}`);

      const pays = payCalls(log);
      expect(pays).toHaveLength(1);
      expect([200, 201]).toContain(pays[0]?.status);
      // The 3DS result travelled with the payment
      expect((pays[0]?.requestBody as Record<string, unknown>)?.verificationToken).toBe("<redacted>");
      expect((pays[0]?.responseBody as Record<string, unknown>)?.status).toBe("NEW");
      expect(await readStoredAttempt(page)).toBeNull();
      expect(csp).toEqual([]);
    });
  }

  test("3DS-002 cancelling the challenge charges nothing and the buyer can pay again", async ({
    page,
  }) => {
    const csp = watchCsp(page);
    const log = new CheckoutLog(page);
    await prepareCheckout(page, SCA.challenge);
    await payButton(page).click();

    const cancel = challengeFrame(page).locator("#cancel");
    await expect(cancel).toBeVisible({ timeout: 45_000 });
    await cancel.click();

    await expect(page.getByText(VERIFY_FAILED)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(SUCCESS_HEADING)).toHaveCount(0);
    expect(payCalls(log)).toHaveLength(0); // never reached /pay → no charge

    // Retry with a card that needs no challenge
    await fillCard(page, CARDS.success);
    await expect(payButton(page)).toBeEnabled({ timeout: 30_000 });
    await payButton(page).click();
    await expect(page.getByText(SUCCESS_HEADING)).toBeVisible({ timeout: 120_000 });
    await log.settle();
    log.print("3DS-002");

    expect(payCalls(log)).toHaveLength(1);
    expect([200, 201]).toContain(payCalls(log)[0]?.status);
    expect(csp).toEqual([]);
  });

  test("3DS-003 a failed verification never confirms the order", async ({ page }) => {
    const csp = watchCsp(page);
    const log = new CheckoutLog(page);
    await prepareCheckout(page, SCA.failedVerification);
    await payButton(page).click();

    // Either the SDK refuses (no /pay at all) or Square declines the payment
    await expect(payButton(page)).toBeEnabled({ timeout: 90_000 });
    await log.settle();
    log.print("3DS-003");

    await expect(page.getByText(SUCCESS_HEADING)).toHaveCount(0);
    for (const call of payCalls(log)) {
      expect(call.status, "a failed 3DS must not produce a successful charge").not.toBe(200);
      expect(call.status).not.toBe(201);
    }
    console.log(
      `3DS-003 behaviour: ${payCalls(log).length === 0 ? "SDK refused, /pay never called" : `/pay → ${JSON.stringify(payCalls(log).map((c) => [c.status, c.responseBody]))}`}; ` +
        `message shown: ${await page.locator("text=/verification|declined|try again/i").first().textContent().catch(() => "?")}`,
    );
    expect(csp).toEqual([]);
  });
});
