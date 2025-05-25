import fs from "node:fs/promises";
import path from "node:path";
import { TestResults } from "@/types";
import { generateHtml } from "@/core/report-generator/helpers";
import { isArray } from "@jtmdias/js-utilities";

type TypeOfReport = "html" | "json" | "table";
interface GenerateReportResults {
  html: boolean;
  json: boolean;
  table: boolean;
}

/**
 * ReportGenerator creates formatted reports from accessibility test results.
 * Generates both JSON and HTML reports with detailed accessibility violations
 * and summary statistics.
 *
 * @example
 * ```typescript
 * const reporter = new ReportGenerator();
 * await reporter.generateReport(testResults, './reports');
 * // Creates:
 * // - ./reports/accessibility-report.json
 * // - ./reports/accessibility-report.html
 * ```
 */
export class ReportGenerator {
  /**
   * Generates an HTML report file with a user-friendly visualization of the test results.
   * Includes styling and interactive elements for better readability.
   *
   * @param {TestResults} results - The accessibility test results
   * @param {string} outputPath - Directory path where the HTML report will be saved
   * @returns {Promise<void>} Resolves when the HTML report is written
   *
   * @throws {Error} If file writing fails
   *
   * @private
   */
  private async _generateHtmlReport(results: TestResults, outputPath: string): Promise<boolean> {
    try {
      const htmlContent = generateHtml(results);
      const htmlPath = path.join(outputPath, "accessibility-report.html");
      await fs.writeFile(htmlPath, htmlContent);

      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }

  /**
   * Generates a JSON report file containing the raw test results.
   *
   * @param {TestResults} results - The accessibility test results
   * @param {string} outputPath - Directory path where the JSON report will be saved
   * @returns {Promise<void>} Resolves when the JSON report is written
   *
   * @throws {Error} If file writing fails
   *
   * @private
   */
  private async _generateJsonReport(results: TestResults, outputPath: string): Promise<boolean> {
    try {
      const JSON_PATH = path.join(outputPath, "accessibility-report.json");
      await fs.writeFile(JSON_PATH, JSON.stringify(results, null, 2));

      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }

  private async _setupOutputFolder(outputPath: string) {
    try {
      await fs.mkdir(outputPath, { recursive: true });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Generates both JSON and HTML reports from accessibility test results.
   * Creates the output directory if it doesn't exist.
   *
   * @param {TestResults} results - The accessibility test results to report
   * @param {string} outputPath - Directory path where reports will be saved
   * @returns {Promise<void>} Resolves when reports are generated
   *
   * @throws {Error} If directory creation or file writing fails
   *
   * @example
   * ```typescript
   * await reporter.generateReport(results, './reports');
   * ```
   */
  async generateReport({
    type = "json",
    results,
    outputPath,
  }: {
    type: TypeOfReport | TypeOfReport[];
    results: TestResults;
    outputPath: string;
  }): Promise<GenerateReportResults> {
    await this._setupOutputFolder(outputPath);

    const generatorMap = {
      html: this._generateHtmlReport,
      json: this._generateJsonReport,
      table: this._generateJsonReport,
    };

    let reportResults = {
      html: false,
      json: false,
      table: false,
    };

    if (isArray(type)) {
      for await (const typeOfReport of type) {
        reportResults[typeOfReport] = await generatorMap[typeOfReport](results, outputPath);
      }
    } else {
      reportResults[type] = await generatorMap[type](results, outputPath);
    }

    return reportResults;
  }
}
