import chalk from "chalk";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../../core/index.ts";

const URL = "https://ruc.pt/sitemap-0.xml";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, "test-reports");

// Initialize the core classes
const Crawler = new SitemapCrawler();
const A11yTester = new AccessibilityTester();
const Generator = new ReportGenerator();

async function testCrawler() {
  try {
    const PAGES = await Crawler.getSitemaps({
      pages: URL,
    });

    if (Array.isArray(PAGES)) {
      console.log(chalk.bgBlue(chalk.white(`Found ${PAGES.length} pages. Performing tests...`)));

      const results = await A11yTester.testUrls(PAGES.map((page) => page.url));

      await Generator.generateReport(results, OUTPUT_DIR);
    }
  } catch (error) {
    console.log(error);
  }
}

await testCrawler();
