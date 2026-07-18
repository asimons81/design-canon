# Design Canon — Cross-Platform Verification Matrix

> **Status:** Proposal / Generated fixture  
> **Generated:** 2026-07-18  
> **Project:** [design-canon](https://github.com/asimons81/design-canon) v0.1.0-alpha.0  
> **Branch:** `qa/platform-matrix`  
> **Purpose:** Define every test case, environment, command, expected result, cleanup step, and failure evidence required to certify Design Canon across all target platforms and runtime scenarios.

---

## Table of Contents

1. [Matrix Overview](#matrix-overview)
2. [Platform / Environment Tests](#1-platform--environment-tests)
3. [Node.js Version Tests](#2-nodejs-version-tests)
4. [Installation Scenarios](#3-installation-scenarios)
5. [Runtime Scenarios](#4-runtime-scenarios)
6. [Test Fixture Setup](#test-fixture-setup)
7. [Failure Evidence Capture Protocol](#failure-evidence-capture-protocol)

---

## Matrix Overview

| Section | Test Count | IDs |
|---|---|---|
| Platform / Environment | 5 | QA-ENV-\* |
| Node.js Version | 3 | QA-NODE-\* |
| Installation Scenarios | 3 | QA-INSTALL-\* |
| Runtime Scenarios | 14 | QA-RUNTIME-\* |
| **Total** | **25** | — |

---

### Common Prerequisites (all tests)

- Node.js >=20 installed and on `$PATH`
- Git (for clone-based installation tests only)
- The Design Canon repository checked out at a known path
- No `design-canon.config.json` in the project root (unless the test creates one)

---

## 1. Platform / Environment Tests

### QA-ENV-WINCMD-01 — Windows native (CMD)

| Field | Value |
|---|---|
| **Test ID** | `QA-ENV-WINCMD-01` |
| **Environment** | Windows 10/11, Node.js LTS (22.x), `cmd.exe` shell |
| **Prerequisites** | Node.js 22.x installed, repository cloned to `C:\projects\design-canon`, `node.exe` on `PATH` |
| **Exact commands** | |
| 1. Version smoke | `node "C:\projects\design-canon\bin\design-canon.js" --version` |
| 2. Profile list | `node "C:\projects\design-canon\bin\design-canon.js" profiles` |
| 3. Compile (stdout) | `node "C:\projects\design-canon\bin\design-canon.js" compile --profile marketing --target design` |
| 4. Compile (output file) | `node "C:\projects\design-canon\bin\design-canon.js" compile --profile marketing --target design --output DESIGN.md` |
| 5. Lint fixture | `cd /d "C:\projects\design-canon" && node bin\design-canon.js lint .\examples\sloppy --profile marketing --format json` |
| 6. Run tests | `cd /d "C:\projects\design-canon" && npm test` |
| **Expected result** | |
| Step 1 | Prints `0.1.0-alpha.0` |
| Step 2 | Prints `editorial\nmarketing\nproduct-app` |
| Step 3 | Prints compiled DESIGN.md content to stdout (no errors) |
| Step 4 | Writes `DESIGN.md` to cwd; prints "Compiled … into DESIGN.md" |
| Step 5 | JSON report with `"errors": ≥1`, `"filesDiscovered": ≥1`; exit code 1 |
| Step 6 | All tests pass (TAP output, exit code 0) |
| **Expected exit code** | Step 2: 0; Step 3: 0; Step 4: 0; Step 5: 1; Step 6: 0 |
| **Files expected to change** | Step 4: creates `DESIGN.md` (if not already present). All others: none |
| **Cleanup procedure** | Delete `DESIGN.md` created in step 4 |
| **Failure evidence to capture** | Full terminal transcript; `node --version` output; `echo %PATH%`; screenshot of cmd window showing the error; stderr redirection to file |

---

### QA-ENV-WINPS-01 — Windows native (PowerShell)

| Field | Value |
|---|---|
| **Test ID** | `QA-ENV-WINPS-01` |
| **Environment** | Windows 10/11, Node.js LTS (22.x), PowerShell 5.1+ or PowerShell 7 |
| **Prerequisites** | Node.js 22.x installed, repository cloned to `C:\projects\design-canon`, `node.exe` on `$env:PATH` |
| **Exact commands** | |
| 1. Version smoke | `node "C:\projects\design-canon\bin\design-canon.js" --version` |
| 2. Profile list | `node "C:\projects\design-canon\bin\design-canon.js" profiles` |
| 3. Compile (stdout) | `node "C:\projects\design-canon\bin\design-canon.js" compile --profile product-app --target agents` |
| 4. Lint fixture | `Set-Location "C:\projects\design-canon"; node bin\design-canon.js lint .\examples\sloppy --profile marketing --format json` |
| 5. Lint with explicit config | `node "C:\projects\design-canon\bin\design-canon.js" lint . --config "C:\projects\design-canon\examples\config\design-canon.config.json" --format json` |
| 6. Run tests | `Set-Location "C:\projects\design-canon"; npm test` |
| **Expected result** | |
| Step 1 | Prints `0.1.0-alpha.0` |
| Step 2 | Prints `editorial\nmarketing\nproduct-app` |
| Step 3 | Prints compiled agents instructions to stdout |
| Step 4 | JSON report with `"errors": ≥1`; exit code 1 |
| Step 5 | JSON report; exit code depends on path matching (suppression may or may not apply) |
| Step 6 | All tests pass (exit code 0) |
| **Expected exit code** | Step 1: 0; Step 2: 0; Step 3: 0; Step 4: 1; Step 5: 0 or 1 (config-dependent); Step 6: 0 |
| **Files expected to change** | None |
| **Cleanup procedure** | N/A |
| **Failure evidence to capture** | Full PowerShell transcript via `Start-Transcript`; `$PSVersionTable` output; `Get-Command node | Format-List`; `$env:PATH`; screenshot of PowerShell window; error stream piped to file |

---

### QA-ENV-WSL-01 — WSL (Ubuntu on Windows)

| Field | Value |
|---|---|
| **Test ID** | `QA-ENV-WSL-01` |
| **Environment** | Windows 10/11 with WSL2, Ubuntu 22.04/24.04 LTS, Node.js LTS (22.x) on WSL filesystem |
| **Prerequisites** | WSL2 installed, Ubuntu distro set up, Node.js 22.x installed via `nvm` or `nvm`-equivalent, repository cloned into WSL filesystem (e.g., `~/projects/design-canon` — **not** `/mnt/c/` to avoid performance and permissions issues) |
| **Exact commands** | |
| 1. Version smoke | `node ./bin/design-canon.js --version` |
| 2. Profile list | `node ./bin/design-canon.js profiles` |
| 3. Compile (skill) | `node ./bin/design-canon.js compile --profile editorial --target skill --output /tmp/editorial-skill.md` |
| 4. Lint fixture | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing --format json` |
| 5. Lint from another directory | `cd /tmp && node ~/projects/design-canon/bin/design-canon.js lint ~/projects/design-canon/examples/sloppy --profile marketing` |
| 6. Run tests | `npm test` |
| **Expected result** | |
| Step 1 | Prints `0.1.0-alpha.0` |
| Step 2 | Prints `editorial\nmarketing\nproduct-app` |
| Step 3 | Writes `/tmp/editorial-skill.md` with YAML frontmatter |
| Step 4 | JSON report with `"errors": ≥1` |
| Step 5 | Text-format lint violations output |
| Step 6 | All tests pass |
| **Expected exit code** | Step 1: 0; Step 2: 0; Step 3: 0; Step 4: 1; Step 5: 1; Step 6: 0 |
| **Files expected to change** | Step 3: creates `/tmp/editorial-skill.md`. All others: none |
| **Cleanup procedure** | Run `rm -f /tmp/editorial-skill.md` |
| **Failure evidence to capture** | Full terminal output; `uname -a`; `node --version`; `lsb_release -a`; `wsl.exe --status` (from Windows side); PowerShell script that runs `bash -c` and captures stderr; screenshot of WSL terminal |

---

### QA-ENV-UBU-01 — Ubuntu (Linux native)

| Field | Value |
|---|---|
| **Test ID** | `QA-ENV-UBU-01` |
| **Environment** | Ubuntu 22.04 or 24.04 LTS (or any Linux distro with glibc), Node.js LTS (22.x), bash or zsh |
| **Prerequisites** | Node.js 22.x installed, repository cloned to `~/projects/design-canon` |
| **Exact commands** | |
| 1. Version smoke | `node ./bin/design-canon.js --version` |
| 2. Profile list | `node ./bin/design-canon.js profiles` |
| 3. Compile + write | `node ./bin/design-canon.js compile --profile marketing --target design --output /tmp/design-canon-compile.md` |
| 4. Lint sloppy fixture | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing` |
| 5. Lint with JSON format | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing --format json` |
| 6. Smoke test all profiles compile | `for p in marketing editorial product-app; do node ./bin/design-canon.js compile --profile "$p" --target design > /dev/null; echo "$p OK"; done` |
| 7. Run full test suite | `npm test` |
| **Expected result** | |
| Step 1 | Prints `0.1.0-alpha.0` |
| Step 2 | Prints `editorial\nmarketing\nproduct-app` |
| Step 3 | Writes `/tmp/design-canon-compile.md`; prints "Compiled …" |
| Step 4 | Text-format violations; summary line with error/warning/info counts |
| Step 5 | Valid JSON report (parseable with `jq`) |
| Step 6 | Three "OK" lines printed |
| Step 7 | All tests pass |
| **Expected exit code** | Steps 1,2,3,6,7: 0; Steps 4,5: 1 |
| **Files expected to change** | Step 3: creates `/tmp/design-canon-compile.md`. All others: none |
| **Cleanup procedure** | `rm -f /tmp/design-canon-compile.md` |
| **Failure evidence to capture** | Terminal scrollback capture; `node --version`; `cat /etc/os-release`; `uname -m`; `npm --version`; redirect stderr to `stderr-ubu.log` for each failing command |

---

### QA-ENV-MAC-01 — macOS (when available)

| Field | Value |
|---|---|
| **Test ID** | `QA-ENV-MAC-01` |
| **Environment** | macOS 14+ (Sonoma/Sequoia), Apple Silicon (arm64) or Intel (x64), Node.js LTS (22.x), zsh (default shell) |
| **Prerequisites** | Node.js 22.x installed via `brew` or `nvm`, repository cloned to `~/projects/design-canon` |
| **Exact commands** | |
| 1. Version smoke | `node ./bin/design-canon.js --version` |
| 2. Profile list | `node ./bin/design-canon.js profiles` |
| 3. Compile all targets | `node ./bin/design-canon.js compile --profile marketing --target design --output /tmp/dc-design.md && node ./bin/design-canon.js compile --profile marketing --target skill --output /tmp/dc-skill.md && node ./bin/design-canon.js compile --profile marketing --target agents --output /tmp/dc-agents.md` |
| 4. Lint fixture | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing --format json` |
| 5. Homebrew Node path test | `/opt/homebrew/bin/node ./bin/design-canon.js --version` (Apple Silicon) or `/usr/local/bin/node ./bin/design-canon.js --version` (Intel) |
| 6. Run tests | `npm test` |
| **Expected result** | |
| Step 1 | Prints `0.1.0-alpha.0` |
| Step 2 | Prints `editorial\nmarketing\nproduct-app` |
| Step 3 | Creates three files; each prints "Compiled …" |
| Step 4 | Valid JSON with errors ≥ 1 |
| Step 5 | Prints `0.1.0-alpha.0` |
| Step 6 | All tests pass |
| **Expected exit code** | Steps 1,2,3,5,6: 0; Step 4: 1 |
| **Files expected to change** | Step 3: creates `/tmp/dc-design.md`, `/tmp/dc-skill.md`, `/tmp/dc-agents.md`. All others: none |
| **Cleanup procedure** | `rm -f /tmp/dc-design.md /tmp/dc-skill.md /tmp/dc-agents.md` |
| **Failure evidence to capture** | `sw_vers`; `uname -m`; `node --version`; `which node`; `npm --version`; screenshot of terminal; `sysctl -n hw.logicalcpu`; `csrutil status` (if SIP-related failures) |

---

## 2. Node.js Version Tests

> **Note:** These tests should be run on **Ubuntu** or **macOS** CI runners where `nvm` or `nvm`-like version switching is available. The same command set is repeated for each Node.js major version.

### QA-NODE-20-01 — Node.js 20

| Field | Value |
|---|---|
| **Test ID** | `QA-NODE-20-01` |
| **Environment** | Ubuntu 22.04, Node.js 20.x (`>=20.0.0`, latest 20.x), bash |
| **Prerequisites** | Node.js 20.x active (`nvm use 20`), repository at `~/projects/design-canon`, `npm ci --ignore-scripts` run once |
| **Exact commands** | |
| 1. Version check | `node --version && node ./bin/design-canon.js --version` |
| 2. Run full test suite | `npm test` |
| 3. Compile | `node ./bin/design-canon.js compile --profile marketing --target design > /dev/null` |
| 4. Lint fixture | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing --format json` |
| **Expected result** | |
| Step 1 | `node --version` starts with `v20`; second line is `0.1.0-alpha.0` |
| Step 2 | All tests pass |
| Step 3 | No errors; compiled output printed to stdout |
| Step 4 | Valid JSON, `"errors": ≥1`, exit code 1 |
| **Expected exit code** | Steps 1,2,3: 0; Step 4: 1 |
| **Files expected to change** | None |
| **Cleanup procedure** | N/A |
| **Failure evidence to capture** | Full `npm test` output; capture both stdout and stderr for each command; `nvm ls` output; `node -e "process.versions"` JSON dump |

---

### QA-NODE-22-01 — Node.js 22

| Field | Value |
|---|---|
| **Test ID** | `QA-NODE-22-01` |
| **Environment** | Ubuntu 22.04, Node.js 22.x (latest 22.x), bash |
| **Prerequisites** | Node.js 22.x active (`nvm use 22`), repository at `~/projects/design-canon`, `npm ci --ignore-scripts` run once |
| **Exact commands** | |
| 1. Version check | `node --version && node ./bin/design-canon.js --version` |
| 2. Run full test suite | `npm test` |
| 3. Profile list | `node ./bin/design-canon.js profiles` |
| 4. Lint fixture (text format) | `node ./bin/design-canon.js lint ./examples/sloppy --profile marketing` |
| **Expected result** | |
| Step 1 | `v22.x.x` then `0.1.0-alpha.0` |
| Step 2 | All tests pass |
| Step 3 | Three profile names |
| Step 4 | Text-format violations printed |
| **Expected exit code** | Steps 1,2,3: 0; Step 4: 1 |
| **Files expected to change** | None |
| **Cleanup procedure** | N/A |
| **Failure evidence to capture** | Full test output; `nvm ls`; `node -p "process.versions"` |

---

### QA-NODE-24-01 — Node.js 24

| Field | Value |
|---|---|
| **Test ID** | `QA-NODE-24-01` |
| **Environment** | Ubuntu 22.04, Node.js 24.x (latest 24.x), bash |
| **Prerequisites** | Node.js 24.x active (`nvm use 24`), repository at `~/projects/design-canon`, `npm ci --ignore-scripts` run once |
| **Exact commands** | |
| 1. Version check | `node --version && node ./bin/design-canon.js --version` |
| 2. Run full test suite | `npm test` |
| 3. Lint fixture with config suppression | `node ./bin/design-canon.js lint . --config ./examples/config/design-canon.config.json --format json` |
| 4. Compile all profiles | `for p in marketing editorial product-app; do node ./bin/design-canon.js compile --profile "$p" --target design --output "/tmp/dc-$p.md" || echo "FAIL $p"; done` |
| **Expected result** | |
| Step 1 | `v24.x.x` then `0.1.0-alpha.0` |
| Step 2 | All tests pass |
| Step 3 | Valid JSON report |
| Step 4 | Three output files created; no "FAIL" lines |
| **Expected exit code** | Steps 1,2,4: 0; Step 3: varies (config may or may not match actually existing files) |
| **Files expected to change** | Step 4: creates `/tmp/dc-marketing.md`, `/tmp/dc-editorial.md`, `/tmp/dc-product-app.md` |
| **Cleanup procedure** | `rm -f /tmp/dc-*.md` |
| **Failure evidence to capture** | Full test output; `node -p "process.versions"`; `nvm ls`; test reporter output saved to file |

---

## 3. Installation Scenarios

### QA-INSTALL-TAR-01 — Installation from npm tarball (`npm pack` + npm install)

| Field | Value |
|---|---|
| **Test ID** | `QA-INSTALL-TAR-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository cloned at `~/projects/design-canon`, a clean temp directory for test installation |
| **Exact commands** | |
| 1. Pack tarball | `cd ~/projects/design-canon && npm pack --pack-destination /tmp/dc-tarball-test/` |
| 2. Create clean install dir | `mkdir -p /tmp/dc-install-test && cd /tmp/dc-install-test && npm init -y` |
| 3. Install from tarball | `cd /tmp/dc-install-test && npm install /tmp/dc-tarball-test/design-canon-0.1.0-alpha.0.tgz` |
| 4. Verify CLI from node_modules | `cd /tmp/dc-install-test && node ./node_modules/.bin/design-canon --version` |
| 5. Verify compile | `cd /tmp/dc-install-test && node ./node_modules/.bin/design-canon compile --profile marketing --target design --output /tmp/dc-tar-compile.md` |
| 6. Verify profiles list | `cd /tmp/dc-install-test && node ./node_modules/.bin/design-canon profiles` |
| 7. Verify lint against a target fixture | `mkdir -p /tmp/dc-install-test/test-fixture && echo '<style>button { outline: none; }</style>' > /tmp/dc-install-test/test-fixture/test.html && cd /tmp/dc-install-test && node ./node_modules/.bin/design-canon lint ./test-fixture --profile marketing` |
| 8. Cleanup and uninstall | `cd /tmp/dc-install-test && npm uninstall design-canon && cd / && rm -rf /tmp/dc-install-test /tmp/dc-tarball-test` |
| **Expected result** | |
| Step 1 | Creates `/tmp/dc-tarball-test/design-canon-0.1.0-alpha.0.tgz` |
| Step 2 | `package.json` created in `/tmp/dc-install-test` |
| Step 3 | Tarball extracts to `node_modules/design-canon/`; `package.json` updated |
| Step 4 | Prints `0.1.0-alpha.0` |
| Step 5 | Writes `/tmp/dc-tar-compile.md`; prints "Compiled …" |
| Step 6 | Prints `editorial\nmarketing\nproduct-app` |
| Step 7 | Reports violations for the test fixture |
| Step 8 | No errors; directories removed |
| **Expected exit code** | Steps 1-6,8: 0; Step 7: 1 |
| **Files expected to change** | Step 1: creates `.tgz`; Steps 2-3: creates `node_modules/`, `package.json`, `package-lock.json`; Step 5: creates `/tmp/dc-tar-compile.md`; Step 8: deletes everything |
| **Cleanup procedure** | Built into step 8 |
| **Failure evidence to capture** | `ls -la /tmp/dc-tarball-test/`; `npm pack` output (stderr); `cat /tmp/dc-install-test/package.json`; `ls -la /tmp/dc-install-test/node_modules/.bin/`; `which design-canon` (should NOT be on PATH globally); content of built tarball via `tar tzf` |

---

### QA-INSTALL-GIT-01 — Installation from GitHub (clone and `npm link`)

| Field | Value |
|---|---|
| **Test ID** | `QA-INSTALL-GIT-01` |
| **Environment** | Ubuntu 22.04 (or Windows Git Bash), Node.js 22.x, bash, git |
| **Prerequisites** | Git installed and configured, no prior `npm link` for `design-canon` |
| **Exact commands** | |
| 1. Clone into temp | `cd /tmp && git clone https://github.com/asimons81/design-canon.git dc-link-test && cd dc-link-test && npm ci --ignore-scripts` |
| 2. Create global link | `cd /tmp/dc-link-test && npm link` |
| 3. Create test project | `mkdir -p /tmp/dc-linked-usage && cd /tmp/dc-linked-usage && echo '<style>body { background: linear-gradient(135deg, #7c3aed, #6366f1); }</style>' > /tmp/dc-linked-usage/index.html` |
| 4. Link design-canon in test project | `cd /tmp/dc-linked-usage && npm link design-canon` |
| 5. Test compile | `cd /tmp/dc-linked-usage && npx design-canon compile --profile marketing --target design > /tmp/dc-link-compile.md 2>&1` |
| 6. Test lint | `cd /tmp/dc-linked-usage && npx design-canon lint . --profile product-app` |
| 7. Test linked binary | `design-canon --version` (relies on global npm link) |
| 8. List profiles | `design-canon profiles` |
| 9. Unlink and clean | `cd /tmp/dc-linked-usage && npm unlink design-canon && cd /tmp/dc-link-test && npm unlink && cd / && rm -rf /tmp/dc-link-test /tmp/dc-linked-usage` |
| **Expected result** | |
| Steps 1-4 | No errors; global and project links established |
| Step 5 | No errors; compiled output saved |
| Step 6 | Violations reported for purple gradient |
| Step 7 | Prints `0.1.0-alpha.0` |
| Step 8 | Prints three profiles |
| Step 9 | Clean removal; symlinks gone |
| **Expected exit code** | Steps 1-5,7-9: 0; Step 6: 1 |
| **Files expected to change** | Step 1: cloned repo; Step 2: global symlink; Step 3: test project; Step 4: project symlink; Step 5: compile output; Step 9: cleanup |
| **Cleanup procedure** | Step 9; additionally check `npm ls -g --depth=0` for stale design-canon references |
| **Failure evidence to capture** | `ls -la $(npm root -g)` (show symlink target); `ls -la node_modules/`; `npm ls` output; `npm ls -g` output; stderr from each command |

---

### QA-INSTALL-SPACE-01 — Installation in paths containing spaces

| Field | Value |
|---|---|
| **Test ID** | `QA-INSTALL-SPACE-01` |
| **Environment** | Windows 10/11 (Git Bash or CMD), Node.js 22.x |
| **Prerequisites** | Repository cloned, ability to create a directory with spaces |
| **Exact commands** | |
| 1. Create spacey dir | `mkdir -p "/c/temp/my project/test space" && cd "/c/temp/my project/test space" && npm init -y` |
| 2. Pack tarball | `cd /c/Users/asimo/projects/design-canon && npm pack --pack-destination "/c/temp/my project/test space/"` |
| 3. Install from tarball | `cd "/c/temp/my project/test space" && npm install "./design-canon-0.1.0-alpha.0.tgz"` |
| 4. Version check | `cd "/c/temp/my project/test space" && node "./node_modules/.bin/design-canon" --version` |
| 5. Compile | `cd "/c/temp/my project/test space" && node "./node_modules/.bin/design-canon" compile --profile marketing --target design --output "compile output.md"` |
| 6. Profiles | `cd "/c/temp/my project/test space" && node "./node_modules/.bin/design-canon" profiles` |
| 7. Lint with space in source path | `mkdir -p "/c/temp/my project/test space/src files" && echo '<style>button { outline: none; }</style>' > "/c/temp/my project/test space/src files/page.html" && cd "/c/temp/my project/test space" && node "./node_modules/.bin/design-canon" lint "./src files" --profile marketing` |
| **Expected result** | |
| Steps 1-3 | Install completes without ENOENT, EINVAL, or path parsing errors |
| Step 4 | Prints `0.1.0-alpha.0` |
| Step 5 | Creates "compile output.md" with compiled content |
| Step 6 | Three profile names |
| Step 7 | Violations reported |
| **Expected exit code** | Steps 1-6: 0; Step 7: 1 |
| **Files expected to change** | Steps 1-3: `node_modules/`, `package.json`; Step 5: creates `compile output.md`; Step 7: source fixture created |
| **Cleanup procedure** | `rm -rf "/c/temp/my project"` |
| **Failure evidence to capture** | Full `ls -la` of spacey directory; `node -e "console.log(process.cwd())"`; `cat package.json`; any `ENOENT` or `EINVAL` error messages; screenshot of command window showing quoted paths; `node -e "console.log(require('child_process').execSync('node --version').toString())"` |

---

## 4. Runtime Scenarios

### QA-RUNTIME-RDONLY-01 — Read-only directories (no write access to cwd)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-RDONLY-01` |
| **Environment** | Linux (Ubuntu 22.04), Node.js 22.x, bash |
| **Prerequisites** | A directory readable-only by the current user (`chmod 555`), a source file inside it |
| **Exact commands** | |
| 1. Create read-only fixture | `mkdir -p /tmp/dc-readonly-test/src && echo '<style>body { background: linear-gradient(135deg, #7c3aed, #6366f1); }</style><button style="outline:none">Click</button>' > /tmp/dc-readonly-test/src/index.html && chmod 555 /tmp/dc-readonly-test && chmod 444 /tmp/dc-readonly-test/src/index.html` |
| 2. Lint from read-only cwd | `cd /tmp/dc-readonly-test/src && node ~/projects/design-canon/bin/design-canon.js lint . --profile marketing` |
| 3. Compile to /tmp (writable) | `node ~/projects/design-canon/bin/design-canon.js compile --profile marketing --target design --output /tmp/dc-readonly-compile.md` |
| 4. Lint from read-only with --config (config in writable dir) | `cd /tmp/dc-readonly-test && node ~/projects/design-canon/bin/design-canon.js lint src --profile marketing --format json > /tmp/dc-readonly-report.json` |
| **Expected result** | |
| Step 1 | Directory and file created with restricted perms |
| Step 2 | Lint should read files and report violations *unless* the CLI needs to create files in cwd (it should not — it only reads) |
| Step 3 | Compile writes to /tmp successfully |
| Step 4 | JSON report written to /tmp |
| **Expected exit code** | Step 2: 1 (violations found); Step 3: 0; Step 4: exit code 1 written to report |
| **Files expected to change** | Step 1: fixture; Step 3: creates `/tmp/dc-readonly-compile.md`; Step 4: creates `/tmp/dc-readonly-report.json` |
| **Cleanup procedure** | `chmod -R 755 /tmp/dc-readonly-test && rm -rf /tmp/dc-readonly-test /tmp/dc-readonly-compile.md /tmp/dc-readonly-report.json` |
| **Failure evidence to capture** | `ls -la /tmp/dc-readonly-test/` (permissions); `ls -la /tmp/dc-readonly-test/src/`; error messages referencing `EACCES`, `EPERM`, `EROFS`; `id` output; `stat /tmp/dc-readonly-test` |

---

### QA-RUNTIME-MALJSON-01 — Malformed JSON in source files

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-MALJSON-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository cloned at `~/projects/design-canon`; a temporary directory with a `.json` source file containing invalid JSON (note: the linter only scans `SOURCE_EXTENSIONS` = `.css .html .js .jsx .mjs .cjs .ts .tsx .vue .svelte` — JSON is NOT scanned, so the test must use a scanned extension) |
| **Exact commands** | |
| 1. Create fixture with malformed content | `mkdir -p /tmp/dc-maljson && printf '<style>body { color: red; }</style>\n<script>const x = { broken: , };</script>' > /tmp/dc-maljson/index.html` |
| 2. Lint fixture | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-maljson --profile product-app` |
| 3. Create fixture with JSON-like broken content | `echo '{"unclosed": "object", "extra": ,}' > /tmp/dc-maljson/broken.js` |
| 4. Lint again | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-maljson --profile product-app` |
| **Expected result** | |
| Steps 1-2 | Lint should NOT crash on malformed data within scanned files (the linter applies regex detectors to raw text — it should not attempt to JSON-parse source files). Regex should tolerate malformed content gracefully. |
| Steps 3-4 | Same — the broken `{extra: ,}` may or may not match a detector pattern, but the linter must not crash with uncaught exception |
| **Expected exit code** | 0 or 1 (depends on whether detector patterns match the broken content — but MUST NOT be 2 or crash) |
| **Files expected to change** | None |
| **Cleanup procedure** | `rm -rf /tmp/dc-maljson` |
| **Failure evidence to capture** | Full stderr (must not contain "Error:" or "TypeError" or uncaught exception); if exit code is 2 or process crashes, capture the stack trace; `node --stack-trace-limit=50` setting |

---

### QA-RUNTIME-MALCFG-01 — Malformed configuration JSON

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-MALCFG-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Syntax error in config | `mkdir -p /tmp/dc-malcfg && printf '{\n"version": 1,\n"profile": "marketing",\n' > /tmp/dc-malcfg/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-malcfg --config /tmp/dc-malcfg/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 2. Non-object config | `printf 'true' > /tmp/dc-malcfg/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-malcfg/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 3. Non-JSON file | `echo "this is not json" > /tmp/dc-malcfg/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-malcfg/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 4. Unknown config version | `printf '{"version": 999}' > /tmp/dc-malcfg/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-malcfg/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 5. Config with unknown top-level key | `printf '{"version": 1, "unknownKey": true}' > /tmp/dc-malcfg/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-malcfg/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | Error: "Unable to read JSON file" or "Invalid JSON in" — exit code 2 |
| Step 2 | Error: "config must be an object" — exit code 2 |
| Step 3 | Error: "Invalid JSON in" — exit code 2 |
| Step 4 | Error: "config.version must be 1" — exit code 2 |
| Step 5 | Error: "contains unknown property 'unknownKey'" — exit code 2 |
| **Expected exit code** | All steps: 2 |
| **Files expected to change** | Config files written to `/tmp/dc-malcfg/` |
| **Cleanup procedure** | `rm -rf /tmp/dc-malcfg` |
| **Failure evidence to capture** | Exact error message; stderr vs stdout boundary; exit code verification. If the CLI prints a stack trace instead of a clean error, that is a FAILURE. |

---

### QA-RUNTIME-INVPROF-01 — Invalid profile names

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-INVPROF-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Path traversal | `node ~/projects/design-canon/bin/design-canon.js compile --profile '../etc/passwd' --target design 2>&1; echo "EXIT: $?"` |
| 2. Absolute path | `node ~/projects/design-canon/bin/design-canon.js lint . --profile '/etc/secrets' 2>&1; echo "EXIT: $?"` |
| 3. Empty string | `node ~/projects/design-canon/bin/design-canon.js compile --profile '' --target skill 2>&1; echo "EXIT: $?"` |
| 4. Capital letters | `node ~/projects/design-canon/bin/design-canon.js profiles --profile Marketing 2>&1; echo "EXIT: $?"` |
| 5. Double hyphen | `node ~/projects/design-canon/bin/design-canon.js compile --profile "marketing--extra" --target design 2>&1; echo "EXIT: $?"` |
| 6. Non-existent profile | `node ~/projects/design-canon/bin/design-canon.js compile --profile "does-not-exist" --target design 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Steps 1-5 | Error: "Invalid profile name" or "Unsafe profile name" — exit code 2 |
| Step 6 | Error: "Unknown profile 'does-not-exist'" — exit code 2 |
| **Expected exit code** | All steps: 2 |
| **Files expected to change** | None |
| **Cleanup procedure** | N/A |
| **Failure evidence to capture** | Exact error text; must NOT read or leak file contents from traversal paths; `stderr` vs `stdout` split |

---

### QA-RUNTIME-UNKRULE-01 — Unknown rule IDs in suppressions

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-UNKRULE-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Unknown rule | `mkdir -p /tmp/dc-unkrule && printf '{"version": 1, "suppressions": [{"rule": "a11y.nonexistent-rule", "files": ["src/**/*.css"], "reason": "This rule does not exist in the catalog at all."}]}' > /tmp/dc-unkrule/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-unkrule/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 2. Typo in rule ID | `printf '{"version": 1, "suppressions": [{"rule": "a11y.visible-focuss", "files": ["src/**/*.css"], "reason": "Typo in rule name."}]}' > /tmp/dc-unkrule/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-unkrule/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 3. Very long rule ID | `printf '{"version": 1, "suppressions": [{"rule": "a11y.'"$(python3 -c "print('x'*500)")"'", "files": ["src/**/*.css"], "reason": "Excessively long rule ID test."}]}' > /tmp/dc-unkrule/design-canon.config.json 2>/dev/null && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-unkrule/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | Error: "references unknown rule 'a11y.nonexistent-rule'" — exit code 2 |
| Step 2 | Error: "references unknown rule 'a11y.visible-focuss'" — exit code 2 |
| Step 3 | Error about rule ID format (too long or invalid characters) — exit code 2 |
| **Expected exit code** | All steps: 2 |
| **Files expected to change** | Config files written to `/tmp/dc-unkrule/` |
| **Cleanup procedure** | `rm -rf /tmp/dc-unkrule` |
| **Failure evidence to capture** | Exact error message; if the CLI silently accepts an unknown rule ID and proceeds, that is a FAILURE. Capture config file content. |

---

### QA-RUNTIME-EXPIRED-01 — Expired suppressions

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-EXPIRED-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Expired yesterday | `mkdir -p /tmp/dc-expired && printf '{"version": 1, "profile": "marketing", "suppressions": [{"rule": "a11y.visible-focus", "files": ["**/*.html"], "reason": "This suppression is intentionally expired for testing.", "expires": "2020-01-01"}]}' > /tmp/dc-expired/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-expired/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 2. Invalid date format | `printf '{"version": 1, "profile": "marketing", "suppressions": [{"rule": "a11y.visible-focus", "files": ["**/*.html"], "reason": "Invalid date format test.", "expires": "01-01-2099"}]}' > /tmp/dc-expired/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-expired/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| 3. Expired today same date boundary | `printf '{"version": 1, "profile": "marketing", "suppressions": [{"rule": "a11y.visible-focus", "files": ["**/*.html"], "reason": "Expired on the current day boundary test.", "expires": "1970-01-01"}]}' > /tmp/dc-expired/design-canon.config.json && node ~/projects/design-canon/bin/design-canon.js lint . --config /tmp/dc-expired/design-canon.config.json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | Error: "expired on 2020-01-01" — exit code 2 |
| Step 2 | Error: "must use YYYY-MM-DD" — exit code 2 |
| Step 3 | Error: "expired on 1970-01-01" — exit code 2 |
| **Expected exit code** | All steps: 2 |
| **Files expected to change** | Config files written to `/tmp/dc-expired/` |
| **Cleanup procedure** | `rm -rf /tmp/dc-expired` |
| **Failure evidence to capture** | Exact error message; verify that date boundary logic uses `<=` (expired on or before today fails). If the linter silently accepts an expired suppression, that is a FAILURE. |

---

### QA-RUNTIME-OVERSIZE-01 — Oversized source files (over 1MB)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-OVERSIZE-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Create 2MB file | `mkdir -p /tmp/dc-oversize && dd if=/dev/zero bs=1024 count=2048 2>/dev/null | tr '\0' ' ' > /tmp/dc-oversize/large.html && ls -la /tmp/dc-oversize/large.html` |
| 2. Create small valid file | `echo '<style>button { outline: none; }</style>' > /tmp/dc-oversize/small.html` |
| 3. Lint mixed directory | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-oversize --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| 4. Lint only the large file | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-oversize/large.html --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | File created; size ≥ 2MB (exceeds 1MB `MAX_SOURCE_FILE_BYTES`) |
| Step 3 | JSON report with `"skipped"` entry for `large.html` with reason `"File exceeds 1048576 byte scan limit"`; `"filesScanned"` = 1 (small.html only). Exit code 0 if small.html has no violations, or 1 if it does. |
| Step 4 | JSON report with `"skipped"` entry; `"filesScanned"` = 0 |

| **Expected exit code** | Steps 1: 0; Step 3: 0 (no violation in small.html if outline:none is CSS in HTML — check: pattern uses `outline-none` class or `outline: none` CSS — should match, so exit 1); Step 4: 0 |
| **Files expected to change** | Step 1: creates large test file |
| **Cleanup procedure** | `rm -rf /tmp/dc-oversize` |
| **Failure evidence to capture** | `ls -la /tmp/dc-oversize/large.html` (size); full JSON report; verify the `skipped` array contains the expected entry. If the linter attempts to read the full file and runs out of memory, that is a FAILURE. |

---

### QA-RUNTIME-SYMLINK-01 — Symlinks in project tree

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-SYMLINK-01` |
| **Environment** | Ubuntu 22.04 (or Windows with developer mode), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Create directory with symlink | `mkdir -p /tmp/dc-symlink/src && echo '<style>button { outline: none; transition: all 300ms; }</style><button>Go</button>' > /tmp/dc-symlink/src/actual.html && ln -s /tmp/dc-symlink/src/actual.html /tmp/dc-symlink/src/linked.html && ln -s /etc/passwd /tmp/dc-symlink/src/outside.html` |
| 2. Create symlink to directory | `mkdir -p /tmp/dc-symlink/other-src && echo '<h1>Unlock the power of next generation innovation</h1>' > /tmp/dc-symlink/other-src/hero.html && ln -s /tmp/dc-symlink/other-src /tmp/dc-symlink/src/aliased` |
| 3. Lint | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-symlink/src --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Steps 1-2 | Files and symlinks created |
| Step 3 | The linter `collectSourceFiles` skips symbolic links (`if (entry.isSymbolicLink()) continue`). Only `actual.html` is scanned. `linked.html`, `outside.html`, and the `aliased` directory symlink are skipped. |
| **Expected exit code** | 1 (violations found in actual.html) |
| **Files expected to change** | None (only fixture) |
| **Cleanup procedure** | `rm -rf /tmp/dc-symlink` |
| **Failure evidence to capture** | `ls -la /tmp/dc-symlink/src/` (show symlink targets); JSON report; verify `filesScanned` is 1. If symlinks are followed and the linter traverses into `/etc/passwd` or reads `outside.html`, that is a FAILURE. |

---

### QA-RUNTIME-SIGINT-01 — Interrupted commands (SIGINT/Ctrl+C mid-lint)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-SIGINT-01` |
| **Environment** | Linux (Ubuntu 22.04), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon`; need a large enough source tree that the linter takes > 1 second |
| **Exact commands** | |
| 1. Create large source tree | `mkdir -p /tmp/dc-sigint/src && for i in $(seq 1 1000); do echo "<div style=\"outline: none; background: linear-gradient(135deg, #7c3aed, #6366f1); transition: all 300ms;\">Card $i</div>" > "/tmp/dc-sigint/src/page$i.html"; done` |
| 2. Start lint in background, capture PID, send SIGINT after 500ms | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-sigint --profile marketing --format json > /tmp/dc-sigint-report.json 2>/tmp/dc-sigint-stderr.log & PID=$!; sleep 0.5; kill -INT $PID; wait $PID; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | 1000 small HTML files created |
| Step 2 | The process receives SIGINT. Design Canon does NOT install a custom SIGINT handler, so default Node.js behavior applies: it stops processing and exits with code 0 (SIGINT generates a clean exit, not an error). Output file may be partial or empty. The process must NOT crash with stack trace. |
| **Expected exit code** | Likely 0 (Node.js terminates normally on SIGINT with default handler). Must NOT be non-zero crash code (signal exit code 128+signal). |
| **Files expected to change** | `/tmp/dc-sigint-report.json` (may be partial), `/tmp/dc-sigint-stderr.log` |
| **Cleanup procedure** | `rm -rf /tmp/dc-sigint /tmp/dc-sigint-report.json /tmp/dc-sigint-stderr.log` |
| **Failure evidence to capture** | Whether `wait` returned a signal-exit code (like 130=128+2); stderr content (must not contain "Uncaught Exception" or stack trace); check if partial JSON output was produced (valid JSON at truncation point is not required, but no crash is required). |

---

### QA-RUNTIME-EMPTY-01 — Empty projects (no source files)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-EMPTY-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Lint empty directory | `mkdir -p /tmp/dc-empty && node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-empty --profile marketing 2>&1; echo "EXIT: $?"` |
| 2. Lint directory with only ignored dirs | `mkdir -p /tmp/dc-empty/node_modules /tmp/dc-empty/.git /tmp/dc-empty/dist && node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-empty --profile marketing 2>&1; echo "EXIT: $?"` |
| 3. Lint directory with ignored extensions | `mkdir -p /tmp/dc-empty/docs && echo "some text" > /tmp/dc-empty/docs/notes.pdf && echo "some text" > /tmp/dc-empty/docs/report.docx && node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-empty --profile marketing 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Step 1 | "no unsuppressed detectable violations in 0 file(s).", exit code 0 |
| Step 2 | Same as step 1 (ignored dirs not scanned) |
| Step 3 | Same as step 1 (unsupported extensions not scanned) |
| **Expected exit code** | All steps: 0 |
| **Files expected to change** | None |
| **Cleanup procedure** | `rm -rf /tmp/dc-empty` |
| **Failure evidence to capture** | Full stdout/stderr; verify exit code 0 and no error output. If the linter crashes on empty file list, that is a FAILURE. |

---

### QA-RUNTIME-UNSUPP-01 — Unsupported file types (.pdf, .docx, .pyc, etc.)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-UNSUPP-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Create directory with various file types | `mkdir -p /tmp/dc-unsupported && touch /tmp/dc-unsupported/doc.pdf /tmp/dc-unsupported/doc.docx /tmp/dc-unsupported/script.pyc /tmp/dc-unsupported/image.png /tmp/dc-unsupported/archive.zip /tmp/dc-unsupported/binary.bin /tmp/dc-unsupported/style.scss /tmp/dc-unsupported/style.less /tmp/dc-unsupported/data.json /tmp/dc-unsupported/data.yaml /tmp/dc-unsupported/data.xml /tmp/dc-unsupported/data.csv /tmp/dc-unsupported/markdown.md /tmp/dc-unsupported/shell.sh` |
| 2. Also include one supported file with violations | `echo '<style>button { outline: none; }</style>' > /tmp/dc-unsupported/index.html` |
| 3. Lint directory | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-unsupported --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Steps 1-2 | Fixture created |
| Step 3 | Only `index.html` is scanned (SOURE_EXTENSIONS includes only `.css .html .js .jsx .mjs .cjs .ts .tsx .vue .svelte`). All other files are silently ignored. Violations from `index.html` reported. |
| **Expected exit code** | 1 |
| **Files expected to change** | None |
| **Cleanup procedure** | `rm -rf /tmp/dc-unsupported` |
| **Failure evidence to capture** | JSON report; verify `filesDiscovered` = 1; confirm no errors about unsupported file types. If the linter tries to read `.pdf`, `.docx`, `.pyc`, etc. and crashes, that is a FAILURE. |

---

### QA-RUNTIME-MONOREPO-01 — Monorepos (sources in nested packages)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-MONOREPO-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Create monorepo structure | `mkdir -p /tmp/dc-monorepo/packages/{app,admin,shared}/src && mkdir -p /tmp/dc-monorepo/packages/{app,admin}/node_modules` |
| 2. Add source files to each package | `echo '<h1>Unlock the power of next generation innovation</h1>' > /tmp/dc-monorepo/packages/app/src/index.html && echo '<style>button { outline: none; transition: all 300ms; }</style>' > /tmp/dc-monorepo/packages/admin/src/button.css && echo 'export const x = 1;' > /tmp/dc-monorepo/packages/shared/src/utils.ts` |
| 3. Add violations under nested node_modules (should be ignored) | `echo '<style>body { background: linear-gradient(135deg, #7c3aed, #6366f1); }</style>' > /tmp/dc-monorepo/packages/app/node_modules/hidden.html` |
| 4. Lint from root | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-monorepo --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| 5. Lint specific package | `node ~/projects/design-canon/bin/design-canon.js lint /tmp/dc-monorepo/packages/app --profile marketing --format json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Steps 1-3 | Monorepo structure created |
| Step 4 | `hidden.html` under `node_modules` is ignored. Files in `packages/app/src/`, `packages/admin/src/`, and `packages/shared/src/` are scanned. Violations from `index.html` and `button.css` reported. |
| Step 5 | Only `packages/app/src/index.html` scanned |
| **Expected exit code** | Steps 4 and 5: 1 (violations found) |
| **Files expected to change** | None |
| **Cleanup procedure** | `rm -rf /tmp/dc-monorepo` |
| **Failure evidence to capture** | JSON report; verify `filesDiscovered` count; verify no files under nested `node_modules` appear; confirm no "path too long" errors on deeply nested paths (Windows-specific concern) |

---

### QA-RUNTIME-NESTED-01 — Nested project directories (config in subdirectory)

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-NESTED-01` |
| **Environment** | Ubuntu 22.04 (or Windows), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon` |
| **Exact commands** | |
| 1. Create nested structure | `mkdir -p /tmp/dc-nested/subdir/deep && echo '<style>button { outline: none; }</style>' > /tmp/dc-nested/subdir/index.html` |
| 2. Create config in subdirectory | `printf '{"version": 1, "profile": "marketing", "suppressions": [{"rule": "a11y.visible-focus", "files": ["**/*.html"], "reason": "Config lives in subdir with relative glob test."}]}' > /tmp/dc-nested/subdir/design-canon.config.json` |
| 3. Run lint from config directory | `cd /tmp/dc-nested/subdir && node ~/projects/design-canon/bin/design-canon.js lint . --config design-canon.config.json --format json 2>&1; echo "EXIT: $?"` |
| 4. Run lint with explicit --config from parent | `cd /tmp/dc-nested && node ~/projects/design-canon/bin/design-canon.js lint . --config subdir/design-canon.config.json --format json 2>&1; echo "EXIT: $?"` |
| 5. Run lint without --config (auto-discover) | `cd /tmp/dc-nested/subdir && node ~/projects/design-canon/bin/design-canon.js lint . --format json 2>&1; echo "EXIT: $?"` |
| **Expected result** | |
| Steps 1-2 | Fixtures created |
| Step 3 | Suppression matches; `errors: 0`; one suppressed finding |
| Step 4 | Same as step 3 (config loaded from relative path) |
| Step 5 | Config auto-discovered from cwd; suppression applies; `errors: 0` |
| **Expected exit code** | Steps 3-5: 0 |
| **Files expected to change** | None |
| **Cleanup procedure** | `rm -rf /tmp/dc-nested` |
| **Failure evidence to capture** | JSON reports for all steps; verify `config` field shows the correct config path; verify `suppressions.used` ≥ 1. If auto-discover in step 5 fails to find `design-canon.config.json` in cwd, that is a FAILURE. |

---

### QA-RUNTIME-REINSTALL-01 — Uninstall and reinstall behavior

| Field | Value |
|---|---|
| **Test ID** | `QA-RUNTIME-REINSTALL-01` |
| **Environment** | Ubuntu 22.04 (or Windows Git Bash), Node.js 22.x, bash |
| **Prerequisites** | Repository at `~/projects/design-canon`; clean temp project |
| **Exact commands** | |
| 1. Create project and install | `mkdir -p /tmp/dc-reinstall && cd /tmp/dc-reinstall && npm init -y && npm install /c/Users/asimo/projects/design-canon` |
| 2. Verify install | `cd /tmp/dc-reinstall && node ./node_modules/.bin/design-canon --version` |
| 3. Uninstall | `cd /tmp/dc-reinstall && npm uninstall design-canon` |
| 4. Verify uninstall | `cd /tmp/dc-reinstall && ls node_modules/.bin/design-canon 2>&1; echo "EXIT: $?" && node -e "try{require('design-canon')}catch(e){console.log('OK: uninstalled')}"` |
| 5. Reinstall | `cd /tmp/dc-reinstall && npm install /c/Users/asimo/projects/design-canon` |
| 6. Verify reinstall | `cd /tmp/dc-reinstall && node ./node_modules/.bin/design-canon --version && node ./node_modules/.bin/design-canon profiles` |
| 7. Second uninstall | `cd /tmp/dc-reinstall && npm uninstall design-canon` |
| **Expected result** | |
| Steps 1-2 | Install succeeds; version printed |
| Step 3 | Uninstall succeeds; no errors |
| Step 4 | Binary not found; require fails with MODULE_NOT_FOUND |
| Step 5-6 | Reinstall succeeds; version and profiles work |
| Step 7 | Clean uninstall |
| **Expected exit code** | All steps: 0 (step 4: `ls` returns non-zero but `node -e` returns 0) |
| **Files expected to change** | Step 1: `node_modules/`, `package.json`, `package-lock.json`; Steps 3,7: remove `node_modules/design-canon` |
| **Cleanup procedure** | `rm -rf /tmp/dc-reinstall` |
| **Failure evidence to capture** | `npm ls` at each stage; `ls -la node_modules/`; npm uninstall output (stderr). If orphaned lockfile entries, stale symlinks, or partial node_modules remain, that is a FAILURE. |

---

## Test Fixture Setup

The following fixtures are referenced by multiple test cases. Create them once and reuse.

### Fixture: sloppy example (in-repo)

Already at `examples/sloppy/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <style>
    body { font-family: Inter, sans-serif; background: linear-gradient(135deg, #7c3aed, #6366f1); }
    button { outline: none; border-radius: 9999px; transition: all 300ms; }
  </style>
</head>
<body class="text-center mx-auto justify-center">
  <h1>Unlock the power of next generation innovation</h1>
  <button>Get Started</button>
</body>
</html>
```

Triggers detectors: `typography.generic-primary-font`, `color.purple-gradient-default`, `layout.centered-everything`, `motion.transition-all`, `a11y.visible-focus`, `copy.generic-hero`, `radius.everything-pill`.

### Fixture: example config

Already at `examples/config/design-canon.config.json`:
```json
{
  "$schema": "../../schema/config.schema.json",
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

### Fixture: inline violation (for temp-dir tests)

```html
<style>button { outline: none; transition: all 300ms; }</style>
<button>Continue</button>
```

Triggers: `a11y.visible-focus` (error), `motion.transition-all` (warning).

---

## Failure Evidence Capture Protocol

When any test case fails, follow this protocol to ensure actionable diagnostic data:

1. **Exit code** — Record the exact exit code (0, 1, 2, or signal > 128).
2. **Stdout** — Redirect to a timestamped file: `design-canon-<TEST_ID>-stdout.log`.
3. **Stderr** — Redirect to a timestamped file: `design-canon-<TEST_ID>-stderr.log`.
4. **Environment** — Capture `node --version`, `npm --version`, OS version, shell name.
5. **Screenshot** — For interactive/manual tests, capture the terminal window showing the failing command and its output.
6. **Triage** — Classify the failure:
   - **Installation failure** (npm pack, npm install, npm link errors, lockfile mismatch)
   - **CLI crash** (uncaught exception, stack trace, segfault)
   - **Wrong exit code** (expected 0 got 1, expected 2 got 0, etc.)
   - **Wrong output** (missing or incorrect stdout/stderr text)
   - **Side effect** (files created where none expected, files not cleaned up)
   - **Platform-specific** (path separator, case sensitivity, line endings, permissions)
7. **Reproduce command** — Record the exact command string so the failure can be reproduced deterministically.
8. **Report** — Append findings to `qa/failures/<TEST_ID>-<TIMESTAMP>.md`.

---

## Test Case Index

| # | ID | Category | Short Name |
|---|---|---|---|
| 1 | `QA-ENV-WINCMD-01` | Platform | Windows native (CMD) |
| 2 | `QA-ENV-WINPS-01` | Platform | Windows native (PowerShell) |
| 3 | `QA-ENV-WSL-01` | Platform | WSL (Ubuntu on Windows) |
| 4 | `QA-ENV-UBU-01` | Platform | Ubuntu (Linux native) |
| 5 | `QA-ENV-MAC-01` | Platform | macOS (when available) |
| 6 | `QA-NODE-20-01` | Node.js | Node.js 20 |
| 7 | `QA-NODE-22-01` | Node.js | Node.js 22 |
| 8 | `QA-NODE-24-01` | Node.js | Node.js 24 |
| 9 | `QA-INSTALL-TAR-01` | Installation | npm tarball (npm pack + npm install) |
| 10 | `QA-INSTALL-GIT-01` | Installation | GitHub clone + npm link |
| 11 | `QA-INSTALL-SPACE-01` | Installation | Paths containing spaces |
| 12 | `QA-RUNTIME-RDONLY-01` | Runtime | Read-only directories |
| 13 | `QA-RUNTIME-MALJSON-01` | Runtime | Malformed JSON in source files |
| 14 | `QA-RUNTIME-MALCFG-01` | Runtime | Malformed configuration JSON |
| 15 | `QA-RUNTIME-INVPROF-01` | Runtime | Invalid profile names |
| 16 | `QA-RUNTIME-UNKRULE-01` | Runtime | Unknown rule IDs in suppressions |
| 17 | `QA-RUNTIME-EXPIRED-01` | Runtime | Expired suppressions |
| 18 | `QA-RUNTIME-OVERSIZE-01` | Runtime | Oversized source files (>1MB) |
| 19 | `QA-RUNTIME-SYMLINK-01` | Runtime | Symlinks in project tree |
| 20 | `QA-RUNTIME-SIGINT-01` | Runtime | Interrupted commands (SIGINT/Ctrl+C) |
| 21 | `QA-RUNTIME-EMPTY-01` | Runtime | Empty projects (no source files) |
| 22 | `QA-RUNTIME-UNSUPP-01` | Runtime | Unsupported file types |
| 23 | `QA-RUNTIME-MONOREPO-01` | Runtime | Monorepos (nested packages) |
| 24 | `QA-RUNTIME-NESTED-01` | Runtime | Nested project directories |
| 25 | `QA-RUNTIME-REINSTALL-01` | Runtime | Uninstall and reinstall behavior |

---

*End of verification matrix. All content labeled as **proposal / generated fixture** per task instructions.*
