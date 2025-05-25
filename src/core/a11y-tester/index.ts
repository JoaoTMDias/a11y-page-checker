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
   * Print a progress bar for completed/total.
   */
  private printProgress(completed: number, total: number) {
    const barLength = 20;
    const filled = Math.round((completed / total) * barLength);
    const bar = chalk.green("█").repeat(filled) + chalk.gray("░").repeat(barLength - filled);
    process.stdout.write(`\r[${bar}] ${completed}/${total} done`);
  }

  /**
   * Process URLs in chunks, with per-page and progress feedback.
   *
   * @param param0 - ProcessChunksProps plus verbose flag
   * @param verbose - Whether to print verbose per-page results
   * @returns Processed results
   */
  private async processChunks({ urls, concurrent, concurrentPages, results }: ProcessChunksProps, verbose = false) {
    const chunks = chunk(urls, concurrent);
    const processedResults = { ...results };
    let completed = 0;
    const total = urls.length;

    for (const [chunkIndex, chunkUrls] of chunks.entries()) {
      const chunkResults = await Promise.all(
        chunkUrls.map(async (url, idx) => {
          const page = concurrentPages[idx];
          const result = await this.testUrl(url, page);
          completed++;

          // Per-page feedback (always on a new line)
          let line = `[${completed}/${total}] ${chalk.cyan(url)} `;
          if (result.error) {
            line += chalk.red(`Error: ${result.error.split("\n")[0]}`);
          } else if (!result.violations || result.violations.length === 0) {
            line += chalk.green("0 issues ✅");
          } else {
            line += chalk.red(`${result.violations.length} issues ❌`);
            if (verbose && result.violations.length > 0) {
              const top = result.violations[0];
              line += `\n   - [${top.impact}] ${top.help}`;
            }
          }
          console.log(line);

          // Print progress bar after per-page result
          this.printProgress(completed, total);

          return result;
        }),
      );

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
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    process.stdout.write("\n\n");
    return processedResults;
  }

  /**
   * Tests accessibility for an array of URLs.
   *
   * @param {string[]} urls - Array of URLs to test
   * @param {boolean} [verbose=false] - Whether to print verbose per-page results
   * @returns {Promise<TestResults>} Results of accessibility testing including violations and summary
   */
  async testUrls(urls: string[], verbose = false): Promise<TestResults> {
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

      const processedResults = await this.processChunks(
        {
          urls,
          concurrent: this.config.concurrent,
          concurrentPages,
          results,
        },
        verbose,
      );

      return processedResults;
    } finally {
      await browser.close();
    }
  }
}
