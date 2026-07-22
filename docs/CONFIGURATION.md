# Configuration and Suppressions

Design Canon automatically looks for `design-canon.config.json` in the current working directory when running `lint`. Use `--config <path>` to load a different file explicitly.

## Command context

Until a public npm version is independently verified, run commands from a source checkout:

```bash
node ./bin/design-canon.js lint . --profile product-app
```

After a package version is published and verified, an installed `design-canon` binary or an exact-version `npx design-canon@<version>` invocation can provide the same CLI. See [`RELEASE_STATUS.md`](RELEASE_STATUS.md) before presenting npm commands to users.

## Minimal configuration

```json
{
  "$schema": "./schema/config.schema.json",
  "version": 1,
  "profile": "marketing",
  "suppressions": []
}
```

The command-line `--profile` option overrides the profile in configuration. If neither is present, the linter uses `product-app`.

## Analysis modes

Analysis mode is selected on the command line, not stored in the version-1 configuration schema:

```bash
node ./bin/design-canon.js lint . \
  --config design-canon.config.json \
  --mode static
```

Supported modes:

- `static`: source analysis only. This is the default and requires no browser dependency.
- `auto`: run browser-assisted analyzers when optional Playwright and Chromium are available; otherwise preserve static results and report browser analysis as skipped.
- `browser`: require browser-assisted analysis. The command fails when the browser capability is unavailable.

Browser-assisted analysis is limited to local HTML and scan-root-contained assets. It is mechanical rendered analysis, not the planned subjective visual judge.

## Justified suppressions

Suppressions are explicit policy exceptions. They do not delete evidence. Matching findings move from `findings` to `suppressedFindings` in JSON output and include the reason, scope, approver, and expiration metadata.

```json
{
  "$schema": "./schema/config.schema.json",
  "version": 1,
  "profile": "marketing",
  "suppressions": [
    {
      "rule": "color.purple-gradient-default",
      "files": ["src/brand/**/*.css"],
      "reason": "Purple is the documented primary brand color for this campaign.",
      "approvedBy": "design-systems",
      "expires": "2099-12-31"
    }
  ]
}
```

Every suppression must:

- reference a rule that exists in the active catalog;
- include one or more project-relative file globs;
- contain at least 12 characters of written rationale;
- remain inside the project root;
- use an expiration date later than the current date when `expires` is present.

`approvedBy` and `expires` are optional, but both are recommended for team repositories.

## Glob behavior

Design Canon supports a deliberately small glob language:

- `*` matches any characters except `/`;
- `**` matches across directories;
- `?` matches one character except `/`;
- backslashes are normalized to forward slashes.

Patterns are matched against paths relative to the current working directory.

## Failure behavior

Configuration fails closed. Linting stops with exit code `2` when the configuration contains:

- unknown properties;
- unsafe profile names;
- unknown rule IDs;
- absolute or parent-traversing file patterns;
- missing or weak rationale;
- malformed dates;
- expired suppressions;
- duplicate suppressions for the same rule and file scope.

Unsuppressed error findings produce exit code `1`. A clean or fully justified scan produces exit code `0`.

Browser capability failure in required `browser` mode is a runtime capability error rather than a suppressible design finding.

## Unused suppressions

Unused suppressions remain visible in text and JSON reports. They do not currently fail the command, but they should be reviewed and removed because stale exceptions weaken policy clarity.

## CI example from source

```bash
node ./bin/design-canon.js lint . \
  --config design-canon.config.json \
  --format json > design-canon-report.json
```

Keep the report as a CI artifact when design-policy evidence matters to review or release approval. Do not commit reports containing private source paths or other sensitive project information.
