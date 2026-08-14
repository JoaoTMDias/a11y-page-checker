import type { AxeResults } from "axe-core";
import type { Page } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axeMocks = vi.hoisted(() => {
  const analyze = vi.fn();
  const withTags = vi.fn();
  const AxeBuilder = vi.fn();

  return { analyze, AxeBuilder, withTags };
});

const normalizerMocks = vi.hoisted(() => ({ normalizeAxeResult: vi.fn() }));

vi.mock("@axe-core/playwright", () => ({ AxeBuilder: axeMocks.AxeBuilder }));
vi.mock("../normalizer/index.ts", () => normalizerMocks);

import { PageScanner } from "./index";

describe("PageScanner", () => {
  beforeEach(() => {
    axeMocks.AxeBuilder.mockReturnValue({ withTags: axeMocks.withTags });
    axeMocks.withTags.mockReturnValue({ analyze: axeMocks.analyze });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("navigates, evaluates the page, and normalizes the raw Axe result", async () => {
    const axeResult = { violations: [] } as unknown as AxeResults;
    const findings = [
      {
        description: "Images must have alternative text",
        help: "Images must have alternate text",
        helpUrl: "https://dequeuniversity.com/rules/axe/image-alt",
        id: "image-alt",
        impact: "critical" as const,
        nodes: [],
        tags: ["wcag2a"],
      },
    ];
    const goto = vi.fn().mockResolvedValue(null);
    const page = { goto } as unknown as Page;

    axeMocks.analyze.mockResolvedValue(axeResult);
    normalizerMocks.normalizeAxeResult.mockReturnValue(findings);

    await expect(new PageScanner().scan("https://example.com", page)).resolves.toEqual(findings);

    expect(goto).toHaveBeenCalledWith("https://example.com", { waitUntil: "domcontentloaded" });
    expect(axeMocks.AxeBuilder).toHaveBeenCalledWith({ page });
    expect(axeMocks.withTags).toHaveBeenCalledWith(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
    expect(normalizerMocks.normalizeAxeResult).toHaveBeenCalledWith(axeResult);
  });

  it("propagates failures without writing to the console", async () => {
    const failure = new Error("navigation failed");
    const goto = vi.fn().mockRejectedValue(failure);
    const page = { goto } as unknown as Page;
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");

    await expect(new PageScanner().scan("https://example.com", page)).rejects.toThrow(failure);

    expect(axeMocks.AxeBuilder).not.toHaveBeenCalled();
    expect(normalizerMocks.normalizeAxeResult).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
