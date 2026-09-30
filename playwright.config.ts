import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  workers: 1,
  use: {
    actionTimeout: 10000,
    baseURL: process.env.FOCUSGO_E2E_BASE_URL ?? "http://127.0.0.1:5173",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
