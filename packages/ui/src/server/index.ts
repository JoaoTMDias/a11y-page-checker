import type { FastifyInstance } from "fastify";

import { createApp } from "./app.js";

export interface UiServerOptions {
  allowedOrigin?: string;
  databasePath?: string;
  host?: string;
  port?: number;
  serveClient?: boolean;
}

export interface UiServer {
  close(): Promise<void>;
  app: FastifyInstance;
  url: string;
}

export async function startUiServer(options: UiServerOptions = {}): Promise<UiServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4174;
  const app = await createApp({ ...options, host, port });
  await app.listen({ host, port });
  return {
    app,
    url: `http://${host}:${port}`,
    close: async () => app.close(),
  };
}

export { createApp } from "./app.js";
export { ScanQueue } from "./queue.js";
export { ScanStore } from "./store.js";
