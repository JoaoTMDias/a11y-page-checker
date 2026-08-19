import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { ScanQueue } from "./queue.js";
import { ScanStore } from "./store.js";
import { toScanPlan } from "./validation.js";
import type { CreateScanRequest } from "../shared/contracts.js";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("local API security", () => {
  it("rejects invalid hosts and requires a session token for mutations", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "a11y-api-"));
    directories.push(directory);
    const store = new ScanStore(path.join(directory, "scans.sqlite"));
    const queue = {
      start() {},
      enqueue(input: CreateScanRequest) { return store.create(randomUUID(), input, toScanPlan(input)); },
    } as unknown as ScanQueue;
    const app = await createApp({ store, queue, serveClient: false });

    expect((await app.inject({ method: "GET", url: "/api/session", headers: { host: "evil.test" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/api/scans", headers: { host: "127.0.0.1:4174" }, payload: { kind: "crawl", url: "https://example.com" } })).statusCode).toBe(403);

    const session = await app.inject({ method: "GET", url: "/api/session", headers: { host: "127.0.0.1:4174" } });
    const token = (session.json() as { token: string }).token;
    const created = await app.inject({ method: "POST", url: "/api/scans", headers: { host: "127.0.0.1:4174", "x-a11y-session": token }, payload: { kind: "crawl", url: "https://example.com" } });
    expect(created.statusCode).toBe(202);
    await app.close();
  });
});
