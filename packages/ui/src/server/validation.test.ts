import { describe, expect, it } from "vitest";
import { parseCreateScanRequest, targetsPrivateNetwork, toScanPlan } from "./validation.js";

describe("scan request validation", () => {
  it("rejects unsupported protocols and unknown properties", () => {
    expect(() => parseCreateScanRequest({ kind: "crawl", url: "file:///tmp/a.html" })).toThrow();
    expect(() => parseCreateScanRequest({ kind: "crawl", url: "https://example.com", extra: true })).toThrow();
  });

  it("builds bounded plans and identifies private targets", () => {
    const input = parseCreateScanRequest({ kind: "crawl", url: "http://localhost:3000", maxDepth: 2, maxPages: 25 });
    expect(targetsPrivateNetwork(input)).toBe(true);
    expect(toScanPlan(input)).toEqual({ source: { type: "crawl", seedUrl: "http://localhost:3000", maxDepth: 2, maxPages: 25 } });
  });
});
