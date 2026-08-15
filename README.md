# a11y-page-checker

Automated accessibility scanning for URLs, sitemaps, crawled sites, and Markdown test plans. The project combines Playwright and axe-core with a normalized TypeScript API, a command-line interface, an HTML reporter, and a Model Context Protocol (MCP) server for AI tools.

> [!IMPORTANT]
> This project is under active development and its packages are not currently published to npm. Install and run it from source while the public API stabilizes.

## Features

- Scan explicit URLs, remote XML or JSON sitemaps, or same-origin crawls.
- Normalize axe-core violations into a stable `ScanResult` contract.
- Define repeatable audits and browser interactions in Markdown.
- Observe scan progress through typed lifecycle events.
- Produce deterministic, escaped HTML reports.
- Run audits from a CLI or expose them to LLM clients over MCP stdio.
- Continue scanning independent pages when one target fails.

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io/) 11 (the repository pins the expected version)
- A Chromium browser installed for Playwright

## Getting started

Clone the repository, install dependencies, and install Chromium:

```sh
git clone https://github.com/JoaoTMDias/a11y-page-checker.git
cd a11y-page-checker
pnpm install
pnpm exec playwright install chromium
pnpm build
```

Run an audit with the CLI:

```sh
node packages/cli/dist/bin.js scan https://example.com --format table
```

Use `--format json` for machine-readable output. URLs ending in `.xml` or `.json` are treated as sitemaps by default; use `--source crawl` or `--source sitemap` to override detection.

> [!NOTE]
> Only scan sites you own or have permission to test. Crawls can generate meaningful traffic, especially with higher depth, page, or concurrency limits.

## Core API

The primary API accepts a `ScanPlan` and returns an awaitable scan operation:

```ts
import { scan, type ScanPlan } from "@a11y-page-checker/core";

const plan: ScanPlan = {
  name: "Documentation audit",
  source: {
    type: "crawl",
    seedUrl: "https://example.com/docs",
    maxDepth: 2,
    maxPages: 25,
  },
  exclude: ["/**/logout"],
  options: {
    maxConcurrency: 2,
    viewport: { width: 1280, height: 800 },
  },
};

const operation = scan(plan);

operation.on("progress", ({ step, url }) => {
  console.error(`[${step}] ${url}`);
});

const result = await operation;
console.log(JSON.stringify(result, null, 2));
```

Results include a summary and an ordered result for every attempted URL. Page-level failures are recorded on that URL result without unnecessarily aborting unrelated targets. See [Public Contracts](docs/public-contracts.md) for the complete API and event semantics.

## Markdown test plans

Markdown plans combine human-readable audit notes with structured targets and optional interaction scenarios. Only unchecked tasks containing HTTP(S) URLs are treated as targets.

````md
---
name: Storefront audit
options:
  maxConcurrency: 2
---

# Critical routes

- [ ] Home: https://example.com/
- [ ] Product: https://example.com/products/one
- [x] Already audited: https://example.com/archive

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

Parse and execute a plan through the core API:

```ts
import { MarkdownParser, scan } from "@a11y-page-checker/core";

const plan = await MarkdownParser.parse("./audit-plan.md");
const result = await scan(plan);
```

The full syntax is defined in [RFC 002](docs/rfc/002-scan-plan-and-markdown-spec.md), with a working example in [examples/test-plans/sample-audit.md](examples/test-plans/sample-audit.md).

## MCP server

The `@a11y-page-checker/mcp` package exposes accessibility audits to MCP-compatible clients over stdio. Build the workspace, then configure your client with an absolute path:

```json
{
  "mcpServers": {
    "a11y-page-checker": {
      "command": "node",
      "args": ["/absolute/path/to/a11y-page-checker/packages/mcp/dist/index.js"]
    }
  }
}
```

Available tools:

| Tool                  | Input                                             | Result                  |
| --------------------- | ------------------------------------------------- | ----------------------- |
| `audit_url`           | `{ "url": "https://example.com", "maxDepth": 1 }` | Normalized `ScanResult` |
| `audit_markdown_plan` | `{ "filePath": "/absolute/path/to/plan.md" }`     | Normalized `ScanResult` |

The MCP process inherits the filesystem and network permissions of the client that launches it. Keep plan paths and target URLs within the trust boundary you intend to grant that client.

## HTML reports

The reporter consumes the same normalized result contract:

```ts
import { generateHtmlReport } from "@a11y-page-checker/reporter-html";

const reportPath = await generateHtmlReport(result, "./reports");
console.log(reportPath);
```

## Workspace structure

| Path                     | Responsibility                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `packages/core`          | Discovery, Markdown parsing, Playwright/axe execution, normalization, and public contracts |
| `packages/cli`           | Terminal adapter and output formatting                                                     |
| `packages/mcp`           | MCP stdio server and audit tools                                                           |
| `packages/reporter-html` | Static HTML report generation                                                              |
| `docs`                   | Product requirements, RFCs, contracts, and roadmap                                         |
| `examples`               | Example plans and integrations                                                             |

## Development

Run all tests and builds from the workspace root:

```sh
pnpm test
pnpm build
```

Use package filters for faster iteration:

```sh
pnpm --filter @a11y-page-checker/core test
pnpm --filter @a11y-page-checker/mcp test
pnpm --filter @a11y-page-checker/reporter-html build
```

Tests use Vitest and mock browser and network boundaries where appropriate. Please add focused success and failure coverage for behavior changes, preserve strict TypeScript and native ESM conventions, and avoid editing generated `dist` files.

## Contributing

Issues and pull requests are welcome. Before proposing a change:

1. Search [existing issues](https://github.com/JoaoTMDias/a11y-page-checker/issues) to avoid duplicates.
2. Keep changes focused and preserve the public contracts unless the change explicitly updates them.
3. Add or update tests for observable behavior.
4. Run `pnpm test` and `pnpm build`.
5. Explain user-facing behavior and contract changes in the pull request.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the complete development and pull-request guidance. All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do not disclose vulnerabilities in a public issue. Follow the private reporting process in [SECURITY.md](SECURITY.md).

## Roadmap

See the [development roadmap](docs/Roadmap.md) and [MCP and UI platform PRD](docs/prd/mcp-and-ui-platform.md). Roadmap items describe direction, not commitments or currently available functionality.

## License

Licensed under the [Apache License 2.0](LICENSE). See the license for permissions and limitations.
