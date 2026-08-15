import { EventEmitter } from "node:events";
import type { ScanOperation, ScanResult } from "@a11y-page-checker/core";
import { describe, expect, it, vi } from "vitest";

import { createProgram, createScanPlan, formatResult } from "./bin";

function createOutput() {
  let value = "";

  return {
    stream: {
      write(chunk: string) {
        value += chunk;
        return true;
      },
    },
    value: () => value,
  };
}

function createOperation(result: ScanResult): ScanOperation {
  const emitter = new EventEmitter();
  const promise = Promise.resolve().then(() => {
    const firstUrl = result.urlResults[0]?.url ?? "https://example.com";

    emitter.emit("progress", { step: "fetch", url: firstUrl });
    emitter.emit("progress", { step: "scan", url: firstUrl });
    emitter.emit("page:done", { findingsCount: result.urlResults[0]?.findings.length ?? 0, url: firstUrl });
    emitter.emit("done", { summary: result.summary });

    return result;
  });

  return Object.assign(promise, {
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
  }) as ScanOperation;
}

describe("CLI scan command", () => {
  it("infers sitemap sources and respects explicit source overrides", () => {
    expect(createScanPlan("https://example.com/sitemap.xml")).toEqual({
      source: { type: "sitemap", url: "https://example.com/sitemap.xml" },
    });
    expect(createScanPlan("https://example.com/api.json", "crawl")).toEqual({
      source: { seedUrl: "https://example.com/api.json", type: "crawl" },
    });
    expect(() => createScanPlan("not a URL")).toThrow("Expected an absolute HTTP(S) URL");
    expect(() => createScanPlan("https://example.com", "files")).toThrow("Unsupported source type");
  });

  it("renders scan events to stderr and leaves JSON output machine-readable", async () => {
    const result: ScanResult = {
      summary: { duration: 25, pagesScanned: 1, totalFindings: 1 },
      urlResults: [
        {
          findings: [
            {
              description: "Images must have alternative text",
              help: "Images must have alternate text",
              helpUrl: "https://dequeuniversity.com/rules/axe/image-alt",
              id: "image-alt",
              impact: "critical",
              nodes: [],
              tags: ["wcag2a"],
            },
          ],
          url: "https://example.com/",
        },
      ],
    };
    const stdout = createOutput();
    const stderr = createOutput();
    const runScan = vi.fn(() => createOperation(result));
    const program = createProgram({ runScan: runScan as never, stderr: stderr.stream, stdout: stdout.stream });

    await program.parseAsync(["node", "a11y-page-checker", "scan", "https://example.com", "--format", "json"]);

    expect(runScan).toHaveBeenCalledWith({ source: { seedUrl: "https://example.com/", type: "crawl" } });
    expect(JSON.parse(stdout.value())).toEqual(result);
    expect(stderr.value()).toContain("[fetch] https://example.com/");
    expect(stderr.value()).toContain("[scan] https://example.com/");
    expect(stderr.value()).toContain("[done] https://example.com/: 1 findings");
    expect(stderr.value()).toContain("[complete] 1 pages scanned");
  });

  it("formats table output and rejects unsupported output formats", async () => {
    const result: ScanResult = {
      summary: { duration: 12, pagesScanned: 1, totalFindings: 0 },
      urlResults: [{ findings: [], url: "https://example.com/" }],
    };
    const stdout = createOutput();
    const stderr = createOutput();
    const program = createProgram({
      runScan: vi.fn(() => createOperation(result)) as never,
      stderr: stderr.stream,
      stdout: stdout.stream,
    });

    expect(formatResult(result, "table")).toContain("Summary: 1 pages scanned, 0 findings, 12ms");
    await program.parseAsync(["node", "a11y-page-checker", "scan", "https://example.com"]);
    expect(stdout.value()).toContain("| URL");
    await expect(
      createProgram({ runScan: vi.fn(() => createOperation(result)) as never }).parseAsync([
        "node",
        "a11y-page-checker",
        "scan",
        "https://example.com",
        "--format",
        "yaml",
      ]),
    ).rejects.toThrow("Unsupported output format");
  });
});
