import { Page } from "@playwright/test";
import { Result } from "axe-core";

export interface SitemapConfig {
  concurrent?: number;
  maxRetries?: number;
  timeout?: number;
  waitForTimeout?: number;
}

export interface SitemapEntry {
  changeFrequency: null | string;
  lastModified: null | string;
  path: string;
  priority: null | number;
  slug: string;
  url: string;
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
