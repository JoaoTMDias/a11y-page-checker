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
