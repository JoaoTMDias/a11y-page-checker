import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { normalizeAxeResult } from "../normalizer/index.ts";
import type { Finding } from "@/types";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export class PageScanner {
  async scan(url: string, page: Page): Promise<Finding[]> {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const axeResult = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    return normalizeAxeResult(axeResult);
  }
}
