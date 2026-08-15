# Security Policy

## Supported versions

The project is pre-release and currently supports only the latest revision of the default branch. No released version receives separate security updates yet.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue, discussion, or pull request.

Report vulnerabilities through a [private GitHub security advisory](https://github.com/JoaoTMDias/a11y-page-checker/security/advisories/new). If private reporting is unavailable, email me with the subject `a11y-page-checker security report`.

Please include:

- A description of the vulnerability and its potential impact.
- The affected component, revision, and environment.
- Reproduction steps or a minimal proof of concept.
- Any known mitigations or workarounds.
- Whether and when you intend to publish details.

You should receive an acknowledgment within seven days. The maintainer will investigate, coordinate a fix and disclosure timeline when applicable, and credit reporters who request attribution. Please allow a reasonable remediation period before public disclosure.

## Scope

Relevant reports include vulnerabilities in scan-plan parsing, URL discovery, browser execution, report rendering, the CLI, and the MCP server. Accessibility defects and ordinary functional bugs should use the public issue tracker unless they also create a security impact.
