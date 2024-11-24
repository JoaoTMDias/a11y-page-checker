import Handlebars from "handlebars";
import { TestResults } from "./types";
import { capitalize } from "@feedzai/js-utilities";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// Register helpers
Handlebars.registerHelper("capitalize", function (str) {
  return capitalize(str);
});

Handlebars.registerHelper("escapeHtml", function (unsafe: string) {
  return new Handlebars.SafeString(
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  );
});

export function generateHtml(results: TestResults) {
  // Load and register partials
  const summaryPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/summary.hbs"),
    "utf-8"
  );
  const violationsPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/violations.hbs"),
    "utf-8"
  );
  const stylesPartial = fs.readFileSync(
    path.join(__dirname, "templates/partials/styles.hbs"),
    "utf-8"
  );

  Handlebars.registerPartial("summary", summaryPartial);
  Handlebars.registerPartial("violations", violationsPartial);
  Handlebars.registerPartial("styles", stylesPartial);

  // Read and compile the main template
  const templatePath = path.join(__dirname, "templates/main.hbs");
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(templateContent);

  // Prepare the data
  const data = {
    testDate: new Date(results.summary.completedAt).toLocaleString(),
    summary: results.summary,
    violations: results.violations,
  };

  // Generate HTML
  return template(data);
}
