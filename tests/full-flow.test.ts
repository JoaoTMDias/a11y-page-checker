import { describe, test, expect } from "vitest";
import { SitemapCrawler } from "../src/crawler";
import { AccessibilityTester } from "../src/tester";
import { ReportGenerator } from "../src/reporter";
import fs from "fs/promises";
import path from "path";

describe("Full Integration Test", () => {
  test("should execute full crawl-test-report flow", async () => {
    // Only run this test if TEST_SITE_URL is provided
    const testUrl = process.env.TEST_SITE_URL;
    if (!testUrl) {
      console.log("Skipping integration test - TEST_SITE_URL not provided");
      return;
    }

    const outputDir = path.join(process.cwd(), "test-reports");

    try {
      // 1. Crawl sitemap
      const crawler = new SitemapCrawler({
        timeout: 30000,
        maxRetries: 2,
      });

      const pages = await crawler.crawlSitemaps({
        test: `${testUrl}/sitemap.xml`,
      });

      expect(pages.length).toBeGreaterThan(0);

      // 2. Run accessibility tests
      const tester = new AccessibilityTester({
        concurrent: 1,
        waitForTimeout: 5000,
      });

      const results = await tester.testUrls(
        pages.map((page) => page.url).slice(0, 3) // Test first 3 pages only
      );

      expect(results.summary.totalPages).toBe(3);

      // 3. Generate reports
      const reporter = new ReportGenerator();
      await reporter.generateReport(results, outputDir);

      // 4. Verify reports were created
      const files = await fs.readdir(outputDir);
      expect(files).toContain("accessibility-report.json");
      expect(files).toContain("accessibility-report.html");

      // 5. Cleanup
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Integration test failed:", error);
      throw error;
    }
  });
});
