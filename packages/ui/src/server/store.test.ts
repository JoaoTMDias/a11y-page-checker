import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ScanStore } from "./store.js";

const directories: string[] = [];

async function createStore(): Promise<ScanStore> {
  const directory = await mkdtemp(path.join(tmpdir(), "a11y-ui-"));
  directories.push(directory);
  return new ScanStore(path.join(directory, "scans.sqlite"));
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("ScanStore", () => {
  it("persists, lists and deletes completed scans", async () => {
    const store = await createStore();
    const stored = store.create("11111111-1111-4111-8111-111111111111", {
      kind: "crawl",
      url: "https://example.com",
    }, { source: { type: "crawl", seedUrl: "https://example.com" } });

    expect(store.list(1, 20).items).toHaveLength(1);
    store.complete(stored.id, {
      summary: { duration: 10, pagesScanned: 1, totalFindings: 0 },
      urlResults: [{ url: "https://example.com", findings: [] }],
    });
    expect(store.delete(stored.id)).toBe(true);
    expect(store.get(stored.id)).toBeUndefined();
    store.close();
  });

  it("marks running scans as interrupted", async () => {
    const store = await createStore();
    const stored = store.create("22222222-2222-4222-8222-222222222222", {
      kind: "sitemap",
      url: "https://example.com/sitemap.xml",
    }, { source: { type: "sitemap", url: "https://example.com/sitemap.xml" } });
    store.updateStatus(stored.id, "running");
    store.recoverInterrupted();

    expect(store.get(stored.id)).toMatchObject({ status: "failed" });
    store.close();
  });
});
