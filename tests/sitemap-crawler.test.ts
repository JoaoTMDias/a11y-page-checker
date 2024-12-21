// tests/crawler.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SitemapCrawler } from "../src";

describe("SitemapCrawler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should successfully crawl a single sitemap", async () => {
    const mockSitemapXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://example.com/page1</loc>
          <lastmod>2024-01-01</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSitemapXml });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      url: "https://example.com/page1",
      lastModified: "2024-01-01",
      changeFrequency: "daily",
      priority: 0.8,
      path: "/page1",
      slug: "page1",
    });
  });

  test("should handle multiple sitemaps", async () => {
    const mockSitemapXml1 = `
      <urlset>
        <url>
          <loc>https://example.com/page1</loc>
        </url>
      </urlset>
    `;

    const mockSitemapXml2 = `
      <urlset>
        <url>
          <loc>https://example.com/blog/post1</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: mockSitemapXml1 })
      .mockResolvedValueOnce({ data: mockSitemapXml2 });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
      blog: "https://example.com/blog-sitemap.xml",
    });

    expect(results).toHaveLength(2);
    expect(results[0].slug).toBe("page1");
    expect(results[1].slug).toBe("post1");
  });

  test("should handle empty sitemap", async () => {
    const mockEmptySitemap = `
      <urlset></urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEmptySitemap });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(results).toHaveLength(0);
  });

  test("should handle missing optional fields", async () => {
    const mockSitemapXml = `
      <urlset>
        <url>
          <loc>https://example.com/page1</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSitemapXml });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(results[0]).toEqual({
      url: "https://example.com/page1",
      lastModified: null,
      changeFrequency: null,
      priority: null,
      path: "/page1",
      slug: "page1",
    });
  });

  test("should retry on failure", async () => {
    const mockSitemapXml = `
      <urlset>
        <url>
          <loc>https://example.com/page1</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ data: mockSitemapXml });

    const crawler = new SitemapCrawler({
      maxRetries: 1,
      waitForTimeout: 5000,
    });

    const crawlPromise = crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    // Fast-forward through setTimeout
    await vi.runAllTimersAsync();

    const results = await crawlPromise;
    expect(results).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("should handle deep nested URLs", async () => {
    const mockSitemapXml = `
      <urlset>
        <url>
          <loc>https://example.com/blog/category/subcategory/post-1</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSitemapXml });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(results[0]).toEqual({
      url: "https://example.com/blog/category/subcategory/post-1",
      lastModified: null,
      changeFrequency: null,
      priority: null,
      path: "/blog/category/subcategory/post-1",
      slug: "post-1",
    });
  });

  test("should respect custom timeout configuration", async () => {
    const mockSitemapXml = `
      <urlset>
        <url>
          <loc>https://example.com/page1</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSitemapXml });

    const customTimeout = 15000;
    const crawler = new SitemapCrawler({ timeout: customTimeout });

    await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(axios.get).toHaveBeenCalledWith(
      "https://example.com/sitemap.xml",
      expect.objectContaining({ timeout: customTimeout })
    );
  });

  test("should handle URLs without slug", async () => {
    const mockSitemapXml = `
      <urlset>
        <url>
          <loc>https://example.com/</loc>
        </url>
      </urlset>
    `;

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSitemapXml });

    const crawler = new SitemapCrawler();
    const results = await crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    expect(results[0].slug).toBe("");
    expect(results[0].path).toBe("/");
  });

  test("should handle all retries failing", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

    const crawler = new SitemapCrawler({
      maxRetries: 2,
      waitForTimeout: 1000,
    });

    const crawlPromise = crawler.getSitemaps({
      main: "https://example.com/sitemap.xml",
    });

    // Fast-forward through all retries
    await vi.runAllTimersAsync();

    const results = await crawlPromise;
    expect(results).toHaveLength(0);
    expect(axios.get).toHaveBeenCalledTimes(3); // Initial try + 2 retries
  });
});
