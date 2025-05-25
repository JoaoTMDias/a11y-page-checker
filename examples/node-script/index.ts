import chalk from "chalk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../../src/core/index.ts";
import { isEmpty } from "@jtmdias/js-utilities";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLE_SITEMAP = path.join(__dirname, "../sitemap.xml");
const OUTPUT_DIR = path.join(__dirname, "test-reports");

// Initialize the core classes
const Crawler = new SitemapCrawler();
const A11yTester = new AccessibilityTester();
const Generator = new ReportGenerator();

async function testCrawler() {
  console.log(`Using sitemap at: ${EXAMPLE_SITEMAP}`);

  try {
    const foundPages = await Crawler.getSitemaps({
      pages: EXAMPLE_SITEMAP,
    });
    const hasFoundPages = Array.isArray(foundPages) && !isEmpty(foundPages);

    if (hasFoundPages) {
      console.log(chalk.bgBlue(chalk.white(`Found ${foundPages.length} pages. Performing tests...`)));

      const urls = foundPages.map((page) => page.url);
      const results = await A11yTester.testUrls(urls);

      await Generator.generateReport(results, OUTPUT_DIR);
    }
  } catch (error) {
    console.log(error);
  }
}

await testCrawler();
