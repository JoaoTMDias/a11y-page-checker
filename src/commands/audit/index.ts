// src/cli/commands/audit.ts
import { Command, Flags } from "@oclif/core";
import fs from "node:fs/promises";
import yaml from "yaml";
import { SitemapCrawler } from "../../core/sitemap-crawler";
import { AccessibilityTester } from "../../core/a11y-tester";
import { ReportGenerator } from "../../core/report-generator";
import { A11yConfig, TestResults } from "../../types";

export default class Audit extends Command {
  static description = "Run accessibility audit on a website using sitemap";

  static examples = [
    "$ a11y-page-checker audit -c config.yml",
    "$ a11y-page-checker audit --config=config.yml",
  ];

  static flags = {
    config: Flags.string({
      char: "c",
      description: "Path to config file",
      default: "a11y-config.yml",
      required: true,
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Show detailed output",
      default: true,
    }),
  };

  private async loadConfig(path: string): Promise<A11yConfig> {
    const file = await fs.readFile(path, "utf8");
    return yaml.parse(file);
  }

  private formatRow(columns: string[], widths: number[]): string {
    return columns.map((col, i) => col.toString().padEnd(widths[i])).join(" | ");
  }

  private displayResults(results: TestResults, verbose: boolean): void {
    // Summary section
    this.log("\nSummary:");
    this.log(`Total Pages: ${results.summary.totalPages}`);
    this.log(`Pages with Violations: ${results.summary.pagesWithViolations}`);
    this.log(`Total Violations: ${results.summary.totalViolations}`);
    this.log(`Completed At: ${results.summary.completedAt}`);

    // Results table
    const headers = ["URL", "Violations", "Error"];
    const rows = results.violations.map((v) => [
      v.url,
      v.violations?.length.toString() || "0",
      v.error || "",
    ]);

    const widths = headers.map((header, index) =>
      Math.max(header.length, ...rows.map((row) => row[index].length), index === 0 ? 50 : 10)
    );

    this.log("\nDetailed Results:");
    this.log("-".repeat(widths.reduce((sum, w) => sum + w + 3, -3)));
    this.log(this.formatRow(headers, widths));
    this.log("-".repeat(widths.reduce((sum, w) => sum + w + 3, -3)));

    rows.forEach((row) => {
      this.log(this.formatRow(row, widths));
    });

    if (verbose) {
      this.log("\nViolation Details:");
      results.violations.forEach((pageResult) => {
        if (pageResult.violations && pageResult.violations.length > 0) {
          this.log(`\nURL: ${pageResult.url}`);
          pageResult.violations.forEach((violation) => {
            this.log(`  - Impact: ${violation.impact}`);
            this.log(`    Rule: ${violation.id}`);
            this.log(`    Description: ${violation.description}`);
            this.log(`    Help: ${violation.helpUrl}`);
          });
        }
      });
    }
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Audit);

    console.log("teste");

    try {
      this.log("Starting accessibility audit...");

      const config = await this.loadConfig(flags.config);

      this.log("✨ Crawling sitemaps...");
      const crawler = new SitemapCrawler(config.crawler);
      const pages = await crawler.getSitemaps(config.sitemaps);
      this.log(`📑 Found ${pages.length} pages to test`);

      this.log("\n🔍 Running accessibility tests...");
      const tester = new AccessibilityTester(config.tester);
      const results = await tester.testUrls(pages.map((page) => page.url));

      this.log("\n📊 Generating reports...");
      const generator = new ReportGenerator();
      const { output } = config;
      await fs.mkdir(output.directory, { recursive: true });

      if (output.formats.includes("json")) {
        await generator.generateJsonReport(results, output.directory);
        this.log(`✅ JSON report saved to ${output.directory}/accessibility-report.json`);
      }

      if (output.formats.includes("html")) {
        await generator.generateHtmlReport(results, output.directory);
        this.log(`✅ HTML report saved to ${output.directory}/accessibility-report.html`);
      }

      if (output.formats.includes("table")) {
        this.displayResults(results, flags.verbose);
      }

      this.log("\n✨ Audit completed successfully!");
    } catch (error) {
      this.error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
}
