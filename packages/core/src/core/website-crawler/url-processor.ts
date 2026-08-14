/**
 * UrlProcessor is responsible for processing URLs.
 *
 * @example
 * ```typescript
 * const urlProcessor = new UrlProcessor(baseUrl);
 * const isValid = urlProcessor.isValidUrl(url);
 *
 * console.log(isValid); // true
 * ```
 */
export class UrlProcessor {
  constructor(private readonly baseUrl: URL) {}

  /**
   * Checks if a URL is valid and belongs to the same domain.
   *
   * @param url - The URL to check.
   * @returns True if the URL is valid and belongs to the same domain, false otherwise.
   */
  isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === this.baseUrl.hostname;
    } catch {
      return false;
    }
  }

  /**
   * Normalizes a URL by removing the fragment identifier and query parameters.
   *
   * @param url - The URL to normalize.
   * @returns The normalized URL, or null if the URL is invalid.
   */
  normalizeUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url, this.baseUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return null;
      }
      return parsedUrl.toString().replace(/\/$/, "");
    } catch {
      return null;
    }
  }

  /**
   * Extracts the page URL from a link.
   *
   * @param href - The link to extract the page URL from.
   * @returns The page URL, or null if the link is invalid.
   */
  extractPageUrl(href: string): string | null {
    if (!href) return null;

    // Skip any non-HTTP(S) links
    if (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("/")) {
      return null;
    }

    // Remove fragment identifier and query parameters
    return href.split(/[?#]/)[0];
  }
}
