import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ScanResult } from "@a11y-page-checker/core";
import { describe, expect, it } from "vitest";

import { generateHtmlReport } from "./index.js";

const result: ScanResult = {
  summary: { duration: 1250, pagesScanned: 2, totalFindings: 1 },
  urlResults: [
    {
      url: "https://example.com/?one=1&two=2",
      findings: [
        {
          id: "image-alt",
          impact: "critical",
          tags: ["wcag2a"],
          description: "Images must have alternate text",
          help: "Add alternate text",
          helpUrl: "https://dequeuniversity.com/rules/axe/image-alt",
          nodes: [{ html: '<img src="logo.png">', target: ["img"] }],
        },
      ],
    },
    { url: "https://example.com/about", findings: [], error: "Navigation failed" },
  ],
};

describe("generateHtmlReport", () => {
  it("writes a report from a normalized ScanResult and returns its absolute path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "reporter-html-"));
    const outputPath = path.join(directory, "nested");

    const generatedPath = await generateHtmlReport(result, outputPath);
    const html = await readFile(generatedPath, "utf8");

    expect(generatedPath).toBe(path.resolve(outputPath, "accessibility-report.html"));
    expect(html).toContain("Total findings");
    expect(html).toContain("https://example.com/?one=1&amp;two=2");
    expect(html).toContain("Images must have alternate text");
    expect(html).toContain("&lt;img src=&quot;logo.png&quot;&gt;");
    expect(html).toContain("Navigation failed");
  });
});
