/* eslint-disable no-await-in-loop */
import { AxeBuilder } from "@axe-core/playwright";
import { Page, chromium, devices } from "@playwright/test";
import { SitemapConfig, TestResults, ProcessChunksProps } from "@/types";
import chalk from "chalk";
import { chunk } from "@jtmdias/js-utilities";

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
      concurrent: 2,
      maxRetries: 3,
      timeout: 30_000,
      waitForTimeout: 0,
      ...config,
    };
  }

  /**
   * Tests accessibility for a single URL using a provided Playwright page.
   */
  private async testUrl(url: string, page: Page): Promise<TestResults["violations"][0]> {
    try {
      console.log(chalk.bgBlue(chalk.white(`Checking ${url}...`)));

      // Navigate to the page and wait for it to load
      await page.goto(url, {
        timeout: this.config.timeout,
        waitUntil: "networkidle",
      });

      await page.waitForLoadState("domcontentloaded");

      if (this.config.waitForTimeout) {
        await new Promise((t) => {
          setTimeout(t, this.config.waitForTimeout);
        });
      }

      // Run accessibility tests using Axe
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      return {
        timestamp: new Date().toISOString(),
        url,
        violations: accessibilityScanResults.violations,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        url,
      };
    }
  }

  /**
   * Process URLs in chunks
   *
   * @param param0
   * @returns
   */
  private async processChunks({ urls, concurrent, concurrentPages, results }: ProcessChunksProps) {
    const chunks = chunk(urls, concurrent);
    const processedResults = {
      ...results,
    };

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkResults = await Promise.all(chunk.map((url, index) => this.testUrl(url, concurrentPages[index])));

      processedResults.violations.push(...chunkResults);

      // Update summary
      const violationsInChunk = chunkResults.filter((r) => r.violations && r.violations.length > 0);
      processedResults.summary.pagesWithViolations += violationsInChunk.length;
      processedResults.summary.totalViolations += violationsInChunk.reduce(
        (sum, r) => sum + (r.violations?.length || 0),
        0,
      );

      // Optional delay between chunks, except for the last chunk
      if (chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }

    return processedResults;
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
        completedAt: new Date().toISOString(),
        pagesWithViolations: 0,
        totalPages: urls.length,
        totalViolations: 0,
      },
      violations: [],
    };

    try {
      // Create a pool of pages based on concurrent config
      const concurrentPages = await Promise.all(
        Array.from({ length: this.config.concurrent }).map(async () => {
          const context = await browser.newContext(devices["Desktop Chrome"]);
          return context.newPage();
        }),
      );

      const processedResults = await this.processChunks({
        urls,
        concurrent: this.config.concurrent,
        concurrentPages,
        results,
      });

      return processedResults;
    } finally {
      await browser.close();
    }
  }
}
