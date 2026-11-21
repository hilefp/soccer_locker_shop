import { defineConfig, devices } from "@playwright/test";

/**
 * E2E configuration for the checkout diagnostic suite.
 *
 * Both the Next app (3000) and the NestJS backend (4000) are expected to be
 * already running — the suite points at a Square *Sandbox* merchant and the
 * tests assert that before touching a card field.
 */

export const E2E = {
  /** Next.js app under test. */
  appUrl: process.env.E2E_APP_URL ?? "http://localhost:3000",
  /** NestJS backend the app talks to (Square Sandbox merchant). */
  backendUrl: process.env.E2E_API_URL ?? "http://localhost:4000",
  /** Club whose products the cart helper buys from. */
  clubName: process.env.E2E_CLUB ?? "Centner",
  /** Test shopper — created on demand by the auth setup project. */
  user: {
    email: process.env.E2E_EMAIL ?? "e2e-checkout-test@example.com",
    firstName: "E2E",
    lastName: "Tester",
    password: process.env.E2E_PASSWORD ?? "TestPass123!",
    phone: "+15551234567",
  },
} as const;

export const STORAGE_STATE = "e2e/.auth/shopper.json";

export default defineConfig({
  // Each test drives a real Square Sandbox charge; serial keeps the
  // request logs and the backend's order state unambiguous.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,

  testDir: "e2e",
  outputDir: "e2e/.artifacts",

  // Generous: a run includes SDK download, 3DS verification and a 15s
  // deliberate stall, plus a 40-attempt x 3s confirm poll.
  timeout: 180_000,
  expect: { timeout: 30_000 },

  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],

  use: {
    baseURL: E2E.appUrl,
    // Square localizes its iframe from the browser language — anything but
    // en-US renames the card placeholders and breaks every field selector.
    locale: "en-US",
    timezoneId: "America/New_York",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "on",
    video: "on",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],
});
