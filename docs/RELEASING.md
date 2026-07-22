# Releasing Design Canon

Releases are intentionally boring. Reproducibility beats ceremony.

## Preconditions

- The worktree is clean and checked out at the exact release commit.
- `main` is protected against force pushes and deletion.
- CI, browser tests, Dependency Review, and CodeQL are green.
- The changelog documents the release.
- `package.json` and `package-lock.json` contain the same unique semantic version.
- Two-factor authentication is enabled on the npm publisher account.
- The release tag is exactly `v<package-version>`.

Do not publish benchmark evidence, authentication material, generated run source, screenshots, or anything under `.benchmark/`.

## Clean release gate

Run from a fresh checkout of the exact release commit:

```bash
npm ci --ignore-scripts
npm run check
npm test
npm audit --omit=dev --audit-level=high
npm pack --dry-run --json
```

Inspect the package report. Only the allowlisted runtime, rule, profile, schema, skill, documentation, and top-level legal files should ship.

## First npm publication

npm requires a package to exist before a trusted publisher can be configured. The first publication is therefore an explicit bootstrap operation performed by a maintainer with npm 2FA.

Verify the account and package namespace before publishing:

```bash
npm whoami
npm view design-canon --json
```

An `E404` from `npm view` means the unscoped name is not currently published. If the name exists under another owner, stop. Do not overwrite, impersonate, or silently rename the package.

From the exact tagged release commit, publish the prerelease under `next`:

```bash
npm publish --access public --tag next
```

A local first publication cannot receive npm provenance because provenance requires a supported cloud CI runner. Do not claim provenance for this bootstrap publication.

Immediately after the package exists, configure the repository workflow as its trusted publisher. npm 11.15 or newer is required:

```bash
npm install --global npm@11.18.0
npm trust github design-canon \
  --file publish.yml \
  --repo asimons81/design-canon \
  --allow-publish
```

The trust command requires npm 2FA and must be run by a package maintainer. Do not use a long-lived automation token when trusted publishing is available.

## Subsequent publications

`.github/workflows/publish.yml` runs when a GitHub Release is published. It:

- checks out the release tag without persisted Git credentials;
- requires the tag to match `package.json` exactly;
- pins the npm CLI;
- reruns repository, test, audit, and package-content gates;
- publishes prereleases under `next` and stable versions under `latest`;
- uses npm trusted publishing through GitHub OIDC;
- verifies the published version and registry integrity metadata;
- safely skips publication when that exact version already exists.

Trusted publishing automatically generates provenance for public packages published from this public GitHub repository. The workflow intentionally contains no npm token.

## Verify

After publication:

```bash
npm view design-canon@<version> version dist.integrity dist.shasum --json
npm install --ignore-scripts --no-save design-canon@<version>
npx design-canon@<version> --version
```

Confirm that prereleases use the `next` dist-tag and do not replace `latest`:

```bash
npm view design-canon dist-tags --json
```

Create a GitHub prerelease for alpha and beta versions, pointing to the exact release tag. Include the npm integrity and shasum values in the release notes. Never publish from a dirty worktree, bypass a failing gate, reuse a version, or move an existing release tag.
