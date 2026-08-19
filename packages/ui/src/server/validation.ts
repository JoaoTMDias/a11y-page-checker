import { MarkdownParser, type ScanPlan } from "@a11y-page-checker/core";
import { z } from "zod";

import type { CreateScanRequest } from "../shared/contracts.js";

const url = z.string().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Only HTTP(S) URLs are supported");

const viewport = z.object({
  width: z.number().int().min(320).max(3840),
  height: z.number().int().min(240).max(2160),
}).strict();

const common = {
  maxConcurrency: z.number().int().min(1).max(8).optional(),
  viewport: viewport.optional(),
};

export const createScanSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("crawl"),
    url,
    maxDepth: z.number().int().min(0).max(10).optional(),
    maxPages: z.number().int().min(1).max(500).optional(),
    privateNetworkConfirmed: z.boolean().optional(),
    ...common,
  }).strict(),
  z.object({
    kind: z.literal("sitemap"),
    url,
    privateNetworkConfirmed: z.boolean().optional(),
    ...common,
  }).strict(),
  z.object({
    kind: z.literal("markdown"),
    content: z.string().min(1).max(512_000),
    fileName: z.string().min(1).max(255).regex(/^[^/\\]+\.md$/i),
    privateNetworkConfirmed: z.boolean().optional(),
  }).strict(),
]);

export function parseCreateScanRequest(value: unknown): CreateScanRequest {
  return createScanSchema.parse(value) as CreateScanRequest;
}

export function toScanPlan(input: CreateScanRequest): ScanPlan {
  if (input.kind === "markdown") {
    return MarkdownParser.parseText(input.content, input.fileName);
  }

  const options = {
    ...(input.maxConcurrency === undefined ? {} : { maxConcurrency: input.maxConcurrency }),
    ...(input.viewport === undefined ? {} : { viewport: input.viewport }),
  };

  return {
    source: input.kind === "crawl"
      ? {
          type: "crawl",
          seedUrl: input.url,
          ...(input.maxDepth === undefined ? {} : { maxDepth: input.maxDepth }),
          ...(input.maxPages === undefined ? {} : { maxPages: input.maxPages }),
        }
      : { type: "sitemap", url: input.url },
    ...(Object.keys(options).length === 0 ? {} : { options }),
  };
}

export function targetsPrivateNetwork(input: CreateScanRequest): boolean {
  const plan = toScanPlan(input);
  const urls = [
    ...plan.targets?.map(({ url }) => url) ?? [],
    ...(plan.source.type === "crawl" ? [plan.source.seedUrl] : []),
    ...(plan.source.type === "sitemap" ? [plan.source.url] : []),
    ...(plan.source.type === "urls" ? plan.source.targets : []),
  ];
  return urls.some((value) => {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost"
      || hostname === "::1"
      || hostname.endsWith(".local")
      || /^127\./.test(hostname)
      || /^10\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  });
}
