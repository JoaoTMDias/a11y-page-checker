#!/usr/bin/env node
import { scan, type ScanOperation, type ScanPlan, type ScanResult } from "@a11y-page-checker/core";
import chalk from "chalk";
import { Command } from "commander";
import { pathToFileURL } from "node:url";

type OutputFormat = "json" | "table";
type SourceType = "crawl" | "sitemap";

interface ScanCommandOptions {
  format: OutputFormat;
  source?: SourceType;
}

interface UiServerHandle {
  url: string;
}

type StartUiServer = (options?: { port?: number }) => Promise<UiServerHandle>;

interface CliDependencies {
  startUiServer?: StartUiServer;
  runScan?: typeof scan;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  stdout?: Pick<NodeJS.WriteStream, "write">;
}

const SITEMAP_EXTENSIONS = [".json", ".xml"];

export function createScanPlan(input: string, sourceOverride?: string): ScanPlan {
  const url = parseUrl(input);
  const sourceType = parseSourceType(sourceOverride) ?? inferSourceType(url);

  return sourceType === "sitemap"
    ? { source: { type: "sitemap", url: url.toString() } }
    : { source: { seedUrl: url.toString(), type: "crawl" } };
}

export function createProgram(dependencies: CliDependencies = {}): Command {
  const runScan = dependencies.runScan ?? scan;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const program = new Command();

  program.name("a11y-page-checker").description("Run accessibility scans from the command line");
  program
    .command("ui")
    .description("Start the local accessibility dashboard")
    .option("--port <port>", "Local port", "4174")
    .action(async ({ port }: { port: string }) => {
      const parsedPort = Number.parseInt(port, 10);
      if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new Error(`Invalid port: ${port}`);
      }
      const startUiServer = dependencies.startUiServer
        ?? (await import("@a11y-page-checker/ui")).startUiServer;
      const server = await startUiServer({ port: parsedPort });
      stdout.write(`A11y Page Checker UI: ${server.url}\n`);
    });

  program
    .command("scan <url-or-sitemap>")
    .description("Scan a URL or sitemap")
    .option("--source <source>", "Override automatic source detection: sitemap or crawl")
    .option("--format <format>", "Final output format: table or json", "table")
    .action(async (input: string, options: ScanCommandOptions) => {
      const format = parseOutputFormat(options.format);
      const operation = runScan(createScanPlan(input, options.source));

      subscribeToScan(operation, stderr);

      const result = await operation;
      stdout.write(formatResult(result, format));
    });

  return program;
}

export async function runCli(argv = process.argv, dependencies: CliDependencies = {}): Promise<void> {
  await createProgram(dependencies).parseAsync(argv);
}

export function formatResult(result: ScanResult, format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  const rows = result.urlResults.map((urlResult) => [
    urlResult.url,
    urlResult.error ? "error" : urlResult.findings.length > 0 ? "findings" : "passed",
    String(urlResult.findings.length),
  ]);
  const headers = ["URL", "Status", "Findings"];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const separator = `+-${widths.map((width) => "-".repeat(width)).join("-+-")}-+`;
  const renderRow = (row: string[]) => `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;

  return [
    `Summary: ${result.summary.pagesScanned} pages scanned, ${result.summary.totalFindings} findings, ${result.summary.duration}ms`,
    separator,
    renderRow(headers),
    separator,
    ...rows.map(renderRow),
    separator,
    "",
  ].join("\n");
}

function subscribeToScan(operation: ScanOperation, stderr: Pick<NodeJS.WriteStream, "write">): void {
  operation.on("progress", ({ step, url }) => {
    stderr.write(chalk.cyan(`[${step}] ${url}\n`));
  });
  operation.on("page:done", ({ findingsCount, url }) => {
    stderr.write(chalk.green(`[done] ${url}: ${findingsCount} findings\n`));
  });
  operation.on("error", ({ error, url }) => {
    stderr.write(chalk.red(`[error] ${url ?? "scan"}: ${error.message}\n`));
  });
  operation.on("done", ({ summary }) => {
    stderr.write(chalk.green(`[complete] ${summary.pagesScanned} pages scanned\n`));
  });
}

function parseUrl(input: string): URL {
  try {
    const url = new URL(input);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error("Unsupported protocol");
    }

    return url;
  } catch {
    throw new Error(`Expected an absolute HTTP(S) URL, received: ${input}`);
  }
}

function inferSourceType(url: URL): SourceType {
  return SITEMAP_EXTENSIONS.some((extension) => url.pathname.endsWith(extension)) ? "sitemap" : "crawl";
}

function parseSourceType(source?: string): SourceType | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (source === "crawl" || source === "sitemap") {
    return source;
  }

  throw new Error(`Unsupported source type: ${source}`);
}

function parseOutputFormat(format: string): OutputFormat {
  if (format === "json" || format === "table") {
    return format;
  }

  throw new Error(`Unsupported output format: ${format}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error: unknown) => {
    process.stderr.write(chalk.red(`${error instanceof Error ? error.message : String(error)}\n`));
    process.exitCode = 1;
  });
}
