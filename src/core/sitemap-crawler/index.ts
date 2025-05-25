/* eslint-disable no-await-in-loop */
import { Parser } from "xml2js";
import { readFile } from "node:fs/promises";
import { ParsedCrawledResult, SitemapConfig, SitemapEntry, SitemapURL } from "../../types.ts";
import { isEmpty, isNil } from "@jtmdias/js-utilities";

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
async function fetchWithTimeout(resource: Request | URL | string, options: FetchWithTimeoutOptions = {}) {
  const { timeout = 30_000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });

  clearTimeout(id);

  return response;
}

function transformEntriesToList({ changefreq, lastmod, loc, priority }: SitemapURL): SitemapEntry {
  const changeFrequency = changefreq?.[0] || null;
  const lastModified = lastmod?.[0].toString() || null;
  const path = new URL(loc[0]).pathname;
  const priorityValue = priority ? Number.parseFloat(priority[0]) : null;
  const slug = new URL(loc[0]).pathname.split("/").filter(Boolean).pop() ?? "";
  const url = loc[0];

  return {
    changeFrequency,
    lastModified,
    path,
    priority: priorityValue,
    slug,
    url,
  };
}

// Parse the XML content
const xmlParser = new Parser();

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
      concurrent: 2,
      maxRetries: 3,
      timeout: 30_000,
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
   * Reads content from either a local file or a URL
   * @param {string} pathOrUrl - Local file path or URL
   * @returns {Promise<string>} The content as a string
   */
  async readContent(pathOrUrl: string): Promise<string> {
    try {
      // Check if it's a URL
      new URL(pathOrUrl);
      // It's a URL, fetch it
      const response = await fetchWithTimeout(pathOrUrl, {
        timeout: 30_000,
      });
      return response.text();
    } catch {
      // Not a URL, treat as local file
      return readFile(pathOrUrl, "utf-8");
    }
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
      // Read the content from either local file or URL
      const data = await this.readContent(url);

      if (!isNil(data)) {
        const { urlset }: ParsedCrawledResult = await xmlParser.parseStringPromise(data);

        if (urlset.url && Array.isArray(urlset.url) && !isEmpty(urlset.url)) {
          // Extract and transform the entries
          const transformedEntries = urlset.url.map<SitemapEntry>(transformEntriesToList);

          return transformedEntries;
        }
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch sitemap: ${url}`, error);
      // Implement retry logic for failed requests
      if (retries < this.config.maxRetries) {
        console.log(`Retry ${retries + 1} for ${url}`);
        await new Promise((t) => {
          setTimeout(t, 5000);
        });
        return this.getSitemap(url, retries + 1);
      }

      return [];
    }
  }
}
