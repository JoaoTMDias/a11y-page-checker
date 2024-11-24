// tests/tester.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { chromium, Page, Browser } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { AccessibilityTester } from "../src/tester";

// Fix the chromium mock to include the correct type
vi.mock("@playwright/test", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

// Fix the AxeBuilder mock to be a class constructor
vi.mock("@axe-core/playwright", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      withTags: vi.fn().mockReturnThis(),
      analyze: vi.fn(),
    })),
  };
});

describe("AccessibilityTester", () => {
  let mockPage: Partial<Page>;
  let mockBrowser: Partial<Browser>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();

    // Setup mock page with all required methods
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock browser with all required methods
    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Setup the chromium launch mock
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as Browser);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should test a single URL successfully", async () => {
    const mockViolations = [
      {
        id: "image-alt",
        impact: "critical",
        description: "Images must have alt text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.6/image-alt",
        nodes: [
          {
            html: '<img src="test.jpg">',
            failureSummary: "Fix any of the following: Image has no alt attribute",
            target: ["img"],
          },
        ],
      },
    ];

    // Setup the AxeBuilder analyze mock to return violations
    vi.mocked(AxeBuilder).mockImplementation(
      () =>
        ({
          withTags: vi.fn().mockReturnThis(),
          analyze: vi.fn().mockResolvedValue({ violations: mockViolations }),
        } as any)
    );

    const tester = new AccessibilityTester({ concurrent: 1 });
    const results = await tester.testUrls(["https://example.com"]);

    // Fast-forward timers to handle the waitForTimeout
    await vi.runAllTimersAsync();

    expect(results.summary.totalPages).toBe(1);
    expect(results.summary.totalViolations).toBe(1);
    expect(results.violations[0].violations).toEqual(mockViolations);
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  test("should handle page load errors", async () => {
    // Setup the page.goto mock to reject
    mockPage.goto = vi.fn().mockRejectedValue(new Error("Navigation failed"));

    const tester = new AccessibilityTester({ concurrent: 1 });
    const results = await tester.testUrls(["https://example.com"]);

    // Fast-forward timers
    await vi.runAllTimersAsync();

    expect(results.violations[0].error).toBe("Navigation failed");
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
