# RFC 002: Polymorphic `ScanPlan` Schema & Markdown Test Plan Specification

* **Status:** Draft
* **Created:** 2026-08-14
* **Target Release:** v0.2
* **Authors:** João Dias
* **Related Documents:** [[RFC 001]], [[v0.1 Core Library MVP Plan]], [[Refactoring Plan]]

---

## 1. Context & Problem Statement

The baseline implementation of `a11y-page-checker` relies primarily on XML/JSON sitemaps for page discovery. However, many target applications lack sitemaps, require crawling starting from a seed URL, audit local build directories before deployment, or require pre-audit DOM interactions (e.g., logging in or opening modal drawers).

To support these use cases, the engine must decouple from sitemap assumptions and adopt a polymorphic configuration contract (`ScanPlan`), along with a human-readable Markdown test plan specifier.

---

## 2. Proposed Architecture
```
+-----------------------------------------------------------------+
| Input Sources (.md file / ScanPlan JSON / CLI options) |
+--------------------------------+--------------------------------+
|
Parsed via MarkdownParser
|
v
+-----------------------------------------------------------------+
| @a11y-page-checker/core Engine |
| |
| - UrlSource (Crawl / Sitemap / Local FS / Explicit List) |
| - Interaction Engine (Playwright pre-audit DOM actions) |
| - PageScanner (axe-core evaluation) |
| - Normalizer (Finding[] aggregation) |
+--------------------------------+--------------------------------+
```

---

## 3. Data Contracts (`ScanPlan` & `PageTarget`)

The `ScanPlan` interface unifies all candidate input discovery modes and optional pre-audit actions.

```typescript
export type InputSource =

| { type: "sitemap"; url: string }
| { type: "crawl"; seedUrl: string; maxDepth?: number; maxPages?: number }
| { type: "urls"; targets: string[] }
| { type: "files"; glob: string[] };

export type DOMAction =

| { type: "click"; selector: string }
| { type: "wait"; selectorOrMs: string | number }
| { type: "fill"; selector: string; value: string };

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
  options?: {
    maxConcurrency?: number;
    viewport?: { width: number; height: number };
  };
  targets?: PageTarget[];
}

```

---

## 4. Markdown Test Plan Specification

Non-engineers, QA testers, and accessibility auditors can author audit plans in standard Markdown (`.md`). The engine processes these via frontmatter and structured lists.

### Syntax Rules:

1. **Frontmatter (YAML):** Contains top-level scan metadata, crawl configurations, concurrency limits, and glob exclusions.


2. **Target Lists (`- [ ]`):** Unchecked task items containing valid URLs are extracted as candidates.
3. **Scenario Heading + Code Block:** Subheadings containing code blocks formatted as `json` or `yaml` attach interactive `actions` to the preceding URL target.

---

## 5. Implementation & Next Steps

1. Add `front-matter` or `remark` dependency to `@a11y-page-checker/core`.


2. Implement `MarkdownParser.parse(filePath: string): ScanPlan`.
3. Update `UrlSource` to support dynamic crawling and local file resolution alongside existing sitemap tools.
