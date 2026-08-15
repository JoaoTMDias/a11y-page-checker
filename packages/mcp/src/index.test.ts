import type { ScanResult } from "@a11y-page-checker/core";
import { describe, expect, it } from "vitest";

import { createUrlPlan, toToolResult } from "./index.js";

describe("createUrlPlan", () => {
  it("creates a crawl plan and preserves maxDepth", () => {
    expect(createUrlPlan("https://example.com/docs", 2)).toEqual({
      source: {
        maxDepth: 2,
        seedUrl: "https://example.com/docs",
        type: "crawl",
      },
    });
  });

  it("rejects non-HTTP URLs", () => {
    expect(() => createUrlPlan("file:///tmp/page.html")).toThrow(
      "Expected an absolute HTTP(S) URL",
    );
  });
});

describe("toToolResult", () => {
  it("returns the normalized result as structured and JSON content", () => {
    const result: ScanResult = {
      summary: { duration: 12, pagesScanned: 1, totalFindings: 0 },
      urlResults: [{ findings: [], url: "https://example.com/" }],
    };

    expect(toToolResult(result)).toEqual({
      content: [{ text: JSON.stringify(result), type: "text" }],
      structuredContent: result,
    });
  });
});
