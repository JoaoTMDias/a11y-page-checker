# Documentation

This directory documents the behavior currently implemented by the workspace.

- [Architecture](architecture.md): packages, data flow, runtime boundaries, and report generation.
- [Scan plans and Markdown](scan-plans.md): `ScanPlan` sources, Markdown syntax, parsing APIs, and current execution limits.
- [Local dashboard](local-dashboard.md): UI startup, configuration, persistence, HTTP API, SSE, and security model.
- [Public contracts](public-contracts.md): canonical core types, results, and lifecycle events.

The executable TypeScript contracts in [`packages/core/src/types.ts`](../packages/core/src/types.ts) remain the source of truth when documentation and code differ.
