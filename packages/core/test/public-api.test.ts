import { describe, expect, it } from "vitest";

import { AccessibilityTester, ReportGenerator, SitemapCrawler } from "../src/index.ts";

describe("core public API", () => {
  it("exports the supported library classes", () => {
    expect(AccessibilityTester).toBeTypeOf("function");
    expect(ReportGenerator).toBeTypeOf("function");
    expect(SitemapCrawler).toBeTypeOf("function");
  });
});
