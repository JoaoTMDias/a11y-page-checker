#!/usr/bin/env node
import {
  MarkdownParser,
  scan,
  type ScanPlan,
  type ScanResult,
} from "@a11y-page-checker/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";

interface McpDependencies {
  parseMarkdownPlan?: (filePath: string) => Promise<ScanPlan>;
  runScan?: (plan: ScanPlan) => PromiseLike<ScanResult>;
}

const auditUrlInput = {
  maxDepth: z.number().int().nonnegative().optional().describe("Maximum crawl depth"),
  url: z.string().url().describe("Absolute HTTP(S) URL to audit"),
};

const auditMarkdownPlanInput = {
  filePath: z.string().min(1).describe("Path to a Markdown scan plan"),
};

export function createMcpServer(dependencies: McpDependencies = {}): McpServer {
  const runScan = dependencies.runScan ?? scan;
  const parseMarkdownPlan = dependencies.parseMarkdownPlan ?? MarkdownParser.parse.bind(MarkdownParser);
  const server = new McpServer({ name: "@a11y-page-checker/mcp", version: "0.0.0" });

  server.registerTool(
    "audit_url",
    {
      description: "Audit an HTTP(S) URL and return its normalized accessibility scan result",
      inputSchema: auditUrlInput,
    },
    async ({ maxDepth, url }) => toToolResult(await runScan(createUrlPlan(url, maxDepth))),
  );

  server.registerTool(
    "audit_markdown_plan",
    {
      description: "Execute a Markdown accessibility scan plan and return its normalized scan result",
      inputSchema: auditMarkdownPlanInput,
    },
    async ({ filePath }) => toToolResult(await runScan(await parseMarkdownPlan(filePath))),
  );

  return server;
}

export function createUrlPlan(url: string, maxDepth?: number): ScanPlan {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Expected an absolute HTTP(S) URL, received: ${url}`);
  }

  return {
    source: {
      seedUrl: parsedUrl.toString(),
      type: "crawl",
      ...(maxDepth === undefined ? {} : { maxDepth }),
    },
  };
}

export function toToolResult(result: ScanResult) {
  return {
    content: [{ text: JSON.stringify(result), type: "text" as const }],
    structuredContent: { ...result },
  };
}

export async function runServer(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runServer().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
