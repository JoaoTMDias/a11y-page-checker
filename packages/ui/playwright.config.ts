import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure" },
  webServer: {
    command: "A11Y_UI_PORT=4175 A11Y_UI_DATABASE=/tmp/a11y-ui-e2e.sqlite node dist/server/bin.js",
    port: 4175,
    reuseExistingServer: false,
  },
});
