import { expect, test as setup } from "@playwright/test";

import { E2E, STORAGE_STATE } from "../playwright.config";

/**
 * Signs the test shopper in through the real login form and saves the
 * resulting `auth-token` cookie as storageState. Registers the account first
 * if the backend doesn't have it yet (the register route is idempotent enough:
 * a duplicate email answers 409 and we fall straight through to login).
 */
setup("authenticate the test shopper", async ({ page, request }) => {
  const register = await request.post(
    `${E2E.appUrl}/api/shop/auth/register`,
    {
      data: {
        email: E2E.user.email,
        firstName: E2E.user.firstName,
        lastName: E2E.user.lastName,
        password: E2E.user.password,
        phone: E2E.user.phone,
      },
      failOnStatusCode: false,
    },
  );
  // 200 = created, 409 = already there. Anything else is a broken backend.
  expect(
    [200, 201, 409].includes(register.status()),
    `register returned ${register.status()}: ${await register.text()}`,
  ).toBeTruthy();

  await page.goto("/auth/login");

  // The "Welcome to Our New Platform" dialog renders over the form and makes
  // <main> aria-hidden. It remembers its own dismissal in localStorage, so
  // setting the flag here bakes it into the saved storageState for every test.
  await page.evaluate(() =>
    localStorage.setItem("platform-transition-dismissed", "true"),
  );
  await page.reload();

  await page.locator("#email").fill(E2E.user.email);
  await page.locator("#password").fill(E2E.user.password);
  await page.getByRole("button", { name: /^login$/i }).click();

  // The app redirects away from /auth/login once the session cookie is set.
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 60_000 });

  const session = await page.request.get("/api/shop/auth/session");
  expect(session.ok(), "session endpoint should recognize the shopper").toBeTruthy();

  await page.context().storageState({ path: STORAGE_STATE });
});
