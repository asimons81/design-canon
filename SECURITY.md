# Security Policy

## Reporting

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/asimons81/design-canon/security/advisories/new).

Do not open a public issue containing exploit details, malicious rule packs, secrets, or proof-of-concept payloads. Include:

- affected version or commit;
- impact and realistic attack path;
- minimal reproduction;
- suggested mitigation when known.

You should receive an acknowledgment within seven days. A fix timeline depends on severity and reproducibility.

## Supported Versions

Design Canon is pre-1.0. Security fixes are applied to the current `main` development line.

`v0.1.0-alpha.1` is an immutable source tag. Do not assume an npm distribution exists merely because the tag exists. Published-package support begins only after the exact registry version and clean installation are verified in [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md).

Older alpha source tags and future prerelease packages may not receive backports. Security fixes can require upgrading to a newer prerelease or current source commit.

## Threat Model

Design Canon consumes rule and profile data that influences AI agents. Treat third-party packs as code-adjacent supply-chain inputs.

The core project:

- validates built-in rule and profile data before use;
- rejects unsafe profile names and path traversal;
- does not execute commands embedded in rule text;
- skips symbolic links during source discovery;
- ignores dependency and generated-output directories;
- caps scanned file size and total findings;
- exposes evidence for mechanical findings;
- publishes only an explicit package allowlist;
- runs dependency, static-analysis, packaging, documentation, browser, and test gates in CI;
- keeps live benchmark execution behind explicit environment and CLI authorization gates;
- requires machine-generated, attempt-bound isolation evidence rather than trusting caller-supplied claims.

Users should:

- review provenance and licenses;
- pin versions or commits in production workflows;
- inspect executable adapters before enabling them;
- never allow rule packs to request secrets or unrelated command execution;
- run untrusted packs in a sandbox with least privilege;
- treat `scripts/bootstrap-b000-wsl.sh` as privileged research infrastructure and run it only in a dedicated Ubuntu WSL2 environment;
- authenticate benchmark agents interactively instead of copying credential files between users or machines;
- approve provider-backed benchmark calls only after reviewing the exact call count and expected spend.

## Package Publication

- A Git tag is not proof of npm publication.
- A configured provenance flag is not proof that a package was published with provenance.
- Verify the exact npm version, dist-tag, integrity, shasum, package contents, and clean installation before announcing it.
- Prefer npm trusted publishing through GitHub-hosted OIDC workflows after the package's one-time bootstrap publication.
- Do not store long-lived npm publication tokens in the repository when trusted publishing is available.
- Never move or reuse an existing release tag to repair a failed publication.

## Benchmark Evidence

Benchmark evidence, transcripts, screenshots, generated source, and authentication material are not package assets.

- `.benchmark/` must remain ignored and untracked.
- Authentication-file contents must never be printed, hashed, archived, transferred, or added to reports.
- Local evidence should be private to the runner account and excluded from public pull requests.
- Immutable attempt IDs must never be overwritten or silently reused.
- A failed attempt remains failed even when later capture or reporting steps succeed.

## Secrets

Never place secrets, tokens, private source code, personal data, authentication files, or sensitive machine metadata in issues, fixtures, rule packs, screenshots, generated reports, committed benchmark artifacts, release notes, or package contents.
