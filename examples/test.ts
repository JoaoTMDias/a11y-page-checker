import chalk from "chalk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../src/index";

const URL = "http://localhost:5173/page-sitemap.xml";
const CRAWLER = new SitemapCrawler();
const AXE_TESTER = new AccessibilityTester();
const REPORTER = new ReportGenerator();
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const outputDir = path.join(__dirname, "test-reports");

async function testCrawler() {
  try {
    const PAGES = await CRAWLER.getSitemaps({
      pages: URL,
    });

    if (Array.isArray(PAGES)) {
      console.log(chalk.bgBlue(chalk.white(`Crawled ${PAGES.length} pages`)));

      const results = await AXE_TESTER.testUrls(PAGES.map((page) => page.url));

      await REPORTER.generateReport(results, outputDir);
    }
  } catch (error) {
    console.log(error);
  }
}

testCrawler();
