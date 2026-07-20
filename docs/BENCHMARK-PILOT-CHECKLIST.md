# Benchmark Pilot and Release Checklist

This checklist separates completed tooling from evidence that still requires model execution or independent humans.

## Tooling complete

- [x] Four-condition clean-room protocol
- [x] Immutable protocol-v1 catalog snapshot
- [x] Pinned generic-guidance baseline
- [x] Frozen profile selectors
- [x] Deterministic monolith and compiled guidance artifacts
- [x] 180-run randomized plan generator
- [x] Immutable run initialization
- [x] Desktop and mobile local Chromium capture
- [x] Viewport and full-page screenshots
- [x] Horizontal-overflow and console-error evidence
- [x] Design Canon browser lint attachment
- [x] Calibration DOM accessibility evidence
- [x] Artifact hashing and manifest finalization
- [x] Blind assignment and confidential-key generation
- [x] Vote analysis and objective reporting
- [x] Safe adapters for AGENTS.md, Claude Code, Cursor, Windsurf, Codex, and Hermes
- [x] Three public demonstration briefs selected before output inspection

## B000 calibration preflight

- [x] Freeze a claim-ineligible B000 shakedown brief
- [x] Freeze candidate GPT-5.6 Sol Standard and Codex settings
- [x] Freeze candidate budgets and deterministic A, B, D, C order
- [x] Define the fail-closed runner and evidence contract
- [x] Lock Phase-1 boundaries with repository tests
- [ ] Implement the provider-neutral execution state layer
- [ ] Implement and test the Codex CLI adapter without paid calls
- [ ] Prove workspace, instruction, state, and network isolation
- [ ] Execute B000 A, B, D, and C once with no automatic retries
- [ ] Capture and validate every B000 artifact
- [ ] Audit measured usage, runtime, actions, failures, and cost
- [ ] Propose official B001 budgets and runtime settings
- [ ] Issue a go, revise, or stop decision before protocol admission

## Decisions required before an official pilot

- [ ] Pin one exact model and model version
- [ ] Pin one agent framework and version
- [ ] Pin tokenizer identity and record B/C/D token counts
- [ ] Pin context-window size and prove all four conditions fit without truncation
- [ ] Pin time, action, and iteration budgets
- [ ] Pin provider-supported sampling controls
- [ ] Choose and pin the official accessibility scanner
- [ ] Decide whether the built-in calibration audit remains supplementary only
- [ ] Pin the execution environment and container or machine image
- [ ] Commit protocol admission fields before inspecting official results

## Pilot execution

- [ ] Prepare guidance for the B001 marketing profile
- [ ] Generate the complete run plan
- [ ] Initialize B001 A/B/C/D repetitions 1 through 3
- [ ] Execute runs in the preregistered order
- [ ] Preserve complete, partial, failed, and invalid runs
- [ ] Capture all required render artifacts
- [ ] Validate every artifact hash and manifest
- [ ] Generate blind assignments
- [ ] Recruit independent evaluators who did not conduct the runs
- [ ] Analyze objective and preference outcomes separately
- [ ] Amend the protocol only under a new version

## Full-study gate

Do not claim that compiled Design Canon outperforms monolithic guidance until:

1. all 180 planned runs are accounted for;
2. failures and exclusions are disclosed;
3. instruction efficiency and accessibility outcomes are reported;
4. blind preferences include uncertainty estimates;
5. raw anonymized artifacts and analysis code are published;
6. the claim is limited to the tested clean-room monolithic architecture, not an untested private corpus.

## Package release gate

- [ ] Merge all required implementation PRs with green CI
- [ ] Run clean tarball installation on Windows, macOS, Linux, and WSL
- [ ] Confirm `design-canon init` and `uninstall` are idempotent on every adapter
- [ ] Confirm npm package allowlist excludes benchmark outputs and private blind keys
- [ ] Update changelog and package version
- [ ] Create provenance-backed npm prerelease
- [ ] Verify installation from the published tarball
- [ ] Publish the three demonstrations only after their complete artifacts exist
