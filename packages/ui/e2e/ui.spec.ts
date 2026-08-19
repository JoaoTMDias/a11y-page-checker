import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("creates a scan, persists it and exposes an accessible history", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Novo scan de acessibilidade" })).toBeVisible();
  await page.getByRole("tab", { name: "Markdown" }).click();
  await page.getByRole("textbox").fill("# Empty automated plan");
  await page.getByRole("button", { name: "Iniciar scan" }).click();
  await expect(page).toHaveURL(/\/scans\/[0-9a-f-]+$/);
  await expect(page.getByText(/Scan conclu/)).toBeVisible();

  const detailResults = await new AxeBuilder({ page }).analyze();
  expect(detailResults.violations).toEqual([]);

  await page.getByRole("link", { name: /Hist/ }).click();
  await expect(page.getByRole("cell", { name: "scan-plan.md" }).first()).toBeVisible();
});
