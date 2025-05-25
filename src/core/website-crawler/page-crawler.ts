import { CrawlResult, WebsiteCrawlerConfig } from "@/types";
import { WebsiteCrawlerError } from "./website-crawler-error";
import { Page } from "@playwright/test";
import { UrlProcessor } from "./url-processor";

/**
 * PageCrawler is responsible for crawling a page and extracting the necessary information.
 *
 * @example
 * ```typescript
 * const pageCrawler = new PageCrawler(config, urlProcessor);
 * const crawlResult = await pageCrawler.crawlPage(page, url);
 *
 * console.log(crawlResult); // { url: 'https://example.com/page1', title: 'Page 1', description: 'This is page 1' }
 * ```
 */
export class PageCrawler {
  constructor(private readonly config: Required<WebsiteCrawlerConfig>, private readonly urlProcessor: UrlProcessor) {}

  /**
   * Crawls a page and extracts the necessary information.
   *
   * @param page - The page to crawl.
   * @param url - The URL of the page to crawl.
   * @returns The crawl result.
   */
  async crawlPage(page: Page, url: string): Promise<CrawlResult> {
    const timestamp = new Date().toISOString();
    const urlObj = new URL(url);

    try {
      const response = await page.goto(url, {
        timeout: this.config.timeout,
        waitUntil: "networkidle",
      });

      if (!response) {
        throw new WebsiteCrawlerError(`Failed to load page: No response received`, "NO_RESPONSE");
      }

      if (response.status() !== 200) {
        throw new WebsiteCrawlerError(`Failed to load page: HTTP ${response.status()}`, "HTTP_ERROR");
      }

      await page.waitForLoadState("domcontentloaded");

      if (this.config.waitForTimeout) {
        await page.waitForTimeout(this.config.waitForTimeout);
      }

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
}
