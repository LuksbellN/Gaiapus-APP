import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "../../tests/e2e",
  testMatch: "frontend.spec.ts",
  outputDir: "./test-results",
  workers: 1,
  use: {
    baseURL: process.env.GAIAPUS_WEB_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
