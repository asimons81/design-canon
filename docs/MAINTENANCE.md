# Repository Maintenance

This runbook keeps short-lived work branches from becoming permanent attic boxes.

## Branch policy

- `main` is the only permanent development branch.
- Release history is preserved with immutable tags, not long-lived release branches.
- A same-repository topic branch should be deleted after its pull request is squash-merged.
- Never delete a branch with an open pull request.
- Never move, reuse, or replace a release tag.
- Preserve an unmerged branch when it contains work that is not reachable from `main`.

Enable GitHub's **Automatically delete head branches** repository setting so future merged pull requests clean up their source branches.

## Audit merged branches

The following command lists same-repository branches attached to merged pull requests. It is a dry-run inventory only:

```bash
gh pr list \
  --repo asimons81/design-canon \
  --state merged \
  --limit 200 \
  --json headRefName,isCrossRepository,mergedAt,url \
  --jq '.[] | select(.isCrossRepository == false) | [.headRefName, .mergedAt, .url] | @tsv'
```

Before deleting a branch, verify all three conditions:

1. its pull request is merged;
2. it has no open pull request;
3. it contains no commits that must remain outside `main`.

Inspect one branch:

```bash
BRANCH='release/0.1.0-alpha.1'

gh pr list \
  --repo asimons81/design-canon \
  --state open \
  --head "$BRANCH"

git fetch origin main "$BRANCH"
git log --oneline "origin/main..origin/$BRANCH"
```

An empty final command means the branch has no commit that is absent from `main`.

## Delete a verified merged branch

Delete branches one at a time so mistakes remain obvious:

```bash
git push origin --delete "$BRANCH"
```

Then prune local remote-tracking references:

```bash
git fetch --prune origin
```

Do not use a bulk deletion command without reviewing its dry-run output. Branch names can contain `/`, and release tags can resemble branches in casual output.

## Post-cleanup verification

```bash
git ls-remote --heads origin
git ls-remote --tags origin
```

Confirm:

- `refs/heads/main` remains;
- required active branches remain;
- merged topic branches are gone;
- release tags remain unchanged;
- no tag was recreated as a branch.

## Pull-request hygiene

Before merging:

- keep the change focused;
- update user-facing documentation and `CHANGELOG.md` when behavior changes;
- resolve or explicitly supersede blocking review threads;
- require all repository, package, browser, dependency, and security checks;
- squash-merge with the expected head SHA;
- delete the merged head branch;
- verify `main` after merge.

## Release hygiene

A release branch is not a release. A tag is not an npm publication. Follow [`RELEASE_STATUS.md`](RELEASE_STATUS.md) and [`RELEASING.md`](RELEASING.md) before describing a version as released.
