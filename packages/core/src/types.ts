import { Page } from "@playwright/test";
import { Result } from "axe-core";
import type { EventEmitter } from "node:events";

export type Severity = "critical" | "serious" | "moderate" | "minor";

export type InputSource =
  | { type: "sitemap"; url: string }
  | { type: "crawl"; seedUrl: string; maxDepth?: number; maxPages?: number }
  | { type: "urls"; targets: string[] }
  | { type: "files"; glob: string[] };

export type DOMAction =
  | { type: "click"; selector: string }
  | { type: "wait"; selectorOrMs: string | number }
  | { type: "fill"; selector: string; value: string };

export interface ScanOptions {
  maxConcurrency?: number;
  viewport?: { width: number; height: number };
}

export interface PageTarget {
  url: string;
  name?: string;
  /** Optional interactive pre-conditions executed via Playwright before running axe-core */
  actions?: DOMAction[];
  /** Overrides global rule settings for this target */
  rules?: Record<string, { enabled: boolean }>;
}

export interface ScanPlan {
  name?: string;
  source: InputSource;
  include?: string[];
  exclude?: string[];
  options?: ScanOptions;
  targets?: PageTarget[];
}

export interface FindingNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface Finding {
  id: string;
  impact: Severity;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: FindingNode[];
}

export interface ScanResult {
  summary: {
    duration: number;
    pagesScanned: number;
    totalFindings: number;
  };
  urlResults: Array<{
    url: string;
    findings: Finding[];
    error?: string;
  }>;
}

export interface ProgressEventPayload {
  url: string;
  step: "fetch" | "scan";
}

export interface PageDoneEventPayload {
  url: string;
  findingsCount: number;
}

export interface ErrorEventPayload {
  url?: string;
  error: Error;
}

export interface DoneEventPayload {
  summary: ScanResult["summary"];
}

export interface ScanOperation extends Promise<ScanResult>, EventEmitter {
  on(event: "progress", listener: (payload: ProgressEventPayload) => void): this;
  on(event: "page:done", listener: (payload: PageDoneEventPayload) => void): this;
  on(event: "error", listener: (payload: ErrorEventPayload) => void): this;
  on(event: "done", listener: (payload: DoneEventPayload) => void): this;
  once(event: "progress", listener: (payload: ProgressEventPayload) => void): this;
  once(event: "page:done", listener: (payload: PageDoneEventPayload) => void): this;
  once(event: "error", listener: (payload: ErrorEventPayload) => void): this;
  once(event: "done", listener: (payload: DoneEventPayload) => void): this;
}

export interface SitemapConfig {
  concurrent?: number;
  maxRetries?: number;
  timeout?: number;
  waitForTimeout?: number;
}

/**
 * Represents a single entry in a sitemap.
 * Only the url field is required, all other fields are optional.
 */
export interface SitemapEntry {
  /** The absolute URL of the page (required) */
  url: string;
  /** The path part of the URL (required) */
  path: string;
  /** When the page was last modified (optional) */
  lastModified?: string;
  /** How frequently the page is likely to change (optional) */
  changeFrequency?: string;
  /** Priority of this URL relative to other URLs (optional, 0.0 to 1.0) */
  priority?: number;
  /** The last part of the URL path (optional) */
  slug?: string;
}

export interface AccessibilityViolation {
  description: string;
  helpUrl: string;
  id: string;
  impact: "critical" | "minor" | "moderate" | "serious";
  nodes: {
    failureSummary: string;
    html: string;
    target: string[];
  }[];
}

export interface TestResultsSummary {
  completedAt: string;
  pagesWithViolations: number;
  totalPages: number;
  totalViolations: number;
}

export interface TestResultsViolation {
  error?: string;
  timestamp: string;
  url: string;
  violations?: Result[];
}

export interface TestResults {
  summary: TestResultsSummary;
  violations: TestResultsViolation[];
}

export interface AxeConfig {
  rules?: string[];
  tags?: string[];
}

export interface OutputConfig {
  directory: string;
  formats: ("html" | "json" | "table")[];
}

export interface A11yConfig {
  axe?: AxeConfig;
  crawler?: SitemapConfig;
  output: OutputConfig;
  sitemaps: Record<string, string>;
  tester?: SitemapConfig;
}

export interface ParsedCrawledResult {
  urlset: Urlset;
}

export interface Urlset {
  $: Empty;
  url: SitemapURL[];
}

export interface Empty {
  xmlns: string;
  "xmlns:image": string;
  "xmlns:xsi": string;
  "xsi:schemaLocation": string;
}

export interface SitemapURL {
  changefreq?: string[];
  "image:image"?: ImageImage[];
  lastmod: Date[];
  loc: string[];
  priority?: string[];
}

export interface ImageImage {
  "image:loc": string[];
}

export interface ProcessChunksProps {
  urls: string[];
  concurrent: number;
  concurrentPages: Page[];
  results: TestResults;
}

export interface WebsiteCrawlerConfig extends SitemapConfig {
  baseUrl: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDepth?: number;
  maxPages?: number;
}

export interface CrawlResult {
  changeFrequency: null | string;
  lastModified: null | string;
  path: string;
  priority: null | number;
  slug: string;
  url: string;
}
