# Design Canon Cross-Platform Verification Matrix

> **Status:** Maintainer-reviewed QA plan. Test cases are specifications until an execution record is attached.
> **Scope:** Source checkout, packed installation, and local runtime behavior.
> **Non-goal:** This document does not certify a platform by itself.

## Conventions

Use a fresh temporary directory for every case.

### POSIX variables

```bash
export DC_REPO="$HOME/projects/design-canon"
export DC_REF="<full-commit-sha>"
export DC_TMP="$(mktemp -d)"
export DC_VERSION="$(node -p "require('$DC_REPO/package.json').version")"
export DC_CLI="$DC_REPO/bin/design-canon.js"
```

### PowerShell variables

```powershell
$DcRepo = 'C:\projects\design-canon'
$DcRef = '<full-commit-sha>'
$DcTmp = Join-Path $env:TEMP ('design-canon-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $DcTmp | Out-Null
$DcVersion = node -p "require('$($DcRepo.Replace('\','/'))/package.json').version"
$DcCli = Join-Path $DcRepo 'bin\design-canon.js'
```

Rules:

- Never hard-code a maintainer's home path.
- Never hard-code the package version into a tarball filename.
- GitHub installation tests must use a full commit SHA, not a mutable branch.
- Commands expected to find lint errors return exit code `1`.
- Invalid usage or configuration returns exit code `2`.
- Capture stdout, stderr, exact exit code, OS, architecture, Node version, npm version, and the tested commit.
- Clean up even after failure.

## Shared fixtures

### Mechanical violation

```html
<style>
  button { outline: none; transition: all 300ms; }
</style>
<button>Continue</button>
```

Expected with profile `marketing`:

- `a11y.visible-focus`: error
- `motion.transition-all`: warning
- process exit code `1`

### Clean source

```html
<button>Continue</button>
```

Expected exit code `0`.

## Matrix overview

| Area | Cases |
|---|---:|
| Platform and shell | 5 |
| Node.js versions | 3 |
| Installation | 3 |
| Runtime edge cases | 14 |
| **Total** | **25** |

# 1. Platform and shell

## QA-ENV-WINCMD-01: Windows CMD

**Environment:** Windows 10 or 11, Node 22, `cmd.exe`.

```bat
node "%DC_REPO%\bin\design-canon.js" --version
node "%DC_REPO%\bin\design-canon.js" profiles
node "%DC_REPO%\bin\design-canon.js" compile --profile marketing --target design --output "%TEMP%\dc-design.md"
node "%DC_REPO%\bin\design-canon.js" lint "%DC_REPO%\examples\sloppy" --profile marketing --format json
```

Expected codes: `0`, `0`, `0`, `1`. Verify the printed version equals `package.json`, all three profiles are listed, and the output file exists.

## QA-ENV-WINPS-01: Windows PowerShell

```powershell
node $DcCli --version
node $DcCli profiles
node $DcCli compile --profile product-app --target agents | Out-File (Join-Path $DcTmp 'agents.md') -Encoding utf8
node $DcCli lint (Join-Path $DcRepo 'examples\sloppy') --profile marketing --format json
```

Expected codes: `0`, `0`, `0`, `1`. Use `Start-Transcript` for evidence.

## QA-ENV-WSL-01: WSL2 Ubuntu

Clone into the Linux filesystem rather than `/mnt/c`.

```bash
node "$DC_CLI" --version
node "$DC_CLI" profiles
node "$DC_CLI" compile --profile editorial --target skill --output "$DC_TMP/editorial-skill.md"
node "$DC_CLI" lint "$DC_REPO/examples/sloppy" --profile marketing --format json
```

Expected codes: `0`, `0`, `0`, `1`.

## QA-ENV-UBUNTU-01: Native Ubuntu

```bash
node "$DC_CLI" --version
npm --prefix "$DC_REPO" test
for profile in marketing editorial product-app; do
  node "$DC_CLI" compile --profile "$profile" --target design > "$DC_TMP/$profile.md"
done
node "$DC_CLI" lint "$DC_REPO/examples/sloppy" --profile marketing --format json
```

Expected codes: version `0`, tests `0`, every compile `0`, lint `1`.

## QA-ENV-MACOS-01: macOS

Run the Ubuntu command set on both available architectures when practical. Record `sw_vers`, `uname -m`, and the Node installation source. Do not assume Homebrew lives at a fixed path; resolve Node with `command -v node`.

# 2. Node.js versions

Run the same test under Node 20, 22, and 24 using the CI runner or a version manager.

## QA-NODE-20-01

```bash
node --version
npm --prefix "$DC_REPO" ci --ignore-scripts
npm --prefix "$DC_REPO" test
node "$DC_CLI" compile --profile marketing --target design > /dev/null
node "$DC_CLI" lint "$DC_REPO/examples/sloppy" --profile marketing --format json
```

Expected: Node major 20; install, tests, and compile `0`; lint `1`.

## QA-NODE-22-01

Same procedure. Expected Node major 22.

## QA-NODE-24-01

Same procedure. Expected Node major 24.

# 3. Installation

## QA-INSTALL-TARBALL-01: Packed installation

```bash
mkdir -p "$DC_TMP/package" "$DC_TMP/app"
PACK_JSON="$(npm --prefix "$DC_REPO" pack --pack-destination "$DC_TMP/package" --json)"
PACK_FILE="$(node -e "const x=JSON.parse(process.argv[1]);process.stdout.write(x[0].filename)" "$PACK_JSON")"
cd "$DC_TMP/app"
npm init -y >/dev/null
npm install "$DC_TMP/package/$PACK_FILE"
npx --no-install design-canon --version
npx --no-install design-canon profiles
npx --no-install design-canon compile --profile marketing --target design --output "$DC_TMP/compiled.md"
```

All commands return `0`. Verify the version equals the source package version and inspect the tarball file list.

## QA-INSTALL-GITHUB-01: Pinned GitHub installation

```bash
cd "$DC_TMP"
npm init -y >/dev/null
npm install "github:asimons81/design-canon#$DC_REF"
npx --no-install design-canon --version
npx --no-install design-canon profiles
```

All commands return `0`. Record the installed package's `_resolved` or lockfile source and verify it contains the selected commit.

## QA-INSTALL-SPACES-01: Paths containing spaces

Create the temporary project under a directory such as `design canon test/project with spaces`. Install the packed tarball and invoke:

```bash
npx --no-install design-canon compile --profile marketing --target design --output "compile output.md"
npx --no-install design-canon lint "source files" --profile marketing
```

Compile returns `0`; lint returns `1` for the shared violation fixture. Verify quoted paths are preserved.

# 4. Runtime edge cases

## QA-RUNTIME-READONLY-01: Read-only input

Create a readable source directory without write permission, then lint it while writing reports elsewhere.

```bash
chmod -R a-w "$DC_TMP/input"
node "$DC_CLI" lint "$DC_TMP/input" --profile marketing --format json > "$DC_TMP/report.json"
```

Expected code `1` for the violation fixture. The input directory remains unchanged. Restore permissions before cleanup.

## QA-RUNTIME-MALFORMED-SOURCE-01: Malformed source text

Create syntactically invalid `.html` and `.js` files. The current linter scans text heuristically and must not parse or execute them.

Expected code is deterministically set by the fixture content: use clean malformed text for code `0`, then add `outline: none` for code `1`. Neither run may produce exit code `2` or an uncaught stack trace.

## QA-RUNTIME-MALFORMED-CONFIG-01

Test independently:

1. truncated JSON,
2. JSON primitive instead of object,
3. unsupported `version`,
4. unknown top-level property.

Invoke with `--config <path>`. Every case returns `2`, writes a concise message to stderr, and prints no stack trace.

## QA-RUNTIME-INVALID-PROFILE-01

```bash
node "$DC_CLI" compile --profile '../etc/passwd' --target design
node "$DC_CLI" compile --profile '/absolute/path' --target design
node "$DC_CLI" compile --profile '' --target design
node "$DC_CLI" compile --profile 'Marketing' --target design
node "$DC_CLI" compile --profile 'marketing--extra' --target design
node "$DC_CLI" compile --profile 'does-not-exist' --target design
```

Every command returns `2`. Unsafe names report invalid profile syntax; the final safe-but-missing name reports an unknown profile. No external file is read.

## QA-RUNTIME-UNKNOWN-RULE-01

Create suppressions referencing a nonexistent rule and a misspelled rule. Each returns `2` with the unknown rule ID. A very long but syntactically valid ID may also resolve as unknown; do not expect a length-validation error unless such a limit is added explicitly.

## QA-RUNTIME-EXPIRED-01

Create three configs:

- yesterday's UTC date,
- today's UTC date,
- malformed date `01-01-2099`.

Yesterday and today return `2` as expired. The malformed date returns `2` for format validation. Generate dates at runtime rather than embedding a date that will go stale.

## QA-RUNTIME-OVERSIZE-01

Create a source file larger than `MAX_SOURCE_FILE_BYTES` and a small violation fixture in the same directory.

Expected JSON:

- oversized file appears in `skipped`,
- `filesDiscovered` is `2`,
- `filesScanned` is `1`,
- process code is `1` because the small fixture contains an error.

Linting only the oversized file returns `0`, scans zero files, and reports the skip.

## QA-RUNTIME-SYMLINK-01

Create:

- one regular violation fixture,
- a symlink to it,
- a symlink outside the test tree,
- a symlinked directory.

Lint the containing directory. Only the regular file is discovered. Expected code `1`; no outside target content appears in evidence.

## QA-RUNTIME-SIGINT-01

Create enough files for the scan to remain active, start lint in the background, send SIGINT, and wait for it.

On POSIX shells, a process terminated by SIGINT normally yields status `130`. Accept platform-specific signal reporting only when the process is clearly interrupted. The process must terminate promptly, leave no child process, and emit no uncaught exception. Partial JSON is permitted because interruption is not an atomic-report guarantee.

## QA-RUNTIME-EMPTY-01

Lint:

- an empty directory,
- a directory containing only ignored directories,
- a directory containing only unsupported extensions.

Every run returns `0` with zero discovered/scanned supported files and no findings.

## QA-RUNTIME-UNSUPPORTED-01

Mix unsupported binary/document extensions with one supported violation fixture. Only the supported file is discovered. Expected code `1`; unsupported files are ignored without read errors.

## QA-RUNTIME-MONOREPO-01

Create nested packages with supported source files and nested `node_modules`, `dist`, and `.git` directories. Lint from the monorepo root and then one package.

Expected:

- ignored directories are never traversed,
- root scan discovers supported files from all packages,
- package scan stays within that package,
- violation runs return `1`.

## QA-RUNTIME-NESTED-CONFIG-01

Create:

```text
project/
└── subdir/
    ├── design-canon.config.json
    └── index.html
```

The config suppresses `a11y.visible-focus` for `**/*.html` with a valid rationale.

Verify:

1. from `subdir`, implicit config discovery returns `0` and one suppressed finding;
2. from project root, `--config subdir/design-canon.config.json` while linting `subdir` returns `0`;
3. without the config, lint returns `1`.

## QA-RUNTIME-REINSTALL-01

Use the packed tarball, not a developer's source path:

1. install tarball in a fresh project,
2. run version and profiles,
3. uninstall,
4. confirm package and executable shim are gone,
5. reinstall the same tarball,
6. rerun version and profiles,
7. uninstall and clean.

All lifecycle commands return `0`. The explicit absence check after uninstall is expected to fail and must be asserted separately rather than hidden inside a compound command.

# Evidence record

For each execution create `qa/results/<test-id>/<timestamp>/` containing:

```text
metadata.json
command.txt
stdout.log
stderr.log
exit-code.txt
filesystem-before.txt
filesystem-after.txt
notes.md
```

`metadata.json` includes the test ID, tested commit, package version, OS, architecture, shell, Node version, npm version, start time, and completion status.

A platform may be marked verified only when its required cases have attached evidence from the tested commit. A green CI run does not certify manual Windows, WSL, macOS, permission, or signal cases unless those environments were actually exercised.
