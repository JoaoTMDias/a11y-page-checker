import { chromium, devices, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SitemapConfig, TestResults } from "./types";

/**
 * AccessibilityTester is responsible for running accessibility tests on web pages
 * using Playwright and Axe-core.
 *
 * @example
 * ```typescript
 * const tester = new AccessibilityTester({
 *   timeout: 30000,
 *   concurrent: 2
 * });
 *
 * const results = await tester.testUrls([
 *   'https://example.com/page1',
 *   'https://example.com/page2'
 * ]);
 * ```
 */
export class AccessibilityTester {
  /** Configuration settings for the accessibility tester */
  private config: Required<SitemapConfig>;

  /**
   * Creates a new instance of AccessibilityTester.
   *
   * @param {SitemapConfig} [config] - Optional configuration settings
   * @param {number} [config.timeout=30000] - Maximum time (in ms) to wait for page load
   * @param {number} [config.maxRetries=3] - Number of times to retry failed tests
   * @param {number} [config.concurrent=2] - Number of concurrent pages to test
   * @param {number} [config.waitForTimeout=5000] - Time to wait after page load before testing
   */
  constructor(config?: SitemapConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      concurrent: 2,
      waitForTimeout: 0,
      ...config,
    };
  }

  /**
   * Tests accessibility for an array of URLs.
   *
   * @param {string[]} urls - Array of URLs to test
   * @returns {Promise<TestResults>} Results of accessibility testing including violations and summary
   *
   * @throws {Error} If browser launching fails
   *
   * @example
   * ```typescript
   * const results = await tester.testUrls([
   *   'https://example.com/page1',
   *   'https://example.com/page2'
   * ]);
   * console.log(`Found ${results.summary.totalViolations} violations`);
   * ```
   */
  async testUrls(urls: string[]): Promise<TestResults> {
    const browser = await chromium.launch();
    const results: TestResults = {
      summary: {
        totalPages: urls.length,
        pagesWithViolations: 0,
        totalViolations: 0,
        completedAt: new Date().toISOString(),
      },
      violations: [],
    };

    try {
      // Create a pool of pages based on concurrent config
      const CONCURRENT_PAGES = await Promise.all(
        Array(this.config.concurrent)
          .fill(null)
          .map(async () => {
            const context = await browser.newContext(devices["Desktop Chrome"]);
            const page = await context.newPage();

            return page;
          })
      );

      // Process URLs in chunks
      for (let i = 0; i < urls.length; i += this.config.concurrent) {
        const chunk = urls.slice(i, i + this.config.concurrent);
        const chunkResults = await Promise.all(
          chunk.map((url, index) => this.testUrl(url, CONCURRENT_PAGES[index]))
        );

        results.violations.push(...chunkResults);

        // Update summary
        const violationsInChunk = chunkResults.filter(
          (r) => r.violations && r.violations.length > 0
        );
        results.summary.pagesWithViolations += violationsInChunk.length;
        results.summary.totalViolations += violationsInChunk.reduce(
          (sum, r) => sum + (r.violations?.length || 0),
          0
        );

        // Optional delay between chunks
        if (i + this.config.concurrent < urls.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return results;
    } finally {
      await browser.close();
    }
  }

  /**
   * Tests accessibility for a single URL using a provided Playwright page.
   *
   * @param {string} url - URL to test
   * @param {Page} page - Playwright page instance to use for testing
   * @returns {Promise<TestResults["violations"][0]>} Results of testing the URL
   *
   * @throws {Error} If page navigation or accessibility testing fails
   *
   * @private
   */
  private async testUrl(url: string, page: Page): Promise<TestResults["violations"][0]> {
    try {
      // Navigate to the page and wait for it to load
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: this.config.timeout,
      });

      await page.waitForLoadState("domcontentloaded");

      if (this.config.waitForTimeout) {
        await new Promise((t) => setTimeout(t, this.config.waitForTimeout));
      }

      // Run accessibility tests using Axe
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      return {
        url,
        timestamp: new Date().toISOString(),
        violations: accessibilityScanResults.violations,
      };
    } catch (error) {
      return {
        url,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
