# a11y-page-checker — Development Roadmap

## v0.1 Core Library MVP (Target: Q1 2026)
* Core scan stub and headless execution engine [cite: 1].
* Complete decoupling from CLI logging side effects (`EventEmitter` pattern) [cite: 1].
* Public data contracts (`ScanOptions`, `ScanResult`, `Finding`, `Severity`) [cite: 1].
* Normalized JSON output stream [cite: 1].

## v0.2 Ecosystem Expansion (Target: Q2 2026)
* **Polymorphic `ScanPlan` Engine:** Dynamic spidering/crawl mode, local HTML file scanning, and explicit target arrays [cite: 1].
* **Markdown Test Plan Parser:** Execute audits directly from `.md` specification files.
* **MCP Server (`@a11y-page-checker/mcp`):** Stdio/HTTP integration for Cursor, Claude Desktop, and AI agents [cite: 1].
* **Local Web Dashboard (`@a11y-page-checker/ui`):** WebSocket-driven local GUI dashboard [cite: 1].
* **Reporter Plugins:** HTML and CSV export modules (`@a11y-page-checker/reporter-html`) [cite: 1].

## v0.3 Enterprise & Compliance (Target: Q3 2026)
* **Regulatory Compliance Engine:** OpenACR YAML export and VPAT drafting tools [cite: 1].
* **Zod Configuration Loader:** Discriminated union validation for `a11y-config.yml` [cite: 1].
* **Hosted Cloud SaaS Worker:** Queue-backed asynchronous scanning cluster for production pipelines.
