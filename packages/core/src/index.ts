import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { EventEmitter } from "node:events";
import pLimit from "p-limit";

import { PageScanner, UrlSource } from "./core";
import type {
  ErrorEventPayload,
  Finding,
  PageDoneEventPayload,
  ProgressEventPayload,
  ScanOperation,
  ScanPlan,
  ScanResult,
} from "./types";

const DEFAULT_MAX_CONCURRENCY = 2;
const DEFAULT_VIEWPORT = { height: 800, width: 1280 };

class ScanOperationEmitter extends EventEmitter implements ScanOperation {
  readonly [Symbol.toStringTag] = "Promise";
  private readonly result: Promise<ScanResult>;

  constructor(executor: (operation: ScanOperationEmitter) => Promise<ScanResult>) {
    super();
    this.result = Promise.resolve().then(() => executor(this));
  }

  then<TResult1 = ScanResult, TResult2 = never>(
    onfulfilled?: ((value: ScanResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.result.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<ScanResult | TResult> {
    return this.result.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<ScanResult> {
    return this.result.finally(onfinally);
  }

  emitError(payload: ErrorEventPayload): void {
    if (this.listenerCount("error") > 0) {
      this.emit("error", payload);
    }
  }
}

export function scan(plan: ScanPlan): ScanOperation {
  return new ScanOperationEmitter((operation) => runScan(plan, operation));
}

async function runScan(plan: ScanPlan, operation: ScanOperationEmitter): Promise<ScanResult> {
  const startedAt = Date.now();

  try {
    const targets = await new UrlSource().resolve(plan);
    const browser = await chromium.launch();

    try {
      const context = await browser.newContext({ viewport: plan.options?.viewport ?? DEFAULT_VIEWPORT });

      try {
        const maxConcurrency = Math.max(1, plan.options?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY);
        const limit = pLimit(maxConcurrency);
        const scanner = new PageScanner();
        const urlResults = await Promise.all(
          targets.map((target) => limit(() => scanTarget(target.url, context, scanner, operation))),
        );
        const summary = {
          duration: Date.now() - startedAt,
          pagesScanned: urlResults.length,
          totalFindings: urlResults.reduce((total, result) => total + result.findings.length, 0),
        };
        const result = { summary, urlResults };

        operation.emit("done", { summary });
        return result;
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    operation.emitError({ error: toError(error) });
    throw error;
  }
}

async function scanTarget(
  url: string,
  context: BrowserContext,
  scanner: PageScanner,
  operation: ScanOperationEmitter,
): Promise<ScanResult["urlResults"][number]> {
  let page: Page | undefined;

  try {
    operation.emit("progress", toProgressPayload(url, "fetch"));
    page = await context.newPage();
    operation.emit("progress", toProgressPayload(url, "scan"));

    const findings = await scanner.scan(url, page);
    operation.emit("page:done", toPageDonePayload(url, findings));

    return { findings, url };
  } catch (error) {
    const normalizedError = toError(error);

    operation.emitError({ error: normalizedError, url });
    operation.emit("page:done", toPageDonePayload(url, []));

    return { error: normalizedError.message, findings: [], url };
  } finally {
    await page?.close();
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function toProgressPayload(url: string, step: ProgressEventPayload["step"]): ProgressEventPayload {
  return { step, url };
}

function toPageDonePayload(url: string, findings: Finding[]): PageDoneEventPayload {
  return { findingsCount: findings.length, url };
}

export * from "./core";
export * from "./types";
