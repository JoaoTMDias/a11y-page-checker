import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const playwrightMocks = vi.hoisted(() => ({ launch: vi.fn() }));

vi.mock("@playwright/test", () => ({
  chromium: { launch: playwrightMocks.launch },
}));

import { UrlSource } from "./index";

function mockResponse(content: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(content),
  } as unknown as Response;
}

describe("UrlSource", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("resolves XML and JSON sitemaps", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        mockResponse("<urlset><url><loc>https://example.com/about</loc></url></urlset>"),
      )
      .mockResolvedValueOnce(mockResponse(JSON.stringify({ urls: [{ url: "https://example.com/contact" }] })));
    const source = new UrlSource();

    await expect(
      source.resolve({ source: { type: "sitemap", url: "https://example.com/sitemap.xml" } }),
    ).resolves.toEqual([{ url: "https://example.com/about" }]);
    await expect(
      source.resolve({ source: { type: "sitemap", url: "https://example.com/sitemap.json" } }),
    ).resolves.toEqual([{ url: "https://example.com/contact" }]);
  });

  it("overlays plan targets, appends target-only URLs, and applies path filters", async () => {
    const source = new UrlSource();

    await expect(
      source.resolve({
        exclude: ["/**/logout"],
        include: ["/products", "/checkout", "/logout"],
        source: {
          targets: [
            "https://example.com/products",
            "https://example.com/products#details",
            "https://example.com/logout",
          ],
          type: "urls",
        },
        targets: [
          {
            actions: [{ selector: "#add-to-cart", type: "click" }],
            name: "Product page",
            url: "https://example.com/products",
          },
          { name: "Checkout", url: "https://example.com/checkout" },
        ],
      }),
    ).resolves.toEqual([
      {
        actions: [{ selector: "#add-to-cart", type: "click" }],
        name: "Product page",
        url: "https://example.com/products",
      },
      { name: "Checkout", url: "https://example.com/checkout" },
    ]);
  });

  it("crawls same-origin links within depth and page limits", async () => {
    const seedPage = {
      close: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(["/about", "https://other.example/ignored", "/about#team"]),
      goto: vi.fn().mockResolvedValue(null),
    };
    const aboutPage = {
      close: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(),
      goto: vi.fn().mockResolvedValue(null),
    };
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn().mockResolvedValueOnce(seedPage).mockResolvedValueOnce(aboutPage),
    };
    const browser = {
      close: vi.fn().mockResolvedValue(undefined),
      newContext: vi.fn().mockResolvedValue(context),
    };
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");

    playwrightMocks.launch.mockResolvedValue(browser);

    await expect(
      new UrlSource().resolve({
        options: { maxConcurrency: 1, viewport: { height: 720, width: 1024 } },
        source: { maxDepth: 1, maxPages: 2, seedUrl: "https://example.com", type: "crawl" },
      }),
    ).resolves.toEqual([{ url: "https://example.com/" }, { url: "https://example.com/about" }]);

    expect(browser.newContext).toHaveBeenCalledWith({ viewport: { height: 720, width: 1024 } });
    expect(seedPage.goto).toHaveBeenCalledWith("https://example.com/", { waitUntil: "domcontentloaded" });
    expect(aboutPage.goto).toHaveBeenCalledWith("https://example.com/about", { waitUntil: "domcontentloaded" });
    expect(aboutPage.evaluate).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledOnce();
    expect(browser.close).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("rejects unsupported file sources", async () => {
    await expect(new UrlSource().resolve({ source: { glob: ["dist/**/*.html"], type: "files" } })).rejects.toThrow(
      "The files source is not supported yet.",
    );
  });
});
