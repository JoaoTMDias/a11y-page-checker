import { describe, expect, it } from "vitest";

import { PageScanner, ReportGenerator, SitemapCrawler } from "../src/index.ts";

describe("core public API", () => {
  it("exports the supported library classes", () => {
    expect(PageScanner).toBeTypeOf("function");
    expect(ReportGenerator).toBeTypeOf("function");
    expect(SitemapCrawler).toBeTypeOf("function");
  });
});
