/* eslint-disable no-await-in-loop */
import { Parser } from "xml2js";
import { readFile } from "node:fs/promises";
import { ParsedCrawledResult, SitemapConfig, SitemapEntry, SitemapURL } from "../../types.ts";
import { isEmpty, isNil, makeCancelable, wait } from "@jtmdias/js-utilities";
import { SitemapCrawlerError } from "./sitemap-crawler-error.ts";

/**
 * Configuration options for fetch requests with timeout.
 */
interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds for the fetch request */
  timeout?: number;
}

/**
 * Represents a single entry in a JSON sitemap.
 */
interface JsonSitemapEntry {
  /** The URL of the page */
  url: string;
  /** Last modification date of the page */
  lastmod?: string;
  /** How frequently the page is likely to change */
  changefreq?: string;
  /** Priority of this URL relative to other URLs on the site */
  priority?: number;
}

/**
 * Represents a complete JSON sitemap structure.
 */
interface JsonSitemap {
  /** Array of URLs in the sitemap */
  urls: JsonSitemapEntry[];
}

/**
 * Fetches a resource with a timeout, aborting the request if it takes too long.
 *
 * @param resource - The URL or Request object to fetch
 * @param options - Optional fetch options including timeout
 * @returns A Promise that resolves to the Response object
 * @throws {SitemapCrawlerError} If the request fails or times out
 */
async function fetchWithTimeout(resource: Request | URL | string, options: FetchWithTimeoutOptions = {}) {
  const { timeout = 30_000 } = options;
  const controller = new AbortController();

  const fetchPromise = fetch(resource, {
    ...options,
    signal: controller.signal,
  }).then((response) => {
    if (!response.ok) {
      throw new SitemapCrawlerError(`Failed to fetch sitemap: HTTP ${response.status}`, "HTTP_ERROR");
    }
    return response;
  });

  const cancelable = makeCancelable(fetchPromise);
  const timeoutId = setTimeout(() => cancelable.cancel(), timeout);

  try {
    return await cancelable.promise;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Transforms a sitemap URL into a sitemap entry.
 *
 * @param {SitemapURL} param0 - The sitemap URL to transform
 * @returns The transformed sitemap entry
 * @throws {SitemapCrawlerError} If the transformation fails
 *
 * @example
 * ```typescript
 * const sitemapEntry = transformEntriesToList({
 *   changefreq: ["daily"],
 *   lastmod: ["2021-01-01"],
 *   loc: ["https://example.com/sitemap.xml"],
 *   priority: ["1.0"]
 * });
 * // Returns: { url: "https://example.com/sitemap.xml", path: "/sitemap.xml", lastModified: "2021-01-01", changeFrequency: "daily", priority: 1 }
 * ```
 */
function transformEntriesToList({ changefreq, lastmod, loc, priority }: SitemapURL): SitemapEntry {
  try {
    const url = loc[0];
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    return {
      url,
      path,
      lastModified: lastmod?.[0]?.toString(),
      changeFrequency: changefreq?.[0],
      priority: priority ? Number.parseFloat(priority[0]) : undefined,
      slug: path.split("/").filter(Boolean).pop(),
    };
  } catch (error) {
    throw new SitemapCrawlerError(
      `Failed to transform sitemap entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      "TRANSFORM_ERROR",
    );
  }
}

/**
 * Transforms a JSON sitemap entry into a sitemap entry.
 *
 * @param entry - The JSON sitemap entry to transform
 * @returns The transformed sitemap entry
 * @throws {SitemapCrawlerError} If the transformation fails
 *
 * @example
 * ```typescript
 * const sitemapEntry = transformJsonEntry({
 *   url: "https://example.com/sitemap.xml",
 *   lastmod: "2021-01-01",
 *   changefreq: "daily",
 *   priority: 1.0
 * });
 * // Returns: { url: "https://example.com/sitemap.xml", path: "/sitemap.xml", lastModified: "2021-01-01", changeFrequency: "daily", priority: 1 }
 * ```
 */
function transformJsonEntry(entry: JsonSitemapEntry): SitemapEntry {
  try {
    const urlObj = new URL(entry.url);
    const path = urlObj.pathname;

    return {
      url: entry.url,
      path,
      lastModified: entry.lastmod,
      changeFrequency: entry.changefreq,
      priority: entry.priority,
      slug: path.split("/").filter(Boolean).pop(),
    };
  } catch (error) {
    throw new SitemapCrawlerError(
      `Failed to transform JSON sitemap entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      "TRANSFORM_ERROR",
    );
  }
}

// Parse the XML content
const xmlParser = new Parser();

/**
 * SitemapCrawler is responsible for fetching and parsing sitemaps in both XML and JSON formats,
 * extracting URLs and associated metadata from them.
 *
 * @example
 * ```typescript
 * const crawler = new SitemapCrawler({
 *   timeout: 30000,
 *   maxRetries: 3,
 *   concurrent: 2
 * });
 *
 * const pages = await crawler.getSitemaps({
 *   main: 'https://example.com/sitemap.xml',
 *   blog: 'https://example.com/blog-sitemap.json'
 * });
 * ```
 */
export class SitemapCrawler {
  private readonly config: Required<SitemapConfig>;
  private startTime: number = 0;
  private readonly MAX_CRAWL_TIME = 5 * 60 * 1000; // 5 minutes

  /**
   * Creates a new instance of SitemapCrawler.
   *
   * @param config - Optional configuration settings
   * @param config.timeout - HTTP request timeout in milliseconds (default: 30000)
   * @param config.maxRetries - Maximum number of retry attempts for failed requests (default: 3)
   * @param config.concurrent - Number of concurrent requests (default: 2)
   * @param config.waitForTimeout - Time to wait between retries in milliseconds (default: 5000)
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
   * Supports both XML and JSON sitemap formats.
   *
   * @param sitemaps - Object mapping sitemap names to their URLs
   * @returns Promise resolving to an array of entries from all sitemaps
   * @throws {SitemapCrawlerError} If any sitemap fails to be crawled after all retries
   *
   * @example
   * ```typescript
   * const pages = await crawler.getSitemaps({
   *   main: 'https://example.com/sitemap.xml',
   *   blog: 'https://example.com/blog-sitemap.json'
   * });
   * console.log(`Found ${pages.length} pages`);
   * ```
   */
  async getSitemaps(sitemaps: Record<string, string>): Promise<SitemapEntry[]> {
    this.startTime = Date.now();
    const results: SitemapEntry[] = [];
    const sitemapEntries = Object.entries(sitemaps);
    const totalSitemaps = sitemapEntries.length;

    console.log(`Starting to crawl ${totalSitemaps} sitemaps...`);

    for (let i = 0; i < sitemapEntries.length; i += this.config.concurrent) {
      if (this.isMaxCrawlTimeExceeded()) {
        break;
      }

      const chunk = sitemapEntries.slice(i, i + this.config.concurrent);
      const chunkResults = await this.processSitemapChunk(chunk, i, totalSitemaps);
      results.push(...chunkResults);

      if (this.shouldWaitForNextChunk(i, sitemapEntries.length)) {
        await wait(this.config.waitForTimeout);
      }
    }

    console.log(`Finished crawling ${totalSitemaps} sitemaps. Found ${results.length} total entries.`);
    return results;
  }

  /**
   * Reads content from either a local file or a URL.
   *
   * @param pathOrUrl - Local file path or URL
   * @returns Promise resolving to the content as a string
   * @throws {SitemapCrawlerError} If reading fails
   */
  private async readContent(pathOrUrl: string): Promise<string> {
    try {
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
        const url = new URL(pathOrUrl);
        const response = await fetchWithTimeout(url, {
          timeout: this.config.timeout,
        });
        return response.text();
      }

      return await readFile(pathOrUrl, "utf-8");
    } catch (error) {
      if (error instanceof SitemapCrawlerError) {
        throw error;
      }
      try {
        return await readFile(pathOrUrl, "utf-8");
      } catch (fileError) {
        throw new SitemapCrawlerError(
          `Failed to read file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
          "FILE_READ_ERROR",
        );
      }
    }
  }

  /**
   * Determines if the content is JSON by attempting to parse it.
   *
   * @param content - The content to check
   * @returns True if the content is valid JSON
   */
  private isJsonContent(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parses a JSON sitemap and returns its entries.
   *
   * @param content - The JSON sitemap content
   * @returns Array of sitemap entries
   * @throws {SitemapCrawlerError} If parsing fails
   */
  private parseJsonSitemap(content: string): SitemapEntry[] {
    try {
      const data = JSON.parse(content) as JsonSitemap;

      if (!data.urls || !Array.isArray(data.urls) || isEmpty(data.urls)) {
        throw new SitemapCrawlerError("Invalid JSON sitemap format or empty sitemap", "INVALID_FORMAT");
      }

      return data.urls.map(transformJsonEntry);
    } catch (error) {
      if (error instanceof SitemapCrawlerError) {
        throw error;
      }
      throw new SitemapCrawlerError(
        `Failed to parse JSON sitemap: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PARSE_ERROR",
      );
    }
  }

  /**
   * Checks if the maximum crawl time has been exceeded.
   */
  private isMaxCrawlTimeExceeded(): boolean {
    if (Date.now() - this.startTime > this.MAX_CRAWL_TIME) {
      console.warn("Maximum crawl time exceeded. Stopping crawl.");
      return true;
    }
    return false;
  }

  /**
   * Processes a chunk of sitemaps concurrently.
   *
   * @param chunk - Array of [type, url] pairs to process
   * @param currentIndex - Current index in the sitemap list
   * @param totalSitemaps - Total number of sitemaps to process
   * @returns Array of sitemap entries
   */
  private async processSitemapChunk(
    chunk: [string, string][],
    currentIndex: number,
    totalSitemaps: number,
  ): Promise<SitemapEntry[]> {
    const chunkPromises = chunk.map(async ([type, url]) => {
      console.log(`Crawling sitemap ${currentIndex + 1}/${totalSitemaps}: ${type} (${url})`);
      try {
        const entries = await this.getSitemap(url);
        console.log(`Found ${entries.length} entries in ${type} sitemap`);
        return entries;
      } catch (error) {
        console.error(`Failed to crawl ${type} sitemap:`, error);
        return [];
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    return chunkResults.flat();
  }

  /**
   * Determines if we should wait before processing the next chunk.
   *
   * @param currentIndex - Current index in the sitemap list
   * @param totalSitemaps - Total number of sitemaps to process
   */
  private shouldWaitForNextChunk(currentIndex: number, totalSitemaps: number): boolean {
    return currentIndex + this.config.concurrent < totalSitemaps;
  }

  /**
   * Crawls a single sitemap URL and extracts its entries.
   * Supports both XML and JSON formats.
   *
   * @param url - The URL of the sitemap to crawl
   * @param retries - Current retry attempt number
   * @returns Promise resolving to an array of sitemap entries
   * @throws {SitemapCrawlerError} If crawling fails after all retries
   */
  private async getSitemap(url: string, retries = 0): Promise<SitemapEntry[]> {
    try {
      const data = await this.readContent(url);

      if (isNil(data)) {
        throw new SitemapCrawlerError("Empty sitemap content", "EMPTY_CONTENT");
      }

      // Try to parse as JSON first
      if (this.isJsonContent(data)) {
        return this.parseJsonSitemap(data);
      }

      // If not JSON, parse as XML
      const { urlset }: ParsedCrawledResult = await xmlParser.parseStringPromise(data);

      if (!urlset?.url || !Array.isArray(urlset.url) || isEmpty(urlset.url)) {
        throw new SitemapCrawlerError("Invalid sitemap format or empty sitemap", "INVALID_FORMAT");
      }

      return urlset.url.map<SitemapEntry>(transformEntriesToList);
    } catch (error) {
      if (error instanceof SitemapCrawlerError) {
        throw error;
      }

      console.error(`Failed to fetch sitemap: ${url}`, error);

      if (retries < this.config.maxRetries) {
        console.log(`Retry ${retries + 1}/${this.config.maxRetries} for ${url}`);
        await wait(this.config.waitForTimeout);
        return this.getSitemap(url, retries + 1);
      }

      throw new SitemapCrawlerError(
        `Failed to fetch sitemap after ${this.config.maxRetries} retries: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "MAX_RETRIES_EXCEEDED",
      );
    }
  }
}
