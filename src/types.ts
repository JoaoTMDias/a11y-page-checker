import axe from "axe-core";

export interface SitemapConfig {
  timeout?: number;
  maxRetries?: number;
  concurrent?: number;
  waitForTimeout?: number;
}

export interface SitemapEntry {
  url: string;
  lastModified: string | null;
  changeFrequency: string | null;
  priority: number | null;
  path: string;
  slug: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  helpUrl: string;
  nodes: {
    html: string;
    failureSummary: string;
    target: string[];
  }[];
}

export interface TestResultsSummary {
  totalPages: number;
  pagesWithViolations: number;
  totalViolations: number;
  completedAt: string;
}

export interface TestResultsViolation {
  url: string;
  timestamp: string;
  violations?: axe.Result[];
  error?: string;
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
  formats: ("json" | "html" | "table")[];
  directory: string;
}

export interface A11yConfig {
  sitemaps: Record<string, string>;
  axe?: AxeConfig;
  output: OutputConfig;
  crawler?: SitemapConfig;
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
  "xmlns:xsi": string;
  "xmlns:image": string;
  "xsi:schemaLocation": string;
  xmlns: string;
}

export interface SitemapURL {
  loc: string[];
  lastmod: Date[];
  "image:image"?: ImageImage[];
  changefreq?: string[];
  priority?: string[];
}

export interface ImageImage {
  "image:loc": string[];
}
