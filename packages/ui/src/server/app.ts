import { timingSafeEqual, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { renderHtmlReport } from "@a11y-page-checker/reporter-html";
import { ZodError, z } from "zod";

import type { ScanStatus } from "../shared/contracts.js";
import { ScanQueue } from "./queue.js";
import { ScanStore } from "./store.js";
import { parseCreateScanRequest, targetsPrivateNetwork } from "./validation.js";

interface CreateAppOptions {
  allowedOrigin?: string;
  databasePath?: string;
  host?: string;
  port?: number;
  queue?: ScanQueue;
  store?: ScanStore;
  serveClient?: boolean;
}

const statusSchema = z.enum(["queued", "running", "completed", "failed"]);

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4174;
  const databasePath = options.databasePath ?? path.join(homedir(), ".a11y-page-checker", "scans.sqlite");
  await mkdir(path.dirname(databasePath), { recursive: true });

  const store = options.store ?? new ScanStore(databasePath);
  const queue = options.queue ?? new ScanQueue(store);
  const token = randomBytes(32).toString("base64url");
  const allowedHost = `${host}:${port}`;
  const allowedOrigin = options.allowedOrigin ?? `http://${allowedHost}`;
  const app = Fastify({
    bodyLimit: 600 * 1024,
    logger: false,
    trustProxy: false,
  });

  app.addHook("onRequest", async (request, reply) => {
    const requestHost = request.headers.host;
    if (requestHost !== allowedHost) {
      return reply.code(403).send({ error: "Invalid host." });
    }

    const origin = request.headers.origin;
    if (origin && origin !== allowedOrigin) {
      return reply.code(403).send({ error: "Invalid origin." });
    }

    reply.headers({
      "Content-Security-Policy": "default-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Cache-Control": request.url.startsWith("/api/") ? "no-store" : "no-cache",
    });
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const provided = request.headers["x-a11y-session"];
    if (typeof provided !== "string" || !secureEqual(provided, token)) {
      return reply.code(403).send({ error: "Invalid session token." });
    }
  });

  app.get("/api/session", async () => ({ token }));

  app.post("/api/scans", async (request, reply) => {
    const input = parseCreateScanRequest(request.body);
    if (targetsPrivateNetwork(input) && !input.privateNetworkConfirmed) {
      return reply.code(409).send({
        code: "PRIVATE_NETWORK_CONFIRMATION_REQUIRED",
        error: "Confirm that you are authorised to scan this private network target.",
      });
    }
    const scan = queue.enqueue(input);
    return reply.code(202).send(scan);
  });

  app.get("/api/scans", async (request) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: statusSchema.optional(),
    }).strict().parse(request.query);
    return store.list(query.page, query.pageSize, query.status as ScanStatus | undefined);
  });

  app.get("/api/scans/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const scan = store.get(id);
    return scan ?? reply.code(404).send({ error: "Scan not found." });
  });

  app.get("/api/scans/:id/events", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const scan = store.get(id);
    if (!scan) return reply.code(404).send({ error: "Scan not found." });

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(`event: state\ndata: ${JSON.stringify(scan)}\n\n`);

    const unsubscribe = queue.subscribe(id, (event) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(": keep-alive\n\n"), 15_000);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.get("/api/scans/:id/download", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { format } = z.object({ format: z.enum(["json", "html"]) }).parse(request.query);
    const stored = store.get(id);
    if (!stored?.result) return reply.code(409).send({ error: "The scan has no completed result." });

    if (format === "json") {
      return reply
        .type("application/json; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="scan-${id}.json"`)
        .send(JSON.stringify(stored.result, null, 2));
    }

    return reply
      .type("text/html; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="scan-${id}.html"`)
      .send(await renderHtmlReport(stored.result));
  });

  app.delete("/api/scans/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = store.get(id);
    if (!existing) return reply.code(404).send({ error: "Scan not found." });
    if (!store.delete(id)) return reply.code(409).send({ error: "Active scans cannot be deleted." });
    return reply.code(204).send();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Invalid request.", issues: error.issues });
    }
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    return reply.code(statusCode).send({
      error: statusCode < 500 && error instanceof Error ? error.message : "The local application could not complete the request.",
    });
  });

  if (options.serveClient !== false) {
    const clientRoot = fileURLToPath(new URL("../client", import.meta.url));
    await app.register(fastifyStatic, { root: clientRoot, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "Not found." });
      return reply.sendFile("index.html");
    });
  }

  app.addHook("onClose", async () => store.close());
  queue.start();
  return app;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
