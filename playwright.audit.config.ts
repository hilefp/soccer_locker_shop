import { defineConfig, devices } from "@playwright/test";

import base, { STORAGE_STATE } from "./playwright.config";

/**
 * Payment-audit run: the existing diagnostic suite + e2e/audit, against the
 * local dev stack and the Square SANDBOX merchant. Traces/screenshots only on
 * failure (they contain the shopper's local session); no video.
 *
 *   E2E_EMAIL=… E2E_PASSWORD=… npx playwright test -c playwright.audit.config.ts
 */
export default defineConfig({
  ...base,
  outputDir: "e2e/.artifacts/audit",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "e2e/.report/audit" }],
    ["json", { outputFile: "e2e/.report/audit/results.json" }],
  ],
  use: {
    ...base.use,
    trace: "retain-on-failure",
    video: "off",
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
      testMatch: /(checkout-diagnostic|audit\/checkout-audit|audit\/checkout-3ds)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      testMatch: /audit\/checkout-(audit|3ds)\.spec\.ts/,
      grep: /PAY-001 |3DS-001 Visa/,
      use: { ...devices["Desktop Firefox"], storageState: STORAGE_STATE },
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      testMatch: /audit\/checkout-(audit|3ds)\.spec\.ts/,
      grep: /PAY-001 |3DS-001 Visa/,
      use: { ...devices["Desktop Safari"], storageState: STORAGE_STATE },
    },
  ],
});
