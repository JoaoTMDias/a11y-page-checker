import type { ScanPlan, ScanResult } from "@a11y-page-checker/core";

export type ScanStatus = "queued" | "running" | "completed" | "failed";

interface CommonOptions {
  maxConcurrency?: number;
  viewport?: { width: number; height: number };
  privateNetworkConfirmed?: boolean;
}

export type CreateScanRequest =
  | (CommonOptions & { kind: "crawl"; url: string; maxDepth?: number; maxPages?: number })
  | (CommonOptions & { kind: "sitemap"; url: string })
  | { kind: "markdown"; content: string; fileName: string; privateNetworkConfirmed?: boolean };

export interface ScanProgress {
  completedPages: number;
  currentStep?: "fetch" | "scan";
  currentUrl?: string;
  discoveredPages?: number;
  findings: number;
}

export interface StoredScan {
  id: string;
  schemaVersion: 1;
  status: ScanStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  input: CreateScanRequest;
  plan: ScanPlan;
  progress: ScanProgress;
  result?: ScanResult;
  error?: string;
}

export interface ScanListResponse {
  items: StoredScan[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SessionResponse {
  token: string;
}
