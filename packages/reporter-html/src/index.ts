import Handlebars from "handlebars";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ScanResult } from "@a11y-page-checker/core";

const templatesDirectory = fileURLToPath(new URL("./templates", import.meta.url));

/** Compile and write a static HTML report for a normalized scan result. */
export async function generateHtmlReport(
  result: ScanResult,
  outputPath: string,
): Promise<string> {
  const [main, summary, results, styles] = await Promise.all([
    readTemplate("main.hbs"),
    readTemplate("partials/summary.hbs"),
    readTemplate("partials/results.hbs"),
    readTemplate("partials/styles.hbs"),
  ]);
  const handlebars = Handlebars.create();

  handlebars.registerPartial("summary", summary);
  handlebars.registerPartial("results", results);
  handlebars.registerPartial("styles", styles);

  const html = handlebars.compile(main)({
    ...result,
    pagesWithFindings: result.urlResults.filter(({ findings }) => findings.length > 0).length,
  });
  const reportPath = path.resolve(outputPath, "accessibility-report.html");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, html, "utf8");

  return reportPath;
}

async function readTemplate(relativePath: string): Promise<string> {
  return readFile(path.join(templatesDirectory, relativePath), "utf8");
}
