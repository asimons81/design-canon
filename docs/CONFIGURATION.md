# Configuration and Suppressions

Design Canon automatically looks for `design-canon.config.json` in the current working directory when running `lint`. Use `--config <path>` to load a different file explicitly.

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

- reference a rule that exists in the active catalog
- include one or more project-relative file globs
- contain at least 12 characters of written rationale
- remain inside the project root
- use an expiration date later than the current date when `expires` is present

`approvedBy` and `expires` are optional, but both are recommended for team repositories.

## Glob behavior

Design Canon supports a deliberately small glob language:

- `*` matches any characters except `/`
- `**` matches across directories
- `?` matches one character except `/`
- backslashes are normalized to forward slashes

Patterns are matched against paths relative to the current working directory.

## Failure behavior

Configuration fails closed. Linting stops with exit code `2` when the configuration contains:

- unknown properties
- unsafe profile names
- unknown rule IDs
- absolute or parent-traversing file patterns
- missing or weak rationale
- malformed dates
- expired suppressions
- duplicate suppressions for the same rule and file scope

Unsuppressed error findings produce exit code `1`. A clean or fully justified scan produces exit code `0`.

## Unused suppressions

Unused suppressions remain visible in text and JSON reports. They do not currently fail the command, but they should be reviewed and removed because stale exceptions weaken policy clarity.

## CI example

```bash
npx design-canon lint . \
  --config design-canon.config.json \
  --format json > design-canon-report.json
```

Keep the report as a CI artifact when design-policy evidence matters to review or release approval.
