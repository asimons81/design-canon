# Security Policy

Report vulnerabilities privately through GitHub Security Advisories when available. Do not open a public issue containing exploit details.

Design Canon rule packs are operational instructions consumed by AI agents. Treat third-party packs as code-adjacent supply-chain inputs:

- review provenance and license
- pin versions or commits in production workflows
- inspect detectors and executable adapters before use
- never permit a rule pack to request secrets or unrelated command execution

The core project will not execute commands embedded in rule text.
