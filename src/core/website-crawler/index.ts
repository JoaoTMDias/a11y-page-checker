import { isNil } from "@jtmdias/js-utilities";
import { Page, chromium, devices } from "@playwright/test";
import { SitemapConfig, SitemapEntry } from "@/types";

interface WebsiteCrawlerConfig extends SitemapConfig {
  baseUrl: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDepth?: number;
  maxPages?: number;
}

interface CrawlResult {
  changeFrequency: null | string;
  lastModified: null | string;
  path: string;
  priority: null | number;
  slug: string;
  url: string;
}

/**
 * WebsiteCrawler is responsible for discovering pages on a website,
 * handling both traditional multi-page websites and Single-Page Applications (SPAs).
 *
 * @example
 * ```typescript
 * const crawler = new WebsiteCrawler({
 *   baseUrl: 'https://example.com',
 *   maxDepth: 3,
 *   timeout: 30000
 * });
 *
 * const pages = await crawler.crawl();
 * ```
 */
export class WebsiteCrawler {
  private baseUrl: URL;
  private config: Required<WebsiteCrawlerConfig>;
  private queue: { depth: number; url: string }[] = [];
  private results: CrawlResult[] = [];
  private visited = new Set<string>();

  /**
   * Creates a new instance of WebsiteCrawler.
   */
  constructor(config: WebsiteCrawlerConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      concurrent: config.concurrent || 2,
      excludePatterns: config.excludePatterns || [],
      includePatterns: config.includePatterns || [],
      maxDepth: config.maxDepth || 3,
      maxPages: config.maxPages || Number.POSITIVE_INFINITY,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30_000,
      waitForTimeout: config.waitForTimeout || 5000,
    };

    this.baseUrl = new URL(config.baseUrl);
  }

  /**
   * Starts the crawling process from the base URL.
   *
   * @returns {Promise<SitemapEntry[]>} Array of discovered pages
   * @throws {Error} If browser launching fails
   */
  async crawl(): Promise<SitemapEntry[]> {
    const browser = await chromium.launch();
    const results: SitemapEntry[] = [];

    try {
      // Create a pool of pages based on concurrent config
      const context = await browser.newContext(devices["Desktop Chrome"]);
      const concurrentPages = await Promise.all(
        Array.from({ length: this.config.concurrent }).map(() => context.newPage())
      );

      // Initialize queue with base URL
      const queueChunks = this.getInitialQueue();

      // Process each chunk of URLs
      for (const chunk of queueChunks) {
        // Skip processing if we've reached the maximum pages
        if (this.results.length >= this.config.maxPages) {
          break;
        }

        // Process current chunk of URLs concurrently
        const crawlPromises = chunk.map(async ({ depth, url }, index) => {
          // Skip already visited URLs
          if (this.visited.has(url)) {
            return null;
          }

          this.visited.add(url);
          const result = await this.crawlPage(concurrentPages[index], url);

          // Discover new URLs if we haven't reached max depth
          if (depth < this.config.maxDepth) {
            await this.discoverNewUrls(concurrentPages[index], url, depth);
          }

          return result;
        });

        // Wait for all URLs in current chunk to be processed
        const chunkResults = await Promise.all(crawlPromises);
        results.push(...chunkResults.filter((r): r is SitemapEntry => r !== null));

        // Add delay between chunks to avoid overwhelming the server
        if (this.hasMoreUrlsToProcess()) {
          await wait(1000);
        }
      }
    } finally {
      await browser.close();
    }

    return results;
  }

  /**
   * Crawls a single page and extracts its information.
   *
   * @param {Page} page - Playwright page object
   * @param {string} url - URL to crawl
   * @returns {Promise<CrawlResult>} Page crawl results
   * @private
   */
  private async crawlPage(page: Page, url: string): Promise<CrawlResult> {
    const timestamp = new Date().toISOString();
    const urlObj = new URL(url);

    try {
      const response = await page.goto(url, {
        timeout: this.config.timeout,
        waitUntil: "networkidle",
      });

      if (!response || response.status() !== 200) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      // Wait for client-side rendering
      await page.waitForLoadState("domcontentloaded");

      // Allow time for SPA routing and dynamic content
      if (this.config.waitForTimeout) {
        await page.waitForTimeout(this.config.waitForTimeout);
      }

      // Get links after everything has loaded
      const links = await this.extractLinks(page);

      // Add new links to queue if within depth limit
      return {
        changeFrequency: null,
        lastModified: timestamp,
        path: urlObj.pathname,
        priority: null,
        slug: urlObj.pathname.split("/").filter(Boolean).pop() || "",
        url,
      };
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
      return {
        changeFrequency: null,
        lastModified: timestamp,
        path: urlObj.pathname,
        priority: null,
        slug: urlObj.pathname.split("/").filter(Boolean).pop() || "",
        url,
      };
    }
  }

  /**
   * Discovers new URLs from the current page and adds them to the queue
   * @param page Playwright page object
   * @param currentUrl Current URL being processed
   * @param currentDepth Current crawl depth
   * @private
   */
  private async discoverNewUrls(
    page: Page,
    currentUrl: string,
    currentDepth: number
  ): Promise<void> {
    const links = await this.extractLinks(page);
    const newLinks = links.filter((link) => !this.visited.has(link));

    for (const link of newLinks) {
      this.queue.push({
        depth: currentDepth + 1,
        url: link,
      });
    }
  }

  /**
   * Extracts all links from a page, including those added by JavaScript.
   *
   * @param {Page} page - Playwright page object
   * @returns {Promise<string[]>} Array of discovered URLs
   * @private
   */
  private async extractLinks(page: Page): Promise<string[]> {
    // Get all links from the page, including those added by JavaScript
    const links = await page.evaluate(
      () =>
        [...document.querySelectorAll("a[href]")]
          .map((a) => a.getAttribute("href"))
          .filter((href) => !isNil(href)) as string[]
    );

    // Resolve relative URLs and filter valid ones
    return links
      .map((link) => {
        try {
          return new URL(link, this.baseUrl).toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null && this.isValidUrl(url));
  }

  /**
   * Gets the initial queue of URLs chunked for concurrent processing
   * @returns Array of URL chunks
   * @private
   */
  private *getInitialQueue() {
    this.queue = [{ depth: 0, url: this.config.baseUrl }];

    while (this.queue.length > 0) {
      yield this.queue.splice(0, this.config.concurrent);
    }
  }

  /**
   * Checks if there are more URLs to process
   * @returns boolean indicating if more URLs exist
   * @private
   */
  private hasMoreUrlsToProcess(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Checks if a URL is valid and should be crawled based on configuration.
   *
   * @param {string} url - URL to validate
   * @returns {boolean} Whether the URL should be crawled
   * @private
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Check if URL belongs to the same domain
      if (parsedUrl.hostname !== this.baseUrl.hostname) {
        return false;
      }

      // Check against exclude patterns
      if (this.config.excludePatterns?.some((pattern) => url.match(new RegExp(pattern)))) {
        return false;
      }

      // Check against include patterns
      if (this.config.includePatterns?.length) {
        return this.config.includePatterns.some((pattern) => url.match(new RegExp(pattern)));
      }

      return true;
    } catch {
      return false;
    }
  }
}
