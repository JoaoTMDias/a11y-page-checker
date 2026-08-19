#!/usr/bin/env node
import { startUiServer } from "./index.js";

const port = Number.parseInt(process.env.A11Y_UI_PORT ?? "4174", 10);
const databasePath = process.env.A11Y_UI_DATABASE;
const allowedOrigin = process.env.A11Y_UI_ALLOWED_ORIGIN;
const serveClient = process.env.A11Y_UI_SERVE_CLIENT !== "false";
const server = await startUiServer({
  port,
  serveClient,
  ...(allowedOrigin ? { allowedOrigin } : {}),
  ...(databasePath ? { databasePath } : {}),
});

process.stdout.write(`A11y Page Checker UI: ${server.url}\n`);

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
