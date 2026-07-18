# Releasing Design Canon

Releases are intentionally boring. Reproducibility beats ceremony.

## Preconditions

- The worktree is clean.
- `main` is protected against force pushes and deletion.
- CI and CodeQL are green.
- The changelog documents the release.
- The package version is unique and follows semantic versioning.
- npm trusted publishing or a short-lived automation token is configured.
- Two-factor authentication is enabled on the npm publisher account.

## Local release gate

```bash
npm ci --ignore-scripts
npm run check
npm test
npm audit --omit=dev --audit-level=high
npm pack --dry-run --json
```

Inspect the package report. Only the allowlisted runtime, rule, profile, schema, skill, and top-level legal files should ship.

## Publish

Prefer npm trusted publishing from GitHub Actions. When publishing manually, use provenance:

```bash
npm publish --provenance --access public
```

Never publish from a dirty worktree or bypass a failing gate.

## Verify

After publication:

```bash
npm view design-canon version dist.integrity dist.shasum
npm install --ignore-scripts --no-save design-canon@<version>
npx design-canon@<version> --version
```

Create a signed GitHub release that points to the exact source commit and includes the generated package integrity values.
