import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownParser } from "./markdown-parser";

const temporaryDirectories: string[] = [];

async function writePlan(markdown: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "markdown-parser-"));
  const filePath = join(directory, "plan.md");
  temporaryDirectories.push(directory);
  await writeFile(filePath, markdown);
  return filePath;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("MarkdownParser", () => {
  it("parses Markdown text without requiring filesystem access", () => {
    expect(MarkdownParser.parseText("- [ ] Home: https://example.com/", "uploaded-plan.md")).toEqual({
      source: { targets: ["https://example.com/"], type: "urls" },
      targets: [{ name: "Home", url: "https://example.com/" }],
    });

    expect(() => MarkdownParser.parseText("---\nsource: [\n---\n", "uploaded-plan.md"))
      .toThrow("Invalid front matter in uploaded-plan.md");
  });

  it("maps YAML front matter and unchecked URL tasks to a scan plan", async () => {
    const filePath = await writePlan(`---
name: Storefront audit
source:
  type: crawl
  seedUrl: https://example.com
  maxDepth: 2
options:
  maxConcurrency: 4
  viewport: { width: 1280, height: 800 }
exclude:
  - /logout
---
# Routes
- [ ] Home: [https://example.com/](https://example.com/)
- [x] Already audited: https://example.com/old
- [ ] Contact: https://example.com/contact
`);

    await expect(MarkdownParser.parse(filePath)).resolves.toEqual({
      exclude: ["/logout"],
      name: "Storefront audit",
      options: { maxConcurrency: 4, viewport: { height: 800, width: 1280 } },
      source: { maxDepth: 2, seedUrl: "https://example.com", type: "crawl" },
      targets: [
        { name: "Home", url: "https://example.com/" },
        { name: "Contact", url: "https://example.com/contact" },
      ],
    });
  });

  it("derives a URL source and attaches JSON and YAML scenarios", async () => {
    const filePath = await writePlan(`# Audit
- [ ] Product: https://example.com/product

### Scenario: Add a product
Target: https://example.com/product
\`\`\`json
{"actions":[{"type":"click","selector":"#add"},{"type":"wait","selectorOrMs":250}]}
\`\`\`

### Scenario: Sign in
Target: [Login](https://example.com/login)
\`\`\`yaml
actions:
  - type: fill
    selector: "#email"
    value: user@example.com
  - type: click
    selector: "button[type=submit]"
\`\`\`
`);

    await expect(MarkdownParser.parse(filePath)).resolves.toEqual({
      source: {
        targets: ["https://example.com/product", "https://example.com/login"],
        type: "urls",
      },
      targets: [
        {
          actions: [
            { selector: "#add", type: "click" },
            { selectorOrMs: 250, type: "wait" },
          ],
          name: "Product",
          url: "https://example.com/product",
        },
        {
          actions: [
            { selector: "#email", type: "fill", value: "user@example.com" },
            { selector: "button[type=submit]", type: "click" },
          ],
          name: "Sign in",
          url: "https://example.com/login",
        },
      ],
    });
  });

  it("attaches a scenario without a Target line to the preceding task", async () => {
    const filePath = await writePlan(`- [ ] Menu: https://example.com/menu
### Scenario: Open the menu
\`\`\`json
{"actions":[{"type":"click","selector":"#menu"}]}
\`\`\`
`);

    const plan = await MarkdownParser.parse(filePath);

    expect(plan.targets).toEqual([{
      actions: [{ selector: "#menu", type: "click" }],
      name: "Menu",
      url: "https://example.com/menu",
    }]);
  });

  it("reports malformed front matter and invalid actions", async () => {
    const badYaml = await writePlan("---\nsource: [\n---\n");
    const badAction = await writePlan(`### Scenario: Broken
Target: https://example.com
\`\`\`yaml
actions:
  - type: fill
    selector: "#name"
\`\`\`
`);

    await expect(MarkdownParser.parse(badYaml)).rejects.toThrow("Invalid front matter");
    await expect(MarkdownParser.parse(badAction)).rejects.toThrow("Invalid fill action 1");
  });
});
