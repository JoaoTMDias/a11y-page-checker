# Contributing to a11y-page-checker

Thank you for helping improve the project. Bug reports, documentation improvements, tests, and focused code changes are welcome.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security vulnerabilities must be reported according to [SECURITY.md](SECURITY.md), not through public issues.

## Before you start

- Search [existing issues](https://github.com/JoaoTMDias/a11y-page-checker/issues) before opening a duplicate.
- Open an issue before investing in a large feature or public-contract change.
- Keep pull requests focused; unrelated refactors make changes harder to review.
- Only scan websites you own or have permission to test.

## Development setup

You need Node.js 22.13 or newer and pnpm 11.

```sh
git clone https://github.com/JoaoTMDias/a11y-page-checker.git
cd a11y-page-checker
pnpm install
pnpm exec playwright install chromium
pnpm build
pnpm test
```

Create a branch from the current default branch and use a descriptive name such as `fix/sitemap-filtering` or `feat/mcp-resource`.

## Project conventions

- Use native ESM, strict TypeScript, and type-only imports where applicable.
- Keep core runtime code silent. Terminal output and exit behavior belong in the CLI.
- Preserve `ScanPlan`, `ScanResult`, and related contracts unless the change explicitly updates the API.
- Keep Playwright and network boundaries mocked in ordinary unit tests.
- Preserve cleanup, target ordering, and concurrency guarantees.
- Do not edit generated `dist` files or the lockfile by hand.
- Do not reformat or modify unrelated files.

See [AGENTS.md](AGENTS.md) for package boundaries and detailed engineering guidance. Public contracts are documented in [docs/public-contracts.md](docs/public-contracts.md).

## Testing changes

Add tests for every behavior change, including relevant success, malformed-input, failure, and cleanup paths. Start with the affected package:

```sh
pnpm --filter @a11y-page-checker/core test
pnpm --filter @a11y-page-checker/cli test
pnpm --filter @a11y-page-checker/mcp test
pnpm --filter @a11y-page-checker/reporter-html test
```

Before opening a pull request, run:

```sh
pnpm test
pnpm build
```

## Pull requests

A pull request should:

- Explain the problem and the chosen solution.
- Link related issues.
- Identify user-facing or public-contract changes.
- Include tests and documentation where appropriate.
- Pass the complete CI suite.
- Avoid generated files, secrets, and unrelated formatting churn.

Maintainers may ask for a change to be split when it contains independent concerns. Contributions are licensed under the repository's [Apache License 2.0](LICENSE).
