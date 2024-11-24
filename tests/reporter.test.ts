import { describe, test, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import { ReportGenerator } from "../src/reporter";

vi.mock("node:fs/promises");

describe("ReportGenerator", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("should generate both reports", async () => {
    const mockResults = {
      summary: {
        totalPages: 1,
        pagesWithViolations: 1,
        totalViolations: 1,
        completedAt: "2024-01-01T00:00:00.000Z",
      },
      violations: [
        {
          url: "https://example.com",
          timestamp: "2024-01-01T00:00:00.000Z",
          violations: [
            {
              id: "test-rule",
              impact: "critical",
              description: "Test violation",
              helpUrl: "https://example.com/help",
              nodes: [
                {
                  html: "<div>Test</div>",
                  failureSummary: "Test failure",
                  target: ["div"],
                },
              ],
            },
          ],
        },
      ],
    };

    const reporter = new ReportGenerator();
    await reporter.generateReport(mockResults, "./reports");

    expect(fs.mkdir).toHaveBeenCalledWith("./reports", { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });

  test("should handle filesystem errors", async () => {
    vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error("Permission denied"));

    const reporter = new ReportGenerator();

    await expect(
      reporter.generateReport(
        {
          summary: { totalPages: 0, pagesWithViolations: 0, totalViolations: 0, completedAt: "" },
          violations: [],
        },
        "./reports"
      )
    ).rejects.toThrow("Permission denied");
  });
});
