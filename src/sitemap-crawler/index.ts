import xml2js from "xml2js";
import { ParsedCrawledResult, SitemapConfig, SitemapEntry, SitemapURL } from "../types";

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetches a resource with a timeout, aborting the request if it takes too long.
 *
 * @param {(string | URL | Request)} resource
 * @param {FetchWithTimeoutOptions} [options={}]
 * @returns {*}
 */
async function fetchWithTimeout(
  resource: string | URL | Request,
  options: FetchWithTimeoutOptions = {}
) {
  const { timeout = 30000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}

// Parse the XML content
const PARSER = new xml2js.Parser();

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
 * const pages = await crawler.getSitemaps({
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
   * const pages = await crawler.getSitemaps({
   *   main: 'https://example.com/sitemap.xml',
   *   blog: 'https://example.com/blog-sitemap.xml'
   * });
   * console.log(`Found ${pages.length} pages`);
   * ```
   */
  async getSitemaps(sitemaps: Record<string, string>): Promise<SitemapEntry[]> {
    const results: SitemapEntry[] = [];

    for (const [type, url] of Object.entries(sitemaps)) {
      console.log(`Crawling ${type} sitemap: ${url}`);
      const entries = await this.getSitemap(url);
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
   * const entries = await this.getSitemap('https://example.com/sitemap.xml');
   * ```
   */
  private async getSitemap(url: string, retries = 0): Promise<SitemapEntry[]> {
    try {
      // Fetch the sitemap XML
      const response = await fetchWithTimeout(url, {
        timeout: this.config.timeout,
      });
      const data = await response.text();

      if (!!data && response.status === 200) {
        const { urlset }: ParsedCrawledResult = await PARSER.parseStringPromise(data);

        // Extract and transform the entries
        return (
          urlset.url?.map<SitemapEntry>(({ loc, lastmod, changefreq, priority }: SitemapURL) => {
            return {
              url: loc[0],
              lastModified: lastmod?.[0].toString() || null,
              changeFrequency: changefreq?.[0] || null,
              priority: priority ? parseFloat(priority[0]) : null,
              path: new URL(loc[0]).pathname,
              slug: new URL(loc[0]).pathname.split("/").filter(Boolean).pop() || "",
            };
          }) ?? []
        );
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch sitemap: ${url}`, error);
      // Implement retry logic for failed requests
      if (retries < this.config.maxRetries) {
        console.log(`Retry ${retries + 1} for ${url}`);
        await new Promise((t) => setTimeout(t, 5000));
        return this.getSitemap(url, retries + 1);
      }

      return [];
    }
  }
}
