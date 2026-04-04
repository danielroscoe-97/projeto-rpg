import { defineConfig, devices } from "@playwright/test";

/** When BASE_URL is set, tests run against a remote server (no local webServer). */
const isRemote = !!process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share state (DM session -> player join)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // sequential — tests depend on shared combat sessions
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: isRemote ? 90_000 : 60_000,
  expect: { timeout: isRemote ? 15_000 : 10_000 },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: isRemote ? 15_000 : 10_000,
    navigationTimeout: isRemote ? 30_000 : 15_000,
  },
  ...(!isRemote && {
    webServer: {
      command: process.env.CI ? "npm start" : "npm run dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
  outputDir: "./e2e/results",
});
