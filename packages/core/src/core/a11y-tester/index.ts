/* eslint-disable no-await-in-loop */
import { AxeBuilder } from "@axe-core/playwright";
import { Page, chromium, devices } from "@playwright/test";
import { SitemapConfig, TestResults, ProcessChunksProps } from "@/types";
import chalk from "chalk";
import { chunk, isEmpty, isNil, isString, template, wait } from "@jtmdias/js-utilities";
import { Result } from "axe-core";

type GetResultParams =
  | {
      state: "error";
      data: string;
      verbose: undefined;
    }
  | {
      state: "no-violations";
      data: undefined;
      verbose: undefined;
    }
  | {
      state: "has-violations";
      data: Result[];
      verbose: boolean;
    };

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
  private async _testUrl(url: string, page: Page): Promise<TestResults["violations"][0]> {
    try {
      console.log(chalk.bgBlue(chalk.white(`Checking ${url}...`)));

      // Navigate to the page and wait for it to load
      await page.goto(url, {
        timeout: this.config.timeout,
        waitUntil: "domcontentloaded",
      });

      if (this.config.waitForTimeout) {
        await wait(this.config.waitForTimeout);
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
  private _printProgress(completed: number, total: number) {
    const barLength = 20;
    const filled = Math.round((completed / total) * barLength);
    const bar = chalk.green("█").repeat(filled) + chalk.gray("░").repeat(barLength - filled);
    process.stdout.write(`\r[${bar}] ${completed}/${total} done`);
  }

  /**
   * Creates a summary list of all the violations
   * @param data
   * @returns
   */
  private _createOutputList(data: Result[]) {
    return data
      .map((item) => {
        return `* [${item.impact}] - ${item.description}`;
      })
      .join("\n");
  }

  /**
   * Returns the message according to the result's state.
   * @param params
   * @returns
   */
  private _getResultMessage({ state, data, verbose }: GetResultParams): string {
    switch (state) {
      case "error":
        return chalk.red(` Error: ${data.split("\n")[0]}`);

      case "no-violations":
        return chalk.green("✅ 0 issues");

      case "has-violations":
        const baseMessage = chalk.red(`❌ ${data.length} issues`);
        const output = verbose ? baseMessage.concat(`\n${this._createOutputList(data)}`) : baseMessage;

        return output;
    }
  }

  /**
   * Process URLs in chunks, with per-page and progress feedback.
   *
   * @param param0 - ProcessChunksProps plus verbose flag
   * @param verbose - Whether to print verbose per-page results
   * @returns Processed results
   */
  private async _processChunks({ urls, concurrent, concurrentPages, results }: ProcessChunksProps, verbose = false) {
    const chunks = chunk(urls, concurrent);
    const processedResults = { ...results };
    let completed = 0;
    const total = urls.length;

    for (const [chunkIndex, chunkUrls] of chunks.entries()) {
      const chunkResults = await Promise.all(
        chunkUrls.map(async (url, idx) => {
          const page = concurrentPages[idx];
          const result = await this._testUrl(url, page);
          const pageProgress = `${completed} of ${total}`;
          const title = chalk.cyan(url);
          let lineTemplate = `[${pageProgress}] ${title}: {{lineContent}}`;
          let resultTemplate = "";

          switch (true) {
            case !isNil(result.error) && isString(result.error):
              resultTemplate = this._getResultMessage({
                state: "error",
                data: result.error,
                verbose: undefined,
              });
              break;

            case !isNil(result.violations) && !isEmpty(result.violations):
              resultTemplate = this._getResultMessage({
                state: "has-violations",
                data: result.violations,
                verbose,
              });
              break;

            default:
              resultTemplate = this._getResultMessage({
                state: "no-violations",
                data: undefined,
                verbose: undefined,
              });
          }

          completed++;

          const message = template(lineTemplate, {
            lineContent: resultTemplate,
          });

          console.log(message);

          // Print progress bar after per-page result
          this._printProgress(completed, total);

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
  public async testUrls(urls: string[], verbose = false): Promise<TestResults> {
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

      const processedResults = await this._processChunks(
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
