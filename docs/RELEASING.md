# Releasing Design Canon

Releases are intentionally boring. Reproducibility beats ceremony.

Read [`RELEASE_STATUS.md`](RELEASE_STATUS.md) before beginning. A package version, Git tag, GitHub Release, npm publication, dist-tag, and provenance record are separate state transitions.

## Current recovery boundary

`v0.1.0-alpha.1` exists and points to its original source commit. It must remain immutable.

The alpha.1 tag did not complete the public package-release sequence. Maintenance now follows that tag, so do not move it to newer documentation or silently publish it as though it contained later maintenance. The next public package candidate is `0.1.0-alpha.2`.

The first npm publication must be an interactive bootstrap because npm trusted publishing requires the package to exist before a trust relationship can be configured. That bootstrap version cannot claim GitHub Actions provenance. A later version published by `.github/workflows/publish.yml` can become the first provenance-backed prerelease.

## Release-state model

Use these exact meanings:

1. **Version prepared**: `package.json`, `package-lock.json`, and `CHANGELOG.md` agree.
2. **Source tagged**: an immutable `v<version>` tag points to the exact release commit.
3. **Published to npm**: the exact name and version exist in the registry.
4. **GitHub Release published**: a GitHub Release object points to the tag.
5. **Verified**: package contents, dist-tags, integrity, shasum, CLI version, and clean installation pass.
6. **Provenance-backed**: the npm registry exposes provenance for that exact version.

Do not collapse these into one “released” checkbox.

## Preconditions

- The worktree is clean and checked out at the exact release commit.
- `main` is protected against force pushes and deletion.
- CI, browser tests, Dependency Review, and CodeQL are green.
- The changelog documents the release.
- `package.json` and `package-lock.json` contain the same unique semantic version.
- Two-factor authentication is enabled on the npm publisher account.
- The release tag is exactly `v<package-version>`.
- The intended tag does not already point to another commit.
- Package contents exclude research, tests, benchmark evidence, credentials, and machine-local files.

Do not publish benchmark evidence, authentication material, generated run source, screenshots, or anything under `.benchmark/`.

## Prepare the next version

After this maintenance pass, use `0.1.0-alpha.2` for the next package candidate:

```bash
npm version 0.1.0-alpha.2 --no-git-tag-version
```

Review both manifests and move the relevant `Unreleased` changelog entries into the new version section. Do not reuse alpha.1.

## Clean release gate

Run from a fresh checkout of the exact release commit:

```bash
npm ci --ignore-scripts
npm run check
npm test
npm audit --omit=dev --audit-level=high
npm pack --dry-run --json > package-report.json
```

Inspect `package-report.json`. Only the allowlisted runtime, rule, profile, schema, skill, selected user documentation, and top-level legal files should ship.

Also verify:

```bash
node ./bin/design-canon.js --version
node ./bin/design-canon.js profiles
git status --short
```

Stop on any mismatch or dirty worktree.

## Tag the exact release commit

Prefer a signed tag when signing is configured; otherwise use an annotated tag and record that limitation.

```bash
VERSION="$(node -p "require('./package.json').version")"
COMMIT="$(git rev-parse HEAD)"

git tag -s "v${VERSION}" "$COMMIT" -m "Design Canon ${VERSION}"
git rev-list -n 1 "v${VERSION}"
git push origin "refs/tags/v${VERSION}"
```

Never move, recreate, or reuse the tag after pushing it.

## First npm publication

npm requires a package to exist before a trusted publisher can be configured. The first publication is therefore an explicit bootstrap operation performed by a maintainer with npm 2FA.

Verify identity and namespace:

```bash
npm whoami
npm view design-canon --json
```

An `E404` from `npm view` means the unscoped name is not currently published. If the name exists under another owner, stop. Do not overwrite, impersonate, or silently rename the package.

From the exact tagged release commit, publish the prerelease under `next`:

```bash
NPM_CONFIG_PROVENANCE=false npm publish --access public --tag next
```

The explicit override is required because `package.json` requests provenance by default while a local bootstrap publication cannot receive GitHub Actions provenance. Do not claim provenance for this version.

If publication fails, preserve the exact error. Do not move the tag, reuse the version, or retry with looser security settings.

## Verify the bootstrap package

```bash
VERSION="$(node -p "require('./package.json').version")"

npm view "design-canon@${VERSION}" \
  version dist.integrity dist.shasum --json
npm view design-canon dist-tags --json
```

Require `next` to point to the prerelease. Do not assign an alpha to `latest`.

Test from a clean directory:

```bash
TEST_DIR="$(mktemp -d)"
cd "$TEST_DIR"
npm init -y
npm install --ignore-scripts --save-exact "design-canon@${VERSION}"
npx "design-canon@${VERSION}" --version
npx "design-canon@${VERSION}" profiles
```

Record the integrity, shasum, dist-tags, package file count, and clean-install result in the GitHub Release notes and [`RELEASE_STATUS.md`](RELEASE_STATUS.md).

## Configure trusted publishing

After the package exists, use npm 11.15 or newer and an account with package write access plus account-level 2FA:

```bash
npm install --global npm@11.18.0
npm trust github design-canon \
  --file publish.yml \
  --repo asimons81/design-canon \
  --allow-publish

npm trust list design-canon --json
```

The trust relationship must name:

- repository `asimons81/design-canon`;
- workflow `publish.yml`;
- permission to publish.

Do not store a long-lived npm publication token when trusted publishing is available.

## Publish the GitHub prerelease

Create a GitHub prerelease only after the npm bootstrap package and integrity values have been verified:

```bash
gh release create "v${VERSION}" \
  --repo asimons81/design-canon \
  --title "Design Canon ${VERSION}" \
  --notes-file RELEASE_NOTES.md \
  --prerelease \
  --verify-tag \
  --target "$COMMIT"
```

Publishing the GitHub Release triggers `.github/workflows/publish.yml`. For the already-published bootstrap version, the workflow should verify the tag and package, detect the exact version in npm, skip duplicate publication, and complete registry verification.

## Subsequent publications

After trusted publishing is configured, `.github/workflows/publish.yml` is the publication path. It:

- runs only for a published GitHub Release;
- checks out the release tag without persisted Git credentials;
- requires the tag to match `package.json` exactly;
- requires the tagged commit to be contained in `main`;
- pins the npm CLI;
- reruns repository, documentation, test, audit, and package-content gates;
- publishes prereleases under `next` and stable versions under `latest`;
- uses GitHub-hosted OIDC trusted publishing;
- verifies the published version and registry integrity metadata;
- safely skips publication when that exact version already exists.

A pushed tag alone does not trigger this workflow. A draft GitHub Release does not trigger it. The Release must be published.

## Failure handling

- **Tag exists, package absent**: do not move the tag. Decide whether to bootstrap that exact historical source or cut a new version from current `main`.
- **Package exists, GitHub Release absent**: verify the package, configure trust, then create the matching prerelease without republishing.
- **GitHub Release exists, workflow failed before npm publication**: fix the workflow under a new package version unless the existing version remains unpublished and the immutable tag still points to the reviewed source.
- **Exact npm version exists**: never attempt to overwrite it. npm versions are immutable.
- **Wrong dist-tag**: correct the dist-tag explicitly after verifying ownership; do not republish the version.
- **Provenance absent**: report it honestly. Configuration or workflow intent does not retroactively create provenance.

## Final verification

A release is ready to announce only after:

```bash
npm view "design-canon@${VERSION}" \
  version dist.integrity dist.shasum --json
npm view design-canon dist-tags --json
gh release view "v${VERSION}" --repo asimons81/design-canon
```

Confirm a clean installation, expected CLI version, exact tag commit, package allowlist, GitHub prerelease state, and workflow conclusion. Update [`RELEASE_STATUS.md`](RELEASE_STATUS.md) with verified facts rather than intended steps.
