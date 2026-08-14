# ♿ a11y-page-checker — Map of Content (MOC)

Node.js CLI + core library for automated web accessibility scanning. Outputs normalized JSON; extensible via reporter plugins, MCP servers, and web interfaces [cite: 1].

## Architecture & Specifications
* [[RFC]] — Core API design, ScanOptions, ScanResult, event contracts [cite: 1].
* [[002-scan-plan-and-markdown-spec]] — Polymorphic ScanPlan schema & Markdown parser specification.
* [[Public Contracts]] — TypeScript interfaces (`Finding`, `FindingNode`, `ScanResult`, `Severity`) [cite: 1].
* [[Refactoring Plan]] — Decoupling `UrlSource`, `PageScanner`, `Normalizer`, `ReportGenerator` [cite: 1].

## Product & Integration Plans
* [[mcp-and-ui-platform]] — MCP server specifications and Web UI dashboard modes [cite: 1].
* [[CLI UX]] — Command surface, flag definitions, and terminal UI states [cite: 1].
* [[OpenACR-Mapping]] — WCAG 2.2 rule correlation and conformance derivation [cite: 1].

## Planning & Execution
* [[Roadmap]] — v0.1 → v0.2 → v0.3 milestones [cite: 1].
* [[v0.1 Core Library MVP Plan]] — 12-week execution schedule [cite: 1].
* [[Project Brief]] — Core goals, non-goals, and project scope [cite: 1].
