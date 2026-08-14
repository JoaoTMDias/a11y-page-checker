/**
 * SitemapCrawlerError is a custom error class for the SitemapCrawler.
 *
 * @example
 * ```typescript
 * const error = new SitemapCrawlerError("An error occurred", "ERROR_CODE");
 * ```
 */
export class SitemapCrawlerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SitemapCrawlerError";
  }
}
