import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../src/index";

const URL = "https://www.feedzai.com/page-sitemap.xml";
const CRAWLER = new SitemapCrawler();
const AXE_TESTER = new AccessibilityTester();
const REPORTER = new ReportGenerator();
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const outputDir = path.join(__dirname, "test-reports");

async function testCrawler() {
  try {
    const PAGES = await CRAWLER.crawlSitemaps({
      pages: URL,
    });

    const results = await AXE_TESTER.testUrls(
      PAGES.map((page) => page.url).slice(0, 3) // Test first 3 pages only
    );

    await REPORTER.generateReport(results, outputDir);
  } catch (error) {
    console.log(error);
  }
}

testCrawler();
