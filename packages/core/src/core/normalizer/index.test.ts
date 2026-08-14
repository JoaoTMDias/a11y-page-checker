import type { AxeResults } from "axe-core";
import { describe, expect, it } from "vitest";

import { normalizeAxeResult } from "./index";

function withViolations(violations: AxeResults["violations"]): AxeResults {
  return { violations } as AxeResults;
}

describe("normalizeAxeResult", () => {
  it.each(["critical", "serious", "moderate", "minor"] as const)("preserves the %s severity", (impact) => {
    const findings = normalizeAxeResult(
      withViolations([
        {
          description: "Images must have alternative text",
          help: "Images must have alternate text",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.13/image-alt",
          id: "image-alt",
          impact,
          nodes: [],
          tags: ["cat.text-alternatives", "wcag2a"],
        },
      ]),
    );

    expect(findings[0].impact).toBe(impact);
  });

  it("falls back to minor when Axe omits an impact", () => {
    const findings = normalizeAxeResult(
      withViolations([
        {
          description: "Document must have a title",
          help: "Documents must have <title> element",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.13/document-title",
          id: "document-title",
          nodes: [],
          tags: ["cat.text-alternatives"],
        },
      ]),
    );

    expect(findings[0].impact).toBe("minor");
  });

  it("maps rule metadata and node selectors into public findings", () => {
    const findings = normalizeAxeResult(
      withViolations([
        {
          description: "Images must have alternative text",
          help: "Images must have alternate text",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.13/image-alt",
          id: "image-alt",
          impact: "critical",
          nodes: [
            {
              all: [],
              any: [],
              failureSummary: "Fix this image.",
              html: '<img src="logo.png">',
              impact: "critical",
              none: [],
              target: ["main", "img"],
            },
            {
              all: [],
              any: [],
              html: '<img src="banner.png">',
              impact: "critical",
              none: [],
              target: ["#banner img"],
            },
          ],
          tags: ["cat.text-alternatives", "wcag2a"],
        },
      ]),
    );

    expect(findings).toEqual([
      {
        description: "Images must have alternative text",
        help: "Images must have alternate text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/image-alt",
        id: "image-alt",
        impact: "critical",
        nodes: [
          {
            failureSummary: "Fix this image.",
            html: '<img src="logo.png">',
            target: ["main", "img"],
          },
          {
            html: '<img src="banner.png">',
            target: ["#banner img"],
          },
        ],
        tags: ["cat.text-alternatives", "wcag2a"],
      },
    ]);
  });

  it("returns no findings when Axe reports no violations", () => {
    expect(normalizeAxeResult(withViolations([]))).toEqual([]);
  });
});
