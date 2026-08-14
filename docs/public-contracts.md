# Public Contracts & Data Models

These TypeScript interfaces define the public API contracts exported by `@a11y-page-checker/core`.

## Severity

```typescript
export type Severity = "critical" | "serious" | "moderate" | "minor";
```

## Finding & Node Contracts
```typescript
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

```

## Scan Result & Summary Contracts

```typescript
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

```

## EventEmitter Event Payloads

```typescript
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
```
