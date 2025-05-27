import chalk from "chalk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../../src/core/index.ts";
import { isArray, isEmpty, isNil, throwError } from "@jtmdias/js-utilities";
import { SitemapEntry, TestResults } from "@/types.ts";
import { TypeOfReport } from "@/core/report-generator/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLE_SITEMAP = path.join(__dirname, "../psd.json");
const OUTPUT_DIR = path.join(__dirname, "output");

// Initialize the core classes
const Crawler = new SitemapCrawler();
const A11yTester = new AccessibilityTester();
const Generator = new ReportGenerator();

/**
 * Creates a collection of pages to audit.
 * It can come from a XML or JSON source.
 */
async function getPagesToAudit() {
  try {
    const foundPages = await Crawler.getSitemaps({
      pages: EXAMPLE_SITEMAP,
    });

    return foundPages;
  } catch (error) {
    throwError("a11y-page-checker", "getPagesToAudit", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Performs the accessibility audit
 */
async function auditPages(pages: SitemapEntry[]) {
  try {
    console.log(chalk.bgBlue(chalk.white(`Performing tests on ${pages.length} pages...`)));

    const urls = pages.map((page) => page.url);
    const results = await A11yTester.testUrls(urls, true);

    if (!results) {
      throwError("a11y-page-checker", "auditPages", "There were no results from the audit. Please try again.");
    }

    return results;
  } catch (error) {
    throwError("a11y-page-checker", "auditPages", error instanceof Error ? error.message : String(error));
  }
}

/**
 * After peforming the audit, tries to generate a readable report.
 */
async function generateReport(results: TestResults, type: TypeOfReport | TypeOfReport[] = ["html", "json"]) {
  try {
    const generatedReportResults = await Generator.generateReport({
      type,
      results: results,
      outputPath: OUTPUT_DIR,
    });

    console.log(generatedReportResults);
  } catch (error) {
    throwError("a11y-page-checker", "generateReport", "Could not generate report");
  }
}

/**
 * Demo for a test using the crawler as a node script.
 */
async function testCrawler() {
  try {
    const pagesToAudit = await getPagesToAudit();
    const hasPages = !!pagesToAudit && isArray(pagesToAudit) && !isEmpty(pagesToAudit);

    if (!hasPages) {
      throwError("a11y-page-checker", "getPagesToAudit", "No pages were found to test.");
    }

    const auditResults = await auditPages(pagesToAudit!);

    if (!isNil(auditResults)) {
      generateReport(auditResults);
    }
  } catch (error) {
    throwError("a11y-page-checker", "testCrawler", error instanceof Error ? error.message : String(error));
  }
}

await testCrawler();
