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
  // Drop the platform suffix so a single linux-CI-captured PNG is the
  // source of truth for every spec that uses toHaveScreenshot. Specs
  // enforce Linux-only execution via test.skip on non-linux platforms.
  snapshotPathTemplate: "{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  expect: {
    timeout: isRemote ? 15_000 : 10_000,
    // Project-level defaults so specs do not hand-tune tolerances and
    // drift apart. Absolute pixel budget beats ratio for regression
    // checks; threshold handles per-pixel AA noise.
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixels: 200,
      threshold: 0.2,
    },
  },
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
      // Activate dev-only test hooks for the Next.js server:
      //   - window.__pocketdm_supabase (client-side, see lib/e2e/expose-supabase.ts)
      //   - /api/e2e/* dev routes (seed-session-token, auth-as-anon, cleanup)
      // Hard gate: must be exactly the string "true"; any other value = off.
      env: {
        ...process.env,
        NEXT_PUBLIC_E2E_MODE: "true",
      } as Record<string, string>,
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
