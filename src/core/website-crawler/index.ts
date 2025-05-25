import { wait } from "@jtmdias/js-utilities";
import { Page, chromium, devices } from "@playwright/test";
import { SitemapEntry, WebsiteCrawlerConfig } from "@/types";
import { WEBSITE_CRAWLER_DEFAULTS } from "./constants";
import { WebsiteCrawlerError } from "./website-crawler-error";
import { UrlProcessor } from "./url-processor";
import { LinkExtractor } from "./link-extractor";
import { PageCrawler } from "./page-crawler";

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
  private readonly urlProcessor: UrlProcessor;
  private readonly linkExtractor: LinkExtractor;
  private readonly pageCrawler: PageCrawler;
  private queue: { depth: number; url: string }[] = [];
  private visited = new Set<string>();
  private results: SitemapEntry[] = [];
  private readonly config: Required<WebsiteCrawlerConfig>;
  private startTime: number = 0;
  private redirectCount: Map<string, number> = new Map();
  private readonly MAX_REDIRECTS = 5;
  private readonly MAX_CRAWL_TIME = 5 * 60 * 1000; // 5 minutes

  constructor(userConfig: WebsiteCrawlerConfig) {
    if (!userConfig.baseUrl) {
      throw new WebsiteCrawlerError("The target url needs to be defined.", "INVALID_CONFIG");
    }

    this.config = {
      ...WEBSITE_CRAWLER_DEFAULTS,
      ...userConfig,
      excludePatterns: userConfig.excludePatterns ?? WEBSITE_CRAWLER_DEFAULTS.excludePatterns,
      includePatterns: userConfig.includePatterns ?? WEBSITE_CRAWLER_DEFAULTS.includePatterns,
    };

    this.urlProcessor = new UrlProcessor(new URL(userConfig.baseUrl));
    this.linkExtractor = new LinkExtractor(this.urlProcessor);
    this.pageCrawler = new PageCrawler(this.config, this.urlProcessor);
  }

  /**
   * Starts the crawling process from the base URL.
   *
   * @returns {Promise<SitemapEntry[]>} Array of discovered pages
   * @throws {WebsiteCrawlerError} If crawling fails
   */
  async crawl(): Promise<SitemapEntry[]> {
    const browser = await chromium.launch({
      args: ["--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox", "--no-sandbox"],
    });
    this.results = [];
    this.startTime = Date.now();
    this.redirectCount.clear();

    try {
      const context = await browser.newContext({
        ...devices["Desktop Chrome"],
        userAgent: "Mozilla/5.0 (compatible; WebsiteCrawler/1.0; +https://github.com/your-repo)",
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
      });

      context.setDefaultTimeout(this.config.timeout);

      const concurrentPages = await Promise.all(
        Array.from({ length: this.config.concurrent }).map(() => context.newPage()),
      );

      const queueChunks = this.getInitialQueue(this.config.baseUrl, this.config.concurrent);

      for (const chunk of queueChunks) {
        if (Date.now() - this.startTime > this.MAX_CRAWL_TIME) {
          console.warn("Maximum crawl time exceeded. Stopping crawl.");
          break;
        }

        if (this.results.length >= this.config.maxPages) {
          break;
        }

        const crawlPromises = chunk.map(async ({ depth, url }, index) => {
          if (this.visited.has(url)) {
            return null;
          }

          const redirects = this.redirectCount.get(url) || 0;
          if (redirects >= this.MAX_REDIRECTS) {
            console.warn(`Too many redirects for ${url}. Skipping.`);
            return null;
          }

          this.visited.add(url);
          const result = await this.pageCrawler.crawlPage(concurrentPages[index], url);

          if (result.url !== url) {
            this.redirectCount.set(result.url, redirects + 1);
          }

          if (depth < this.config.maxDepth) {
            await this.discoverNewUrls(concurrentPages[index], url, depth);
          }

          return result;
        });

        const chunkResults = await Promise.all(crawlPromises);
        this.results.push(...chunkResults.filter((r): r is SitemapEntry => r !== null));

        if (this.hasMoreUrlsToProcess()) {
          await wait(1000);
        }
      }
    } catch (error) {
      console.error("Crawling failed:", error);
      throw new WebsiteCrawlerError(error instanceof Error ? error.message : "Unknown error occurred", "CRAWL_FAILED");
    } finally {
      await browser.close();
    }

    return this.results;
  }

  private async discoverNewUrls(page: Page, currentUrl: string, currentDepth: number): Promise<void> {
    try {
      const links = await this.linkExtractor.extractLinks(page);
      const newLinks = links.filter((link) => !this.visited.has(link));

      const maxNewLinks = Math.min(newLinks.length, this.config.maxPages - this.results.length);

      for (let i = 0; i < maxNewLinks; i++) {
        const link = newLinks[i];
        if (this.urlProcessor.isValidUrl(link)) {
          this.queue.push({
            depth: currentDepth + 1,
            url: link,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to discover new URLs from ${currentUrl}:`, error);
    }
  }

  private *getInitialQueue(url: string, concurrency: number) {
    this.queue = [{ depth: 0, url }];

    while (this.queue.length > 0) {
      yield this.queue.splice(0, concurrency);
    }
  }

  private hasMoreUrlsToProcess(): boolean {
    return this.queue.length > 0;
  }
}
