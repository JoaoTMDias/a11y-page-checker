# Local dashboard

`@a11y-page-checker/ui` is a local-first React dashboard served by Fastify. It creates crawl, sitemap, and Markdown scans, streams progress with Server-Sent Events (SSE), stores history in SQLite, filters findings, and downloads completed results as JSON or HTML.

## Start the dashboard

Build the workspace, then start it through the CLI:

```sh
pnpm build
node packages/cli/dist/bin.js ui
```

The default URL is `http://127.0.0.1:4174`. The command prints the URL and does not open a browser. Override the port with `--port`:

```sh
node packages/cli/dist/bin.js ui --port 4321
```

For frontend and backend development with live reload:

```sh
pnpm --filter @a11y-page-checker/ui dev
```

The standalone server accepts:

| Variable | Default | Purpose |
| --- | --- | --- |
| `A11Y_UI_PORT` | `4174` | Loopback port |
| `A11Y_UI_DATABASE` | `~/.a11y-page-checker/scans.sqlite` | SQLite database path |
| `A11Y_UI_ALLOWED_ORIGIN` | Server origin | Accepted browser origin |
| `A11Y_UI_SERVE_CLIENT` | `true` | Set to `false` when Vite serves the client in development |

## Execution and persistence

One scan runs at a time. Additional scans enter a FIFO queue, capped at 100 pending entries. Records use schema version 1 and persist the validated request, generated plan, progress, result, and public error.

Persisted states are `queued`, `running`, `completed`, and `failed`. On startup, interrupted `running` scans become `failed`; queued scans resume in creation order. Active scans cannot be deleted.

## HTTP API

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/session` | Returns the per-process session token |
| `POST` | `/api/scans` | Validates and queues a scan |
| `GET` | `/api/scans?page=1&pageSize=20&status=completed` | Lists scans with server-side pagination |
| `GET` | `/api/scans/:id` | Returns one scan |
| `GET` | `/api/scans/:id/events` | Streams state and progress over SSE |
| `GET` | `/api/scans/:id/download?format=json\|html` | Downloads a completed result |
| `DELETE` | `/api/scans/:id` | Deletes a non-active scan |

Mutable requests require the session token in `X-A11y-Session`. SSE responses emit an initial `state` event, subsequent `state` or `progress` events with IDs, and a keep-alive comment every 15 seconds.

`POST /api/scans` accepts one of these discriminated request shapes:

```ts
type CreateScanRequest =
  | {
      kind: "crawl";
      url: string;
      maxDepth?: number;
      maxPages?: number;
      maxConcurrency?: number;
      viewport?: { width: number; height: number };
      privateNetworkConfirmed?: boolean;
    }
  | {
      kind: "sitemap";
      url: string;
      maxConcurrency?: number;
      viewport?: { width: number; height: number };
      privateNetworkConfirmed?: boolean;
    }
  | {
      kind: "markdown";
      content: string;
      fileName: string;
      privateNetworkConfirmed?: boolean;
    };
```

Unknown properties are rejected, and URL fields accept only HTTP(S) protocols.

## Request limits

- Only HTTP(S) URLs are accepted.
- Request bodies are limited to 600 KiB and Markdown content to 512,000 characters.
- Crawl depth is 0 -10, page count 1 -500, and concurrency 1 -8.
- Viewports are bounded to 320 -3840 pixels wide and 240 -2160 pixels high.
- Page size is capped at 100 and IDs must be UUIDs.
- Markdown uploads contain text and a filename, never a filesystem path.
- Requests targeting private networks or localhost require explicit confirmation.

## Security model

The server is intended for one local developer and binds to `127.0.0.1`. It validates the exact `Host` and `Origin`, rejects cross-origin mutations without the random session token, disables proxy trust, and does not enable CORS.

Responses apply a restrictive Content Security Policy, `frame-ancestors 'none'`, `nosniff`, `DENY` framing, no-referrer, and disabled camera, microphone, and geolocation permissions. API responses are not cached. Findings and page HTML are displayed as text in React and escaped by the HTML reporter.

Do not expose this server to a network. Only scan systems you own or are authorised to test.
