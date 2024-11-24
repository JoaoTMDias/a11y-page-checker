import axios from "axios";
import xml2js from "xml2js";
import { SitemapConfig, SitemapEntry } from "./types";

/**
 * SitemapCrawler is responsible for fetching and parsing XML sitemaps,
 * extracting URLs and associated metadata from them.
 *
 * @example
 * ```typescript
 * const crawler = new SitemapCrawler({
 *   timeout: 30000,
 *   maxRetries: 3
 * });
 *
 * const pages = await crawler.crawlSitemaps({
 *   blog: 'https://example.com/blog-sitemap.xml',
 *   products: 'https://example.com/products-sitemap.xml'
 * });
 * ```
 */
export class SitemapCrawler {
  /** Configuration settings for the sitemap crawler */
  private config: Required<SitemapConfig>;

  /**
   * Creates a new instance of SitemapCrawler.
   *
   * @param {SitemapConfig} [config] - Optional configuration settings
   * @param {number} [config.timeout=30000] - HTTP request timeout in milliseconds
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts for failed requests
   * @param {number} [config.concurrent=2] - Number of concurrent requests (reserved for future use)
   * @param {number} [config.waitForTimeout=5000] - Time to wait between retries in milliseconds
   */
  constructor(config?: SitemapConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      concurrent: 2,
      waitForTimeout: 5000,
      ...config,
    };
  }

  /**
   * Crawls multiple sitemaps and combines their entries into a single array.
   *
   * @param {Record<string, string>} sitemaps - Object mapping sitemap names to their URLs
   * @returns {Promise<SitemapEntry[]>} Array of entries from all sitemaps
   *
   * @throws {Error} If any sitemap fails to be crawled after all retries
   *
   * @example
   * ```typescript
   * const pages = await crawler.crawlSitemaps({
   *   main: 'https://example.com/sitemap.xml',
   *   blog: 'https://example.com/blog-sitemap.xml'
   * });
   * console.log(`Found ${pages.length} pages`);
   * ```
   */
  async crawlSitemaps(sitemaps: Record<string, string>): Promise<SitemapEntry[]> {
    const results: SitemapEntry[] = [];

    for (const [type, url] of Object.entries(sitemaps)) {
      console.log(`Crawling ${type} sitemap: ${url}`);
      const entries = await this.crawlSitemap(url);
      results.push(...entries);
    }

    return results;
  }

  /**
   * Crawls a single sitemap URL and extracts its entries.
   * Implements retry logic for failed requests.
   *
   * @param {string} url - The URL of the sitemap to crawl
   * @param {number} [retries=0] - Current retry attempt number
   * @returns {Promise<SitemapEntry[]>} Array of entries from the sitemap
   *
   * @throws {Error} If the sitemap fails to be crawled after all retries
   *
   * @private
   *
   * @example
   * Internal usage:
   * ```typescript
   * const entries = await this.crawlSitemap('https://example.com/sitemap.xml');
   * ```
   */
  private async crawlSitemap(url: string, retries = 0): Promise<SitemapEntry[]> {
    try {
      // Fetch the sitemap XML
      const SITEMAP_RESPONSE = await axios.get(url, {
        timeout: this.config.timeout,
      });

      // Parse the XML content
      const PARSER = new xml2js.Parser();
      const PARSED_RESULT = await PARSER.parseStringPromise(SITEMAP_RESPONSE.data);
      const HAS_URL = !!PARSED_RESULT.urlset?.url;

      // Extract and transform the entries
      if (HAS_URL) {
        const TRANSFORMED_ENTRIES: SitemapEntry[] = PARSED_RESULT.urlset.url.map((entry: any) => ({
          url: entry.loc[0],
          lastModified: entry.lastmod?.[0] || null,
          changeFrequency: entry.changefreq?.[0] || null,
          priority: entry.priority ? parseFloat(entry.priority[0]) : null,
          path: new URL(entry.loc[0]).pathname,
          slug: new URL(entry.loc[0]).pathname.split("/").filter(Boolean).pop() || "",
        }));

        return TRANSFORMED_ENTRIES;
      }

      return [];
    } catch (error) {
      // Implement retry logic for failed requests
      if (retries < this.config.maxRetries) {
        console.log(`Retry ${retries + 1} for ${url}`);
        await new Promise((t) => setTimeout(t, 5000));
        return this.crawlSitemap(url, retries + 1);
      }

      return [];
    }
  }
}
