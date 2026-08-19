# AGENTS.md

Guidance for coding agents working in this repository. Prefer small, contract-preserving changes and verify them in the package that owns the behavior.

## Repository Overview

This is a pnpm workspace monorepo for an accessibility scanning tool:

- `packages/core` — public scanning API, URL discovery, Markdown plan parsing, Playwright/axe execution, and result normalization.
- `packages/cli` — command-line adapter around `@a11y-page-checker/core`.
- `packages/reporter-html` — HTML rendering for core `ScanResult` data.
- `docs/rfc` — architectural proposals and feature specifications.
- `examples/test-plans` — representative user-authored Markdown scan plans.

The project requires Node.js 22.13 or newer, native ESM, strict TypeScript, and pnpm workspaces. Use `workspace:*` for internal package dependencies.

## Source of Truth

Before changing behavior, inspect the nearest implementation and tests. For public APIs and scan-plan work, also consult:

- `packages/core/src/types.ts` for the canonical public data contracts.
- `packages/core/src/index.ts` and `packages/core/test/public-api.test.ts` for the exported API.
- `docs/scan-plans.md` for `ScanPlan` and Markdown plan semantics.
- `docs/public-contracts.md` for documented public result contracts.

If documentation and executable types disagree, do not silently invent a third interpretation. Preserve the current public type contract and call out the discrepancy, or update all affected documentation, types, implementation, and tests when the task authorizes an interface change.

## Package Boundaries

### Core

`packages/core` is a reusable library and must remain silent:

- Do not call `console.*` or write directly to stdout/stderr from core runtime code.
- Report scan lifecycle information through the existing `EventEmitter` events: `progress`, `page:done`, `error`, and `done`.
- Return data conforming to the interfaces in `packages/core/src/types.ts`, especially `ScanPlan`, `PageTarget`, `ScanResult`, `Finding`, and `Severity`.
- Keep browser and page cleanup in `finally` blocks. A failed target should not leak Playwright resources or unnecessarily abort unrelated targets.
- Preserve target ordering and configured concurrency unless a specification explicitly changes those guarantees.
- Export intended public features through the existing core barrel/public entry point and update the public API test when appropriate.

### CLI

`packages/cli` owns terminal interaction:

- Formatting, colors, progress messages, and process exit behavior belong here, not in core.
- Keep CLI logic as an adapter over the public core API; do not duplicate scanner behavior.
- Validate user input at the boundary and produce concise, actionable errors.

### HTML Reporter

`packages/reporter-html` consumes the core `ScanResult` contract:

- Keep rendering deterministic and escape untrusted page/finding content.
- Treat files under `dist` as generated output; edit source or templates instead.
- When templates change, verify both rendered content and package build output.

## Implementation Conventions

- Use native ESM imports and type-only imports where applicable.
- Follow strict TypeScript; avoid `any`, unchecked casts, and broad suppression comments.
- Prefer focused functions with explicit validation at file, network, CLI, and parsing boundaries.
- Preserve errors with useful context such as the file path, URL, source type, or action index.
- Keep dependencies package-local. Add a dependency only when the platform or an existing dependency cannot reasonably provide the behavior.
- Do not edit generated `dist` files or lockfile entries by hand.
- Do not reformat or modify unrelated files. The worktree may already contain user changes.

For Markdown plans specifically:

- Front matter maps to the public `ScanPlan` contract.
- Only unchecked task items (`- [ ]`) are URL candidates; checked tasks are ignored.
- Accept plain HTTP(S) URLs and Markdown links without treating arbitrary prose as a target.
- Scenario code blocks use JSON or YAML and must validate every `DOMAction` before returning a plan.
- Keep parsing deterministic, preserve document order, and provide file-specific errors for malformed input.

## Testing

Tests use Vitest and normally live beside the source as `*.test.ts`; package-level API tests may live under `test/`.

- Add or update tests for every behavior change and regression fix.
- Cover success, malformed input/failure, and cleanup paths relevant to the change.
- Mock Playwright and network boundaries in unit tests. Do not require live websites or a locally installed browser for ordinary unit tests.
- Assert observable behavior and public contracts rather than private implementation details.
- Keep tests deterministic; avoid real network access and timing-sensitive waits.

Run the narrowest useful checks while iterating:

```sh
pnpm --filter @a11y-page-checker/core test
pnpm --filter @a11y-page-checker/cli test
pnpm --filter @a11y-page-checker/reporter-html test
```

Before handing off a completed code change, run the affected package build and the full workspace tests:

```sh
pnpm --filter <package-name> build
pnpm test
```

Use `pnpm build` when a change affects shared contracts, package exports, or more than one package.

## Change Checklist

Before considering work complete:

1. Confirm the implementation matches the relevant RFC and public TypeScript contracts.
2. Confirm core runtime code remains silent and resource-safe.
3. Add focused tests, including failure cases where appropriate.
4. Verify intended exports and cross-package consumers after public API changes.
5. Run affected package tests/builds and then `pnpm test`.
6. Review the diff for generated files, unrelated edits, secrets, and accidental formatting churn.
