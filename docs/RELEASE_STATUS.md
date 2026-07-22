# Release Status

Last verified: 2026-07-21 (America/Chicago)

This file is the repository source of truth for release state. A Git tag, a GitHub Release, and an npm publication are separate events. Do not describe one as proof that the others completed.

## Current state

| Surface | Status | Evidence |
|---|---|---|
| Package manifest | `0.1.0-alpha.1` | `package.json` and `package-lock.json` agree |
| Source tag | Complete | `v0.1.0-alpha.1` points to `d46eb8ecd4e3e4ca872799f959ced66edf53b31e` |
| GitHub Release | Incomplete until independently verified | A pushed tag alone does not create or publish a GitHub Release |
| npm package | Incomplete until independently verified | Do not advertise `npm install design-canon` until the registry entry and clean install are verified |
| Trusted publishing workflow | Implemented, not sufficient by itself | `.github/workflows/publish.yml` runs only when a GitHub Release is published |
| Public announcement | Not authorized | Announce only after the package, dist-tag, integrity, and clean install are verified |

The `v0.1.0-alpha.1` tag is immutable historical source state. Do not move, delete, or reuse it. This maintenance pass occurs after that tag, so the next public package candidate should be `0.1.0-alpha.2` rather than retroactively changing alpha.1.

## Why the package did not publish automatically

The publication workflow listens for the GitHub `release.published` event. Pushing `v0.1.0-alpha.1` without publishing a GitHub Release does not trigger it.

There is also a first-publication bootstrap boundary: npm trusted publishing can be configured only after the package already exists in the registry. The first npm version therefore requires an interactive maintainer publication with account-level two-factor authentication. After that publication, configure `.github/workflows/publish.yml` as the trusted publisher for later versions.

The first interactive npm publication cannot receive GitHub Actions provenance. The first provenance-backed Design Canon prerelease must be a later version published through the trusted workflow.

## Safe next release sequence

1. Finish and merge repository maintenance.
2. Choose `0.1.0-alpha.2` and update both package manifests plus the changelog.
3. Run all release gates from a clean checkout.
4. Create an immutable `v0.1.0-alpha.2` tag at the exact release commit.
5. Perform the one-time npm bootstrap publication under the `next` dist-tag with two-factor authentication.
6. Verify registry integrity, dist-tags, package contents, and a clean installation.
7. Configure the GitHub trusted publisher.
8. Create the GitHub prerelease and verify the publication workflow safely detects the already-published bootstrap version.
9. Use the trusted workflow for subsequent versions. The next workflow-published prerelease can carry provenance.

See [`RELEASING.md`](RELEASING.md) for commands and failure handling.

## Verification rules

A release is complete only when all applicable statements are true:

- the tag points to the intended commit and has never moved;
- the GitHub Release points to that tag;
- the npm name and exact version exist;
- prereleases use `next`, not `latest`;
- registry integrity and shasum are recorded;
- installation succeeds in a clean directory;
- the CLI reports the expected version;
- package contents exclude tests, research, benchmark evidence, credentials, and machine-local files;
- publication provenance is claimed only when the registry exposes it;
- the release notes do not imply that B000 proved product superiority or that B001-B015 were executed.
