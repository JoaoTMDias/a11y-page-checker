# Instructions for AI Coding Agents
## Environment & Engine Constraints

* **Architecture:** Monorepo using workspace packages (`packages/core`, `packages/cli`, `packages/reporter-html`).
* **Runtime:** Node.js >= 20, Native ESM (`"type": "module"`), strict TypeScript.
* **Package Manager:** Use npm/pnpm workspace protocols for cross-package links.

## Core Package Rules (`packages/core`)
* **Strict Silence Requirement:** `packages/core` MUST BE COMPLETELY SILENT. Never use `console.log`, `chalk`, or write directly to `stdout`/`stderr` inside any core execution utility.
* **Event-Driven Progress:** Progress, errors, and status updates must be communicated exclusively via Node's `EventEmitter` channels (`progress`, `page:done`, `error`, `done`).
* **Data Contracts:** All core outputs must conform to public interfaces defined in `packages/core/src/types.ts` (`ScanPlan`, `ScanResult`, `Finding`, `Severity`).

## Workflow Rules
* Always check that unit tests pass (`npm test` or `pnpm test`) after modifying modules.
* Consult architectural specifications in `docs/rfc/002-scan-plan-and-markdown-spec.md` and `docs/Refactoring Plan.md` before changing system interfaces.
