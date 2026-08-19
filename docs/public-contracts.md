# Public Contracts and Data Models

This document describes the primary public API exported by `@a11y-page-checker/core`. The canonical executable definitions live in [`packages/core/src/types.ts`](../packages/core/src/types.ts); changes to these contracts should update this document and the public API tests in the same change.

## Public API

The package exposes the following primary runtime entry points:

```typescript
import {
  MarkdownParser,
  PageScanner,
  UrlSource,
  normalizeAxeResult,
  scan,
} from "@a11y-page-checker/core";
```

Most consumers should build or parse a `ScanPlan` and pass it to `scan`. `PageScanner`, `UrlSource`, and `normalizeAxeResult` are available for lower-level integrations.

## Scan Plan

A `ScanPlan` describes where pages come from, which pages should be included, and any per-target metadata or interaction preconditions.

```typescript
export type InputSource =
  | { type: "sitemap"; url: string }
  | {
      type: "crawl";
      seedUrl: string;
      maxDepth?: number;
      maxPages?: number;
    }
  | { type: "urls"; targets: string[] }
  | { type: "files"; glob: string[] };

export type DOMAction =
  | { type: "click"; selector: string }
  | { type: "wait"; selectorOrMs: string | number }
  | { type: "fill"; selector: string; value: string };

export interface ScanOptions {
  maxConcurrency?: number;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface PageTarget {
  url: string;
  name?: string;
  actions?: DOMAction[];
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
```

Source behavior:

- `sitemap` reads an XML or JSON sitemap from an absolute URL.
- `crawl` follows same-origin HTTP(S) links from `seedUrl`, subject to depth and page limits.
- `urls` scans an explicit ordered list of absolute URLs.
- `files` is part of the public contract but is not yet implemented by `UrlSource`; attempting to resolve it currently rejects with an unsupported-source error.

The `include` and `exclude` arrays contain glob patterns matched against URL pathnames. Entries in `targets` overlay source-discovered URLs by normalized URL and may also introduce URLs that are absent from the source. Target order is preserved after URL normalization and deduplication.

Current scan defaults are a maximum concurrency of `2` and a viewport of `1280 × 800`. Callers should set these values explicitly when reproducibility across future versions matters.

### Example

```typescript
import { scan, type ScanPlan } from "@a11y-page-checker/core";

const plan: ScanPlan = {
  name: "Storefront audit",
  source: {
    type: "crawl",
    seedUrl: "https://example.com",
    maxDepth: 2,
    maxPages: 25,
  },
  exclude: ["/**/logout"],
  options: {
    maxConcurrency: 4,
    viewport: { width: 1280, height: 800 },
  },
  targets: [
    {
      name: "Product drawer",
      url: "https://example.com/products/one",
      actions: [
        { type: "click", selector: "#add-to-cart" },
        { type: "wait", selectorOrMs: ".cart-drawer-open" },
      ],
    },
  ],
};

const result = await scan(plan);
```

`actions` and per-target `rules` are represented in the current public contract and preserved as metadata. The current scan engine does not execute actions or apply per-target rule overrides; consumers must not rely on them as scan preconditions or execution controls.

## Markdown Plans

`MarkdownParser.parse` reads a Markdown test-plan file asynchronously. `MarkdownParser.parseText` parses in-memory content synchronously without accepting a filesystem path:

```typescript
import { MarkdownParser } from "@a11y-page-checker/core";

const filePlan = await MarkdownParser.parse("./audit-plan.md");
const uploadedPlan = MarkdownParser.parseText(markdown, "uploaded-plan.md");
```

The optional source name is included in validation errors and defaults to `Markdown scan plan`.

Front matter supplies top-level `ScanPlan` settings. When `source` is omitted, the parser derives a `urls` source from the targets found in the document.

Unchecked task items containing HTTP(S) URLs become page targets. Checked tasks are ignored:

```markdown
- [ ] Home: https://example.com/
- [ ] Checkout: [Checkout page](https://example.com/checkout)
- [x] Previously audited: https://example.com/archive
```

A scenario heading may include a JSON or YAML code block with an `actions` array. A `Target:` line selects a URL; without one, the scenario applies to the preceding unchecked URL task.

````markdown
### Scenario: Open the cart drawer

Target: https://example.com/products/one

```yaml
actions:
  - type: click
    selector: "#add-to-cart"
  - type: wait
    selectorOrMs: ".cart-drawer-open"
```
````

Malformed front matter, malformed scenario data, unclosed scenario fences, and invalid actions reject with an `Error` containing the file path or source name supplied by the caller.

## Findings and Results

```typescript
export type Severity = "critical" | "serious" | "moderate" | "minor";

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
```

`duration` is expressed in milliseconds. A page-level failure is represented by an empty `findings` array and an `error` message; it does not prevent other resolved targets from being scanned. `totalFindings` is the sum of findings across all URL results.

## Scan Operation and Events

`scan(plan)` returns a `ScanOperation`. It is both awaitable as a `Promise<ScanResult>` and an `EventEmitter` with typed lifecycle events.

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
```

Event semantics:

- `progress` is emitted as a target enters the `fetch` and `scan` stages.
- `page:done` is emitted once per attempted target, including targets that fail.
- `error` is emitted for page-level failures and unrecoverable scan failures. Its `url` is omitted when the error is not associated with one target.
- `done` is emitted once after all target results have been aggregated successfully.

Because Node treats an unhandled `error` event specially, core only emits this event when at least one error listener is registered. The operation still rejects for unrecoverable failures whether or not a listener exists.

```typescript
const operation = scan(plan);

operation.on("progress", ({ url, step }) => {
  // Forward progress to a UI, logger, or CLI owned by the caller.
});

operation.on("error", ({ url, error }) => {
  // Handle or display the error at the application boundary.
});

const result = await operation;
```

The core package itself does not write progress or status output to stdout or stderr.

## Compatibility Types

`packages/core/src/types.ts` also exports older sitemap, crawler, configuration, and raw axe result interfaces used by existing code. These include `A11yConfig`, `SitemapConfig`, `SitemapEntry`, `TestResults`, and related XML/crawl structures. They remain exported for compatibility but are not the preferred contracts for new integrations. New code should use `ScanPlan`, `ScanOperation`, `ScanResult`, and `Finding` unless it is integrating with a legacy API directly.
