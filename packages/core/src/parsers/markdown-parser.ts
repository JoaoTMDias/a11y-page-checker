import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

import type { DOMAction, InputSource, PageTarget, ScanPlan } from "@/types";

type UnknownRecord = Record<string, unknown>;

const FRONT_MATTER = /^\uFEFF?---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)/;
const TASK_ITEM = /^\s*[-*+]\s+\[\s\]\s+(.+)$/i;
const SCENARIO_HEADING = /^#{1,6}\s+Scenario:\s*(.+?)\s*#*\s*$/i;
const TARGET_LINE = /^\s*Target:\s*(.+?)\s*$/i;
const FENCE_START = /^\s*(`{3,}|~{3,})\s*(json|ya?ml)\s*$/i;

export class MarkdownParser {
  static async parse(filePath: string): Promise<ScanPlan> {
    const markdown = await readFile(filePath, "utf8");
    return this.parseMarkdown(markdown, filePath);
  }

  private static parseMarkdown(markdown: string, filePath: string): ScanPlan {
    const frontMatterMatch = markdown.match(FRONT_MATTER);
    const settings = frontMatterMatch
      ? this.parseObject(frontMatterMatch[1] ?? "", "front matter", filePath)
      : {};
    const body = frontMatterMatch ? markdown.slice(frontMatterMatch[0].length) : markdown;
    const targets = this.parseTargets(body, filePath);
    const source = settings.source === undefined
      ? { targets: targets.map((target) => target.url), type: "urls" as const }
      : this.parseSource(settings.source, filePath);

    return {
      ...settings,
      source,
      ...(targets.length > 0 ? { targets } : {}),
    } as ScanPlan;
  }

  private static parseTargets(markdown: string, filePath: string): PageTarget[] {
    const targets = new Map<string, PageTarget>();
    const lines = markdown.split(/\r?\n/);
    let inFence = false;
    let fenceMarker = "";
    let latestUrl: string | undefined;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const anyFence = line.match(/^\s*(`{3,}|~{3,})/);

      if (inFence) {
        if (anyFence?.[1]?.startsWith(fenceMarker[0] ?? "") && anyFence[1].length >= fenceMarker.length) {
          inFence = false;
        }
        continue;
      }

      if (anyFence) {
        inFence = true;
        fenceMarker = anyFence[1] ?? "";
        continue;
      }

      const task = line.match(TASK_ITEM);
      if (task) {
        const url = this.extractUrl(task[1] ?? "");
        if (url) {
          const label = this.extractLabel(task[1] ?? "", url);
          targets.set(url, { ...(label ? { name: label } : {}), url });
          latestUrl = url;
        }
        continue;
      }

      const scenario = line.match(SCENARIO_HEADING);
      if (!scenario) {
        continue;
      }

      const parsed = this.parseScenario(lines, index + 1, latestUrl, filePath);
      index = parsed.endIndex;
      if (!parsed.url || !parsed.actions) {
        continue;
      }

      const existing = targets.get(parsed.url);
      targets.set(parsed.url, {
        ...existing,
        actions: parsed.actions,
        name: existing?.name ?? scenario[1]?.trim(),
        url: parsed.url,
      });
      latestUrl = parsed.url;
    }

    return [...targets.values()];
  }

  private static parseScenario(
    lines: string[],
    startIndex: number,
    precedingUrl: string | undefined,
    filePath: string,
  ): { actions?: DOMAction[]; endIndex: number; url?: string } {
    let url = precedingUrl;

    for (let index = startIndex; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (/^#{1,6}\s+/.test(line)) {
        return { endIndex: index - 1, url };
      }

      const target = line.match(TARGET_LINE);
      if (target) {
        url = this.extractUrl(target[1] ?? "") ?? url;
      }

      const fence = line.match(FENCE_START);
      if (!fence) {
        continue;
      }

      const marker = fence[1] ?? "```";
      const block: string[] = [];
      let endIndex = index + 1;
      for (; endIndex < lines.length; endIndex += 1) {
        const candidate = lines[endIndex] ?? "";
        const closing = candidate.match(/^\s*(`{3,}|~{3,})\s*$/);
        if (closing?.[1]?.startsWith(marker[0] ?? "") && closing[1].length >= marker.length) {
          break;
        }
        block.push(candidate);
      }

      if (endIndex === lines.length) {
        throw new Error(`Unclosed scenario code block in ${filePath}`);
      }

      const value = this.parseObject(block.join("\n"), "scenario", filePath);
      return { actions: this.parseActions(value.actions, filePath), endIndex, url };
    }

    return { endIndex: lines.length - 1, url };
  }

  private static parseActions(value: unknown, filePath: string): DOMAction[] {
    if (!Array.isArray(value)) {
      throw new Error(`Scenario in ${filePath} must define an actions array`);
    }

    return value.map((action, index) => {
      if (!this.isRecord(action) || typeof action.type !== "string") {
        throw new Error(`Invalid action ${index + 1} in ${filePath}`);
      }
      if (action.type === "click" && typeof action.selector === "string") {
        return { selector: action.selector, type: "click" };
      }
      if (
        action.type === "wait"
        && (typeof action.selectorOrMs === "string" || typeof action.selectorOrMs === "number")
      ) {
        return { selectorOrMs: action.selectorOrMs, type: "wait" };
      }
      if (action.type === "fill" && typeof action.selector === "string" && typeof action.value === "string") {
        return { selector: action.selector, type: "fill", value: action.value };
      }
      throw new Error(`Invalid ${action.type} action ${index + 1} in ${filePath}`);
    });
  }

  private static parseSource(value: unknown, filePath: string): InputSource {
    if (!this.isRecord(value) || typeof value.type !== "string") {
      throw new Error(`Front matter in ${filePath} must define a valid source`);
    }

    switch (value.type) {
      case "sitemap":
        if (typeof value.url === "string") return { type: "sitemap", url: this.unwrapMarkdownUrl(value.url) };
        break;
      case "crawl":
        if (typeof value.seedUrl === "string") {
          return {
            type: "crawl",
            seedUrl: this.unwrapMarkdownUrl(value.seedUrl),
            ...(typeof value.maxDepth === "number" ? { maxDepth: value.maxDepth } : {}),
            ...(typeof value.maxPages === "number" ? { maxPages: value.maxPages } : {}),
          };
        }
        break;
      case "urls":
        if (Array.isArray(value.targets) && value.targets.every((target) => typeof target === "string")) {
          return { targets: value.targets.map((target) => this.unwrapMarkdownUrl(target)), type: "urls" };
        }
        break;
      case "files":
        if (Array.isArray(value.glob) && value.glob.every((glob) => typeof glob === "string")) {
          return { glob: value.glob, type: "files" };
        }
        break;
    }

    throw new Error(`Invalid ${value.type} source in ${filePath}`);
  }

  private static parseObject(content: string, section: string, filePath: string): UnknownRecord {
    let value: unknown;
    try {
      value = parseYaml(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid ${section} in ${filePath}: ${message}`);
    }
    if (value === null || value === undefined) return {};
    if (!this.isRecord(value)) throw new Error(`Invalid ${section} in ${filePath}: expected an object`);
    return value;
  }

  private static extractUrl(text: string): string | undefined {
    const markdownLink = text.match(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    const bareUrl = text.match(/https?:\/\/[^\s<>)\]]+/i);
    const candidate = markdownLink?.[1] ?? bareUrl?.[0];
    if (!candidate) return undefined;

    try {
      const url = new URL(candidate.replace(/[.,;:!?]+$/, ""));
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  }

  private static extractLabel(text: string, url: string): string | undefined {
    const withoutLink = text
      .replace(/\[[^\]]*\]\(https?:\/\/[^\s)]+\)/i, "")
      .replace(url, "")
      .replace(/[:\s-]+$/, "")
      .trim();
    return withoutLink || undefined;
  }

  private static unwrapMarkdownUrl(value: string): string {
    return value.match(/^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/i)?.[1] ?? value;
  }

  private static isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
