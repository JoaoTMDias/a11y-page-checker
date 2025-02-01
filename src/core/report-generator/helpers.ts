import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { TestResults } from "@/types";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

Handlebars.registerHelper(
  "escapeHtml",
  (unsafe: string) =>
    new Handlebars.SafeString(
      unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
    )
);

export function generateHtml(results: TestResults) {
  // Load and register partials
  const summaryPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/summary.hbs"),
    "utf8"
  );
  const violationsPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/violations.hbs"),
    "utf8"
  );
  const stylesPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/styles.hbs"),
    "utf8"
  );

  Handlebars.registerPartial("summary", summaryPartial);
  Handlebars.registerPartial("violations", violationsPartial);
  Handlebars.registerPartial("styles", stylesPartial);

  // Read and compile the main template
  const templatePath = path.join(__dirname, "templates/main.hbs");
  const templateContent = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(templateContent);

  // Prepare the data
  const data = {
    summary: results.summary,
    testDate: new Date(results.summary.completedAt).toLocaleString(),
    violations: results.violations,
  };

  // Generate HTML
  return template(data);
}
