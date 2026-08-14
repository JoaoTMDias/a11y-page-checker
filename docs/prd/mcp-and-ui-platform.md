# PRD: Model Context Protocol (MCP) Server & Web Interface Platform

* **Status:** Draft
* **Target Version:** v0.2 / v0.3
* **Tags:** prd, mcp, web-ui, architecture
* **Related Documents:** [[RFC 002]], [[_MOC]]

---

## 1. Product Objectives
Expand `a11y-page-checker` from a command-line engine into an enterprise platform by exposing:
1. An **MCP Server** (`@a11y-page-checker/mcp`) that allows AI IDEs (Cursor, Claude Desktop, Windsurf) to execute accessibility scans and auto-remediate DOM issues [cite: 1].
2. A **Web Dashboard Interface** (`@a11y-page-checker/ui`) that visualizes real-time progress, normalized findings, and WCAG compliance trends [cite: 1].

---

## 2. MCP Server Feature Specification (`@a11y-page-checker/mcp`)

The MCP server package communicates over stdio/HTTP protocols, exposing tools and resources directly to AI agents [cite: 1].

### Exposed MCP Tools:
* **`audit_url`**:
  * *Input:* `{ url: string, maxDepth?: number }`
  * *Output:* Normalized `ScanResult` JSON payload [cite: 1].
* **`audit_markdown_plan`**:
  * *Input:* `{ filePath: string }`
  * *Output:* Execution summary and array of failing `Finding` objects [cite: 1].
* **`explain_wcag_failure`**:
  * *Input:* `{ findingId: string }`
  * *Output:* Rule remediation guidance, WCAG 2.2 references, and example code fixes [cite: 1].

### Exposed MCP Resources:
* **`a11y://reports/latest`**: Streams the output of the most recent audit run.
* **`a11y://wcag/rules`**: Exposes internal rule-to-WCAG mapping definitions [cite: 1].

---

## 3. Web Interface Architectural Modes
```
+-------------------------------------------------------------------+
| Option A: Local Dev Dashboard (CLI Spawned) |
| `a11y-page-checker ui` ==> Express/Fastify + SSE / WebSockets |
| - Runs on http://localhost:3000 |
| - Tests local dev environments & firewalled sites |
+-------------------------------------------------------------------+

+-------------------------------------------------------------------+
| Option B: Cloud SaaS Runner |
| Next.js Frontend ==> Cloud Workers (AWS Lambda / Railway) |
| - Headless Playwright / Node container runners |
| - Stores ScanResult in database; exports OpenACR / PDF / HTML |
+-------------------------------------------------------------------+
```

### Local Dev Dashboard (Recommended Initial Scope for v0.2)

* Running `a11y-page-checker ui` starts a lightweight local web server.
* The frontend subscribes to `@a11y-page-checker/core` real-time `EventEmitter` signals (`progress`, `page:done`) via WebSockets or Server-Sent Events (SSE).
* Renders real-time progress bars, DOM selector failure snippets, and downloadable compliance reports.
