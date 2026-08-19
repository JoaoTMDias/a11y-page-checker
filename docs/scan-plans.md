# Scan plans and Markdown

A `ScanPlan` describes where targets come from, which URL paths are included, and optional metadata associated with specific targets. See [Public contracts](public-contracts.md) for the complete TypeScript types.

## Sources

| Source | Behavior |
| --- | --- |
| `sitemap` | Fetches an absolute HTTP(S) XML or JSON sitemap |
| `crawl` | Follows same-origin HTTP(S) links from a seed URL, bounded by optional depth and page limits |
| `urls` | Scans an ordered list of absolute HTTP(S) URLs |
| `files` | Present in the public type but not implemented; resolution rejects with an unsupported-source error |

Target URLs are normalized and deduplicated. Explicit `targets` overlay source-discovered entries and may introduce additional URLs. `include` and `exclude` use glob patterns matched against URL pathnames.

## Parsing APIs

Parse a file asynchronously:

```ts
import { MarkdownParser } from "@a11y-page-checker/core";

const plan = await MarkdownParser.parse("./audit-plan.md");
```

Parse in-memory content without exposing a filesystem path:

```ts
const plan = MarkdownParser.parseText(markdown, "uploaded-plan.md");
```

The optional source name appears in validation errors and defaults to `Markdown scan plan`.

## Markdown syntax

YAML front matter maps to top-level `ScanPlan` fields. When it omits `source`, the parser derives an explicit `urls` source from unchecked tasks.

````md
---
name: Storefront audit
source:
  type: crawl
  seedUrl: https://example.com/
  maxDepth: 2
  maxPages: 25
options:
  maxConcurrency: 2
  viewport:
    width: 1280
    height: 800
exclude:
  - "/account/logout"
---

- [ ] Home: https://example.com/
- [ ] Checkout: [Checkout page](https://example.com/checkout)
- [x] Already audited: https://example.com/archive
````

Only unchecked task items containing a bare HTTP(S) URL or Markdown link become targets. Checked tasks and arbitrary prose are ignored, and document order is preserved.

Scenario headings can attach validated action metadata to the preceding task or to an explicit `Target:` URL:

````md
### Scenario: Open the cart drawer

Target: https://example.com/products/one

```yaml
actions:
  - type: click
    selector: "#add-to-cart"
  - type: wait
    selectorOrMs: ".cart-drawer-open"
  - type: fill
    selector: "#quantity"
    value: "2"
```
````

Scenario blocks accept JSON, YAML, or YML fences. Malformed front matter, unclosed fences, missing action arrays, and invalid actions throw an error containing the source name.

## Current execution limits

The public contracts and parser preserve `PageTarget.actions` and per-target `rules`, but the current scan engine does not execute either. They are metadata only and must not be relied on as scan preconditions or axe rule overrides. Local file scanning is also not implemented.
