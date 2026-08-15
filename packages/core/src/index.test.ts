import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { chromium } from "@playwright/test";

import type { ScanPlan } from "@/types";
import { PageScanner, UrlSource } from "./core";
import { scan } from "./index";

const mocks = {
  launch: vi.spyOn(chromium, "launch"),
  resolve: vi.spyOn(UrlSource.prototype, "resolve"),
  scan: vi.spyOn(PageScanner.prototype, "scan"),
};

function createPage() {
  return { close: vi.fn().mockResolvedValue(undefined) };
}

function createPlan(urls: string[], maxConcurrency = 1): ScanPlan {
  return {
    options: { maxConcurrency },
    source: { targets: urls, type: "urls" },
  };
}

describe("scan", () => {
  beforeEach(() => {
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn(() => Promise.resolve(createPage())),
    };
    const browser = {
      close: vi.fn().mockResolvedValue(undefined),
      newContext: vi.fn().mockResolvedValue(context),
    };

    mocks.launch.mockReset();
    mocks.resolve.mockReset();
    mocks.scan.mockReset();
    mocks.launch.mockResolvedValue(browser as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is awaitable, emits lifecycle events, and aggregates findings", async () => {
    mocks.resolve.mockResolvedValue([{ url: "https://example.com/one" }, { url: "https://example.com/two" }]);
    mocks.scan
      .mockResolvedValueOnce([{ id: "one" }] as never)
      .mockResolvedValueOnce([{ id: "two" }, { id: "three" }] as never);
    const events: string[] = [];
    const operation = scan(createPlan(["https://example.com/one", "https://example.com/two"]));

    expect(operation).toBeInstanceOf(EventEmitter);

    operation.on("progress", ({ step, url }) => events.push(`progress:${step}:${url}`));
    operation.on("page:done", ({ findingsCount, url }) => events.push(`done:${findingsCount}:${url}`));
    operation.on("done", ({ summary }) => events.push(`complete:${summary.totalFindings}`));

    await expect(operation).resolves.toEqual({
      summary: expect.objectContaining({ pagesScanned: 2, totalFindings: 3 }),
      urlResults: [
        { findings: [{ id: "one" }], url: "https://example.com/one" },
        { findings: [{ id: "two" }, { id: "three" }], url: "https://example.com/two" },
      ],
    });
    expect(events).toEqual([
      "progress:fetch:https://example.com/one",
      "progress:scan:https://example.com/one",
      "done:1:https://example.com/one",
      "progress:fetch:https://example.com/two",
      "progress:scan:https://example.com/two",
      "done:2:https://example.com/two",
      "complete:3",
    ]);
  });

  it("caps concurrent scanner work and preserves target order", async () => {
    const urls = ["https://example.com/one", "https://example.com/two", "https://example.com/three"];
    let active = 0;
    let maxActive = 0;

    mocks.resolve.mockResolvedValue(urls.map((url) => ({ url })));
    mocks.scan.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return [];
    });

    const result = await scan(createPlan(urls, 2));

    expect(maxActive).toBe(2);
    expect(result.urlResults.map((urlResult) => urlResult.url)).toEqual(urls);
  });

  it("reports target errors and continues remaining scans", async () => {
    const failure = new Error("Axe failed");
    const errors: Array<{ message: string; url?: string }> = [];

    mocks.resolve.mockResolvedValue([{ url: "https://example.com/broken" }, { url: "https://example.com/valid" }]);
    mocks.scan.mockRejectedValueOnce(failure).mockResolvedValueOnce([{ id: "valid" }] as never);
    const operation = scan(createPlan(["https://example.com/broken", "https://example.com/valid"]));
    operation.on("error", ({ error, url }) => errors.push({ message: error.message, url }));

    await expect(operation).resolves.toEqual({
      summary: expect.objectContaining({ pagesScanned: 2, totalFindings: 1 }),
      urlResults: [
        { error: "Axe failed", findings: [], url: "https://example.com/broken" },
        { findings: [{ id: "valid" }], url: "https://example.com/valid" },
      ],
    });
    expect(errors).toEqual([{ message: "Axe failed", url: "https://example.com/broken" }]);
  });

  it("rejects source resolution failures without an unhandled error event", async () => {
    mocks.resolve.mockRejectedValue(new Error("Unable to resolve plan"));

    await expect(scan(createPlan(["https://example.com"]))).rejects.toThrow("Unable to resolve plan");
  });
});
