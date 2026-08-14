/**
 * WebsiteCrawlerError is a custom error class for the WebsiteCrawler.
 *
 * @example
 * ```typescript
 * const error = new WebsiteCrawlerError("An error occurred", "ERROR_CODE");
 * ```
 */
export class WebsiteCrawlerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "WebsiteCrawlerError";
  }
}
