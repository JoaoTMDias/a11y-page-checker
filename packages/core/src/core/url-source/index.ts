import { chromium, type BrowserContext, type Page } from "@playwright/test";
import picomatch from "picomatch";
import { Parser } from "xml2js";

import type { InputSource, PageTarget, ScanOptions, ScanPlan } from "@/types";

interface JsonSitemapEntry {
  url: string;
}

interface JsonSitemap {
  urls: JsonSitemapEntry[];
}

interface XmlSitemap {
  urlset?: {
    url?: Array<{
      loc?: string[];
    }>;
  };
}

interface CrawlQueueItem {
  depth: number;
  url: string;
}

const DEFAULT_CRAWL_CONCURRENCY = 2;
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_VIEWPORT = { height: 800, width: 1280 };

export class UrlSource {
  async resolve(plan: ScanPlan): Promise<PageTarget[]> {
    const sourceTargets = await this.resolveSource(plan.source, plan.options);
    const mergedTargets = this.mergeTargets(sourceTargets, plan.targets ?? []);

    return this.filterTargets(mergedTargets, plan.include ?? [], plan.exclude ?? []);
  }

  private async resolveSource(source: InputSource, options?: ScanOptions): Promise<PageTarget[]> {
    switch (source.type) {
      case "sitemap":
        return this.resolveSitemap(source.url);
      case "crawl":
        return this.resolveCrawl(source, options);
      case "urls":
        return source.targets.map((url) => ({ url: this.normalizeUrl(url) }));
      case "files":
        throw new Error("The files source is not supported yet.");
    }
  }

  private async resolveSitemap(url: string): Promise<PageTarget[]> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: HTTP ${response.status}`);
    }

    const content = await response.text();
    const urls = this.isJson(content) ? this.parseJsonSitemap(content) : await this.parseXmlSitemap(content);

    return urls.map((targetUrl) => ({ url: this.normalizeUrl(targetUrl) }));
  }

  private async resolveCrawl(
    source: Extract<InputSource, { type: "crawl" }>,
    options?: ScanOptions,
  ): Promise<PageTarget[]> {
    const maxConcurrency = Math.max(1, options?.maxConcurrency ?? DEFAULT_CRAWL_CONCURRENCY);
    const maxDepth = source.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxPages = source.maxPages ?? Number.POSITIVE_INFINITY;

    if (maxPages <= 0) {
      return [];
    }

    const seedUrl = this.normalizeUrl(source.seedUrl);
    const seedOrigin = new URL(seedUrl).origin;
    const browser = await chromium.launch();

    try {
      const context = await browser.newContext({ viewport: options?.viewport ?? DEFAULT_VIEWPORT });

      try {
        return await this.crawlUrls(context, seedUrl, seedOrigin, maxConcurrency, maxDepth, maxPages);
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }

  private async crawlUrls(
    context: BrowserContext,
    seedUrl: string,
    seedOrigin: string,
    maxConcurrency: number,
    maxDepth: number,
    maxPages: number,
  ): Promise<PageTarget[]> {
    const queue: CrawlQueueItem[] = [{ depth: 0, url: seedUrl }];
    const queuedUrls = new Set([seedUrl]);
    const targets: PageTarget[] = [];

    while (queue.length > 0 && targets.length < maxPages) {
      const batch = queue.splice(0, Math.min(maxConcurrency, maxPages - targets.length));
      const discovered = await Promise.all(
        batch.map((item) => this.crawlPage(context, item, seedOrigin, maxDepth)),
      );

      for (const result of discovered) {
        if (!result) {
          continue;
        }

        targets.push({ url: result.url });

        for (const link of result.links) {
          if (!queuedUrls.has(link)) {
            queuedUrls.add(link);
            queue.push({ depth: result.depth + 1, url: link });
          }
        }
      }
    }

    return targets;
  }

  private async crawlPage(
    context: BrowserContext,
    item: CrawlQueueItem,
    seedOrigin: string,
    maxDepth: number,
  ): Promise<{ depth: number; links: string[]; url: string } | undefined> {
    const page = await context.newPage();

    try {
      await page.goto(item.url, { waitUntil: "domcontentloaded" });
      const links = item.depth < maxDepth ? await this.extractLinks(page, item.url, seedOrigin) : [];

      return { depth: item.depth, links, url: item.url };
    } catch {
      return undefined;
    } finally {
      await page.close();
    }
  }

  private async extractLinks(page: Page, baseUrl: string, seedOrigin: string): Promise<string[]> {
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")]
        .map((anchor) => anchor.getAttribute("href"))
        .filter((href): href is string => href !== null),
    );

    return hrefs
      .map((href) => this.resolveCrawlLink(href, baseUrl, seedOrigin))
      .filter((url): url is string => url !== undefined);
  }

  private resolveCrawlLink(href: string, baseUrl: string, seedOrigin: string): string | undefined {
    try {
      const url = new URL(href, baseUrl);

      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== seedOrigin) {
        return undefined;
      }

      return this.normalizeUrl(url.toString());
    } catch {
      return undefined;
    }
  }

  private mergeTargets(sourceTargets: PageTarget[], planTargets: PageTarget[]): PageTarget[] {
    const targets = new Map<string, PageTarget>();

    for (const target of sourceTargets) {
      const url = this.normalizeUrl(target.url);
      targets.set(url, { ...target, url });
    }

    for (const target of planTargets) {
      const url = this.normalizeUrl(target.url);
      targets.set(url, { ...targets.get(url), ...target, url });
    }

    return [...targets.values()];
  }

  private filterTargets(targets: PageTarget[], include: string[], exclude: string[]): PageTarget[] {
    return targets.filter((target) => {
      const path = new URL(target.url).pathname;
      const included = include.length === 0 || include.some((pattern) => this.matchesPath(pattern, path));
      const excluded = exclude.some((pattern) => this.matchesPath(pattern, path));

      return included && !excluded;
    });
  }

  private matchesPath(pattern: string, path: string): boolean {
    if (picomatch(pattern)(path)) {
      return true;
    }

    return pattern.startsWith("/**/") && picomatch(`/${pattern.slice(4)}`)(path);
  }

  private isJson(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  private parseJsonSitemap(content: string): string[] {
    const sitemap = JSON.parse(content) as JsonSitemap;

    if (!Array.isArray(sitemap.urls)) {
      throw new Error("Invalid JSON sitemap format.");
    }

    return sitemap.urls.map((entry) => entry.url);
  }

  private async parseXmlSitemap(content: string): Promise<string[]> {
    const sitemap = (await new Parser().parseStringPromise(content)) as XmlSitemap;
    const entries = sitemap.urlset?.url;

    if (!Array.isArray(entries)) {
      throw new Error("Invalid XML sitemap format.");
    }

    return entries.map((entry) => entry.loc?.[0]).filter((url): url is string => url !== undefined);
  }

  private normalizeUrl(value: string): string {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  }
}
