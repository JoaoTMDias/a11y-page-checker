import { Page } from "@playwright/test";
import { UrlProcessor } from "./url-processor";
import { isNil } from "@jtmdias/js-utilities";

/**
 * LinkExtractor is responsible for extracting links from a page.
 *
 * @example
 * ```typescript
 * const linkExtractor = new LinkExtractor(urlProcessor);
 * const links = await linkExtractor.extractLinks(page);
 *
 * console.log(links); // ['https://example.com/page1', 'https://example.com/page2']
 * ```
 */
export class LinkExtractor {
  constructor(private readonly urlProcessor: UrlProcessor) {}

  /**
   * Extracts links from a page.
   *
   * @param page - The page to extract links from.
   * @returns The links extracted from the page.
   */
  async extractLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")]
          .map((a) => a.getAttribute("href"))
          .filter((href): href is string => !!href),
      );

      return links
        .map((link) => this.urlProcessor.extractPageUrl(link))
        .filter((url): url is string => url !== null)
        .map((url) => this.urlProcessor.normalizeUrl(url))
        .filter((url): url is string => url !== null && this.urlProcessor.isValidUrl(url));
    } catch (error) {
      console.error("Failed to extract links:", error);
      return [];
    }
  }
}
